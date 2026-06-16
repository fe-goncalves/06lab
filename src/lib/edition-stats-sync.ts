/**
 * Sincronização rápida das estatísticas de uma edição após alterações em partidas.
 * Preserva ajustes manuais de pontos em `standings_overrides` (bônus/penalidades na classificação).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const FINISHED = "finished";

type StandingsOverrideRow = {
  phase_id: string;
  edition_team_id: string;
  points_adjustment: number;
};

async function getPhaseIdsForEdition(
  supabase: SupabaseClient,
  editionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("phases")
    .select("id")
    .eq("edition_id", editionId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => p.id);
}

async function getDefaultPhaseIdForEdition(
  supabase: SupabaseClient,
  editionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("phases")
    .select("id, is_current, display_order")
    .eq("edition_id", editionId)
    .order("display_order", { ascending: false });

  if (error) throw new Error(error.message);
  const phases = data ?? [];
  return phases.find((p) => p.is_current)?.id ?? phases[0]?.id ?? null;
}

async function countStandingsOverridesForEdition(
  supabase: SupabaseClient,
  editionId: string,
): Promise<number> {
  const phaseIds = await getPhaseIdsForEdition(supabase, editionId);
  if (phaseIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("standings_overrides")
    .select("id", { count: "exact", head: true })
    .in("phase_id", phaseIds);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function loadEditionTeamMaps(
  supabase: SupabaseClient,
  editionId: string,
): Promise<{ teamIdByEditionTeamId: Map<string, string>; editionTeamIdByTeamId: Map<string, string> }> {
  const { data } = await supabase
    .from("edition_teams")
    .select("id, team_id")
    .eq("edition_id", editionId);

  const teamIdByEditionTeamId = new Map<string, string>();
  const editionTeamIdByTeamId = new Map<string, string>();
  for (const et of data ?? []) {
    teamIdByEditionTeamId.set(et.id, et.team_id);
    editionTeamIdByTeamId.set(et.team_id, et.id);
  }
  return { teamIdByEditionTeamId, editionTeamIdByTeamId };
}

export type EditionStatsSyncOptions = {
  /** Recalcula também carreira dos times informados (ex.: ao publicar resultado). */
  includeCareerStats?: boolean;
  teamIds?: string[];
};

