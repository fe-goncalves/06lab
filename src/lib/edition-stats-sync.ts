/**
 * Sincronização rápida das estatísticas de uma edição após alterações em partidas.
 * Preserva ajustes manuais de pontos em `standings_overrides` (bônus/penalidades na classificação).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const FINISHED = "finished";

type StandingsOverrideRow = {
  team_id: string;
  points_adjustment: number;
};

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
  const { data, error } = await supabase
    .from("standings_overrides")
    .select("team_id, points_adjustment")
    .eq("edition_id", editionId);

  if (error) return map;

  for (const row of (data ?? []) as StandingsOverrideRow[]) {
    const adj = row.points_adjustment ?? 0;
    if (adj !== 0) map.set(row.team_id, adj);
  }
  return map;
}

async function captureLegacyPointAdjustments(
  supabase: SupabaseClient,
  editionId: string,
  pointsBeforeRecalc: Map<string, number>,
): Promise<void> {
  const { count, error: countError } = await supabase
    .from("standings_overrides")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", editionId);

  if (countError || (count ?? 0) > 0) return;

  const { data: afterRows, error: afterError } = await supabase
    .from("team_edition_stats")
    .select("team_id, points")
    .eq("edition_id", editionId);

  if (afterError) return;

  const upserts: { edition_id: string; team_id: string; points_adjustment: number }[] = [];

  for (const row of afterRows ?? []) {
    const before = pointsBeforeRecalc.get(row.team_id) ?? 0;
    const after = row.points ?? 0;
    const delta = before - after;
    if (delta !== 0) {
      upserts.push({
        edition_id: editionId,
        team_id: row.team_id,
        points_adjustment: delta,
      });
    }
  }

  if (upserts.length === 0) return;

  await supabase
    .from("standings_overrides")
    .upsert(upserts, { onConflict: "edition_id,team_id" });
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

  const { error } = await supabase
    .from("team_edition_stats")
    .upsert(updates, { onConflict: "id" });

  return error?.message ?? null;
}

/** Recalcula artilharia + classificação da edição e reaplica ajustes manuais de pontos. */
export async function syncEditionStats(
  supabase: SupabaseClient,
  editionId: string,
  options?: EditionStatsSyncOptions,
): Promise<{ error?: string }> {
  let legacyBefore: Map<string, number> | null = null;

  const { count, error: countError } = await supabase
    .from("standings_overrides")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", editionId);

  if (!countError && (count ?? 0) === 0) {
    const { data: beforeRows } = await supabase
      .from("team_edition_stats")
      .select("team_id, points")
      .eq("edition_id", editionId);
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

/** Acumula ajuste manual de pontos (+/-) na tabela de overrides da edição. */
export async function addStandingsPointAdjustments(
  supabase: SupabaseClient,
  editionId: string,
  adjustments: { teamId: string; delta: number }[],
): Promise<{ error?: string }> {
  const meaningful = adjustments.filter((a) => a.delta !== 0);
  if (meaningful.length === 0) return {};

  const { data: existing, error: loadError } = await supabase
    .from("standings_overrides")
    .select("team_id, points_adjustment")
    .eq("edition_id", editionId)
    .in("team_id", meaningful.map((a) => a.teamId));

  if (loadError) return { error: loadError.message };

  const current = new Map(
    (existing ?? []).map((r) => [r.team_id, r.points_adjustment ?? 0]),
  );

  const upserts = meaningful.map((a) => ({
    edition_id: editionId,
    team_id: a.teamId,
    points_adjustment: (current.get(a.teamId) ?? 0) + a.delta,
  }));

  const { error } = await supabase
    .from("standings_overrides")
    .upsert(upserts, { onConflict: "edition_id,team_id" });

  if (error) return { error: error.message };
  return {};
}