export async function getEditionIdForMatch(
  supabase: SupabaseClient,
  matchId: string,
): Promise<string | null> {
  const { data: match } = await supabase
    .from("matches")
    .select("phase_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match?.phase_id) return null;

  const { data: phase } = await supabase
    .from("phases")
    .select("edition_id")
    .eq("id", match.phase_id)
    .maybeSingle();

  return phase?.edition_id ?? null;
}

async function loadStandingsOverrides(
  supabase: SupabaseClient,
  editionId: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const phaseIds = await getPhaseIdsForEdition(supabase, editionId);
  if (phaseIds.length === 0) return map;

  const [{ data, error }, { teamIdByEditionTeamId }] = await Promise.all([
    supabase
      .from("standings_overrides")
      .select("phase_id, edition_team_id, points_adjustment")
      .in("phase_id", phaseIds),
    loadEditionTeamMaps(supabase, editionId),
  ]);

  if (error) throw new Error(error.message);

  const adjByPhaseTeam = new Map<string, number>();
  for (const row of (data ?? []) as StandingsOverrideRow[]) {
    const key = `${row.phase_id}:${row.edition_team_id}`;
    adjByPhaseTeam.set(key, row.points_adjustment ?? 0);
  }

  for (const [key, adj] of adjByPhaseTeam) {
    if (adj === 0) continue;
    const editionTeamId = key.split(":")[1];
    const teamId = teamIdByEditionTeamId.get(editionTeamId);
    if (!teamId) continue;
    map.set(teamId, (map.get(teamId) ?? 0) + adj);
  }
  return map;
}

/** Grava ou atualiza override sem depender de UNIQUE no banco (insert/update por id). */
async function saveStandingsOverride(
  supabase: SupabaseClient,
  phaseId: string,
  editionTeamId: string,
  pointsAdjustment: number,
): Promise<{ error?: string }> {
  const { data: rows, error: loadError } = await supabase
    .from("standings_overrides")
    .select("id")
    .eq("phase_id", phaseId)
    .eq("edition_team_id", editionTeamId);

  if (loadError) return { error: loadError.message };

  const existing = rows ?? [];

  if (existing.length === 0) {
    const { error } = await supabase.from("standings_overrides").insert({
      phase_id: phaseId,
      edition_team_id: editionTeamId,
      points_adjustment: pointsAdjustment,
    });
    return error ? { error: error.message } : {};
  }

  const [keep, ...dupes] = existing;
  const { error: updateError } = await supabase
    .from("standings_overrides")
    .update({ points_adjustment: pointsAdjustment })
    .eq("id", keep.id);

  if (updateError) return { error: updateError.message };

  if (dupes.length > 0) {
    const { error: deleteError } = await supabase
      .from("standings_overrides")
      .delete()
      .in("id", dupes.map((d) => d.id));
    if (deleteError) return { error: deleteError.message };
  }

  return {};
}

async function captureLegacyPointAdjustments(
  supabase: SupabaseClient,
  editionId: string,
  pointsBeforeRecalc: Map<string, number>,
): Promise<void> {
  const overrideCount = await countStandingsOverridesForEdition(supabase, editionId);
  if (overrideCount > 0) return;

  const { data: afterRows, error: afterError } = await supabase
    .from("team_edition_stats")
    .select("team_id, points")
    .eq("edition_id", editionId);

  if (afterError) throw new Error(afterError.message);

  const defaultPhaseId = await getDefaultPhaseIdForEdition(supabase, editionId);
  if (!defaultPhaseId) return;

  const { editionTeamIdByTeamId } = await loadEditionTeamMaps(supabase, editionId);

  for (const row of afterRows ?? []) {
    const editionTeamId = editionTeamIdByTeamId.get(row.team_id);
    if (!editionTeamId) continue;
    const before = pointsBeforeRecalc.get(row.team_id) ?? 0;
    const after = row.points ?? 0;
    const delta = before - after;
    if (delta !== 0) {
      const saveResult = await saveStandingsOverride(
        supabase,
        defaultPhaseId,
        editionTeamId,
        delta,
      );
      if (saveResult.error) throw new Error(saveResult.error);
    }
  }
}

async function applyStandingsOverrides(
  supabase: SupabaseClient,
  editionId: string,
  overrides: Map<string, number>,
): Promise<string | null> {
  if (overrides.size === 0) return null;

  const { data: stats, error: statsError } = await supabase
    .from("team_edition_stats")
    .select("id, team_id, points")
    .eq("edition_id", editionId);

  if (statsError) return statsError.message;

  const updates = (stats ?? [])
    .filter((s) => overrides.has(s.team_id))
    .map((s) => ({
      id: s.id,
      points: (s.points ?? 0) + (overrides.get(s.team_id) ?? 0),
    }));

  if (updates.length === 0) return null;

  for (const update of updates) {
    const { error } = await supabase
      .from("team_edition_stats")
      .update({ points: update.points })
      .eq("id", update.id);

    if (error) return error.message;
  }

  return null;
}

/** Reaplica ajustes manuais de pontos após recálculo de `team_edition_stats`. */
export async function reapplyStandingsOverridesForEdition(
  supabase: SupabaseClient,
  editionId: string,
): Promise<{ error?: string }> {
  try {
    const overrides = await loadStandingsOverrides(supabase, editionId);
    const applyError = await applyStandingsOverrides(supabase, editionId, overrides);
    if (applyError) return { error: applyError };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao reaplicar ajustes de classificação." };
  }
}

/** Recalcula só a classificação (times) e reaplica overrides — sem artilharia. */
export async function syncTeamEditionStandings(
  supabase: SupabaseClient,
  editionId: string,
): Promise<{ error?: string }> {
  const { error: teamError } = await supabase.rpc("recalculate_team_edition_stats", {
    p_edition_id: editionId,
  });
  if (teamError) return { error: teamError.message };
  return reapplyStandingsOverridesForEdition(supabase, editionId);
}

/** Recalcula artilharia + classificação da edição e reaplica ajustes manuais de pontos. */
export async function syncEditionStats(
  supabase: SupabaseClient,
  editionId: string,
  options?: EditionStatsSyncOptions,
): Promise<{ error?: string }> {
  try {
    let legacyBefore: Map<string, number> | null = null;

    const overrideCount = await countStandingsOverridesForEdition(supabase, editionId);
    if (overrideCount === 0) {
      const { data: beforeRows, error: beforeError } = await supabase
        .from("team_edition_stats")
        .select("team_id, points")
        .eq("edition_id", editionId);

      if (beforeError) throw new Error(beforeError.message);
      legacyBefore = new Map(
        (beforeRows ?? []).map((r) => [r.team_id, r.points ?? 0]),
      );
    }

    const [athleteResult, teamResult] = await Promise.all([
      supabase.rpc("recalculate_athlete_edition_stats", { p_edition_id: editionId }),
      supabase.rpc("recalculate_team_edition_stats", { p_edition_id: editionId }),
    ]);

    if (athleteResult.error) return { error: athleteResult.error.message };
    if (teamResult.error) return { error: teamResult.error.message };

    if (legacyBefore) {
      await captureLegacyPointAdjustments(supabase, editionId, legacyBefore);
    }

    const overrides = await loadStandingsOverrides(supabase, editionId);
    const applyError = await applyStandingsOverrides(supabase, editionId, overrides);
    if (applyError) return { error: applyError };

    if (options?.includeCareerStats && options.teamIds?.length) {
      const uniqueTeamIds = [...new Set(options.teamIds.filter(Boolean))];
      await Promise.all(
        uniqueTeamIds.map((teamId) =>
          supabase.rpc("recalculate_team_career_stats", { p_team_id: teamId }),
        ),
      );
    }

    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao sincronizar estatísticas da edição." };
  }
}

export type MatchStatsSyncTrigger = {
  previousStatus?: string | null;
  newStatus?: string | null;
  scoresChanged?: boolean;
  /** Força recálculo mesmo sem mudança de status (ex.: ações em partida finalizada). */
  force?: boolean;
};

/** Dispara recálculo da edição quando o status da partida muda ou placar de partida finalizada é alterado. */
export async function syncEditionStatsForMatch(
  supabase: SupabaseClient,
  matchId: string,
  trigger: MatchStatsSyncTrigger,
  options?: EditionStatsSyncOptions,
): Promise<{ error?: string }> {
  const prev = trigger.previousStatus ?? null;
  const next = trigger.newStatus ?? null;
  const statusChanged = prev !== next;
  const shouldSync =
    trigger.force === true ||
    statusChanged ||
    (trigger.scoresChanged === true && (next === FINISHED || prev === FINISHED));

  if (!shouldSync) return {};

  const editionId = await getEditionIdForMatch(supabase, matchId);
  if (!editionId) return {};

  return syncEditionStats(supabase, editionId, options);
}

/** Acumula ajuste manual de pontos (+/-) na tabela de overrides da fase. */
export async function addStandingsPointAdjustments(
  supabase: SupabaseClient,
  phaseId: string,
  adjustments: { editionTeamId: string; delta: number }[],
): Promise<{ error?: string }> {
  const meaningful = adjustments.filter((a) => a.delta !== 0);
  if (meaningful.length === 0) return {};

  const { data: existing, error: loadError } = await supabase
    .from("standings_overrides")
    .select("edition_team_id, points_adjustment")
    .eq("phase_id", phaseId)
    .in("edition_team_id", meaningful.map((a) => a.editionTeamId));

  if (loadError) return { error: loadError.message };

  const current = new Map(
    (existing ?? []).map((r) => [r.edition_team_id, r.points_adjustment ?? 0]),
  );

  for (const a of meaningful) {
    const pointsAdjustment = (current.get(a.editionTeamId) ?? 0) + a.delta;
    const saveResult = await saveStandingsOverride(
      supabase,
      phaseId,
      a.editionTeamId,
      pointsAdjustment,
    );
    if (saveResult.error) return saveResult;
  }

  return {};
}
