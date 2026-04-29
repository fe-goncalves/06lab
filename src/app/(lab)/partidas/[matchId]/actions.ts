"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function criarPartida(
  faseId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const round_id = String(formData.get("round_id") ?? "").trim() || null;
  const team_a_id = String(formData.get("team_a_id") ?? "").trim() || null;
  const team_b_id = String(formData.get("team_b_id") ?? "").trim() || null;
  const team_a_is_home = formData.get("team_a_is_home") === "true";
  const match_date = String(formData.get("match_date") ?? "").trim() || null;
  const match_time = String(formData.get("match_time") ?? "").trim() || null;
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;
  const is_second_leg = formData.get("is_second_leg") === "true";

  const { data: phase } = await supabase
    .from("phases").select("phase_type").eq("id", faseId).maybeSingle();

  const isKnockout = phase?.phase_type === "knockout" || phase?.phase_type === "conference";

  let matchup_id: string | null = null;

  if (isKnockout && round_id && team_a_id && team_b_id) {
    // Busca a rodada para obter o label estável
    const { data: round } = await supabase
      .from("rounds").select("name, custom_label, display_order").eq("id", round_id).maybeSingle();

    const roundLabel = round?.name ?? "";

    // Busca matchup existente por phase_id + round_label + par de times
    // Usa round_label (string) em vez de round_id (pode ser null em dados antigos)
    const { data: existingMatchup } = await supabase
      .from("matchups")
      .select("id")
      .eq("phase_id", faseId)
      .eq("round_label", roundLabel)
      .or(
        `and(team_a_id.eq.${team_a_id},team_b_id.eq.${team_b_id}),and(team_a_id.eq.${team_b_id},team_b_id.eq.${team_a_id})`
      )
      .maybeSingle();

    if (existingMatchup) {
      matchup_id = existingMatchup.id;
    } else {
      // Cria novo matchup para este confronto
      const { data: insertedMatchup, error: matchupError } = await supabase
        .from("matchups")
        .insert({
          phase_id: faseId,
          round_id,
          round_label: roundLabel,
          team_a_id,
          team_b_id,
          display_order: round?.display_order ?? 0,
          is_completed: false,
        })
        .select("id").single();

      if (matchupError) return { error: matchupError.message };
      matchup_id = insertedMatchup.id;
    }
  }

  const { data: inserted, error } = await supabase
    .from("matches")
    .insert({
      phase_id: faseId,
      round_id: isKnockout ? null : round_id,
      matchup_id,
      team_a_id,
      team_b_id,
      team_a_is_home,
      match_date,
      match_time,
      venue_id,
      is_second_leg,
      status: "scheduled",
      score_a: 0,
      score_b: 0,
      result_only_mode: false,
    })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarPartida(
  matchId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const status = String(formData.get("status") ?? "scheduled");
  const finish_type = String(formData.get("finish_type") ?? "").trim() || null;
  const score_a = Number(formData.get("score_a") ?? 0);
  const score_b = Number(formData.get("score_b") ?? 0);
  const match_date = String(formData.get("match_date") ?? "").trim() || null;
  const match_time = String(formData.get("match_time") ?? "").trim() || null;
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;
  const motm_athlete_id = String(formData.get("motm_athlete_id") ?? "").trim() || null;
  const highlights_url = String(formData.get("highlights_url") ?? "").trim() || null;
  const photos_url = String(formData.get("photos_url") ?? "").trim() || null;

  const updateData: Record<string, any> = {
    status, finish_type, score_a, score_b,
    motm_athlete_id, highlights_url, photos_url,
  };

  if (match_date) updateData.match_date = match_date;
  if (match_time) updateData.match_time = match_time;
  if (formData.has("venue_id")) updateData.venue_id = venue_id;

  const { error } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function salvarFormacoes(
  matchId: string,
  lineups: { athlete_id: string; is_present: boolean; is_starter: boolean; is_captain: boolean }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: match } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, phase_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Partida não encontrada." };

  const { data: phase } = await supabase
    .from("phases").select("edition_id").eq("id", match.phase_id).maybeSingle();

  if (!phase) return { error: "Fase não encontrada." };

  const { data: editionTeams } = await supabase
    .from("edition_teams")
    .select("id, team_id")
    .eq("edition_id", phase.edition_id)
    .in("team_id", [match.team_a_id, match.team_b_id].filter(Boolean));

  const teamToEditionTeam: Record<string, string> = {};
  (editionTeams ?? []).forEach((et: any) => {
    teamToEditionTeam[et.team_id] = et.id;
  });

  const athleteIds = lineups.map(l => l.athlete_id);
  const { data: rosterEntries } = await supabase
    .from("edition_roster_entries")
    .select("athlete_id, edition_team_id")
    .in("athlete_id", athleteIds)
    .eq("member_type", "athlete");

  const athleteToEditionTeam: Record<string, string> = {};
  (rosterEntries ?? []).forEach((r: any) => {
    if (Object.values(teamToEditionTeam).includes(r.edition_team_id)) {
      athleteToEditionTeam[r.athlete_id] = r.edition_team_id;
    }
  });

  const records = lineups
    .map(l => {
      const editionTeamId = athleteToEditionTeam[l.athlete_id];
      if (!editionTeamId) return null;
      return {
        match_id: matchId,
        athlete_id: l.athlete_id,
        edition_team_id: editionTeamId,
        is_present: l.is_present,
        played_as_goalkeeper: false,
        is_captain: l.is_captain,
      };
    })
    .filter(Boolean);

  await supabase.from("match_lineups").delete().eq("match_id", matchId);
  if (records.length > 0) {
    const { error } = await supabase.from("match_lineups").insert(records);
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function adicionarAcao(
  matchId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const team_id = String(formData.get("team_id") ?? "").trim();
  if (!team_id) return { error: "Equipe é obrigatória." };

  const action_type = String(formData.get("action_type") ?? "").trim();
  if (!action_type) return { error: "Tipo de ação é obrigatório." };

  const period = String(formData.get("period") ?? "").trim();
  if (!period) return { error: "Período é obrigatório." };

  const minute_raw = formData.get("minute");
  const minute = minute_raw !== null && minute_raw !== "" ? Number(minute_raw) : null;

  const primary_athlete_id = String(formData.get("primary_athlete_id") ?? "").trim() || null;
  const secondary_athlete_id = String(formData.get("secondary_athlete_id") ?? "").trim() || null;
  const goalkeeper_id = String(formData.get("goalkeeper_id") ?? "").trim() || null;
  const goal_type = String(formData.get("goal_type") ?? "").trim() || null;
  const is_own_goal = formData.get("is_own_goal") === "true";
  const miss_result = String(formData.get("miss_result") ?? "").trim() || null;

  const { data: inserted, error } = await supabase
    .from("match_actions")
    .insert({
      match_id: matchId,
      team_id,
      action_type,
      period,
      minute,
      primary_athlete_id,
      secondary_athlete_id,
      goalkeeper_id,
      goal_type,
      is_own_goal,
      miss_result,
    })
    .select("id").single();

  if (error) return { error: error.message };

  // Atualiza placar se for gol
  if (action_type === "goal" && !is_own_goal) {
    const { data: match } = await supabase.from("matches").select("team_a_id, score_a, score_b").eq("id", matchId).maybeSingle();
    if (match) {
      const isTeamA = match.team_a_id === team_id;
      await supabase.from("matches").update({
        score_a: isTeamA ? match.score_a + 1 : match.score_a,
        score_b: isTeamA ? match.score_b : match.score_b + 1,
      }).eq("id", matchId);
    }
  } else if (action_type === "goal" && is_own_goal) {
    const { data: match } = await supabase.from("matches").select("team_a_id, score_a, score_b").eq("id", matchId).maybeSingle();
    if (match) {
      const isTeamA = match.team_a_id === team_id;
      await supabase.from("matches").update({
        score_a: isTeamA ? match.score_a : match.score_a + 1,
        score_b: isTeamA ? match.score_b + 1 : match.score_b,
      }).eq("id", matchId);
    }
  }

  return { id: inserted.id };
}

export async function deletarAcao(
  actionId: string,
  matchId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: action } = await supabase
    .from("match_actions").select("*").eq("id", actionId).maybeSingle();

  const { error } = await supabase
    .from("match_actions").delete().eq("id", actionId);

  if (error) return { error: error.message };

  // Reverte placar se era gol
  if (action?.action_type === "goal") {
    const { data: match } = await supabase
      .from("matches").select("team_a_id, score_a, score_b").eq("id", matchId).maybeSingle();
    if (match) {
      const isTeamA = match.team_a_id === action.team_id;
      const isOwnGoal = action.is_own_goal;
      await supabase.from("matches").update({
        score_a: isTeamA
          ? (isOwnGoal ? match.score_a : Math.max(0, match.score_a - 1))
          : (isOwnGoal ? Math.max(0, match.score_a - 1) : match.score_a),
        score_b: isTeamA
          ? (isOwnGoal ? Math.max(0, match.score_b - 1) : match.score_b)
          : (isOwnGoal ? match.score_b : Math.max(0, match.score_b - 1)),
      }).eq("id", matchId);
    }
  }

  // Recalcula stats da edição
  const { data: match } = await supabase
    .from("matches").select("phase_id").eq("id", matchId).maybeSingle();

  if (match?.phase_id) {
    const { data: phase } = await supabase
      .from("phases").select("edition_id").eq("id", match.phase_id).maybeSingle();
    if (phase?.edition_id) {
      await supabase.rpc("recalculate_athlete_edition_stats", { p_edition_id: phase.edition_id });
      await supabase.rpc("recalculate_team_edition_stats", { p_edition_id: phase.edition_id });
    }
  }

  return { success: true };
}

export async function deletarPartida(
  matchId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: actions } = await supabase
    .from("match_actions").select("id").eq("match_id", matchId).limit(1);

  if (actions && actions.length > 0) {
    return { error: "Esta partida possui ações registradas. Remova as ações antes de excluir." };
  }

  await supabase.from("match_lineups").delete().eq("match_id", matchId);
  await supabase.from("match_staff_lineups").delete().eq("match_id", matchId);

  const { error } = await supabase
    .from("matches").delete().eq("id", matchId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function publicarResultado(
  matchId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("match_reports")
    .select("id, status")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existing?.status === "approved") {
    const { data: match } = await supabase
      .from("matches").select("phase_id, team_a_id, team_b_id").eq("id", matchId).maybeSingle();
    if (match?.phase_id) {
      const { data: phase } = await supabase
        .from("phases").select("edition_id").eq("id", match.phase_id).maybeSingle();
      if (phase?.edition_id) {
        await supabase.rpc("recalculate_team_edition_stats", { p_edition_id: phase.edition_id });
        await supabase.rpc("recalculate_athlete_edition_stats", { p_edition_id: phase.edition_id });
      }
    }
    return { success: true };
  }

  await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);

  const now = new Date().toISOString();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Perfil de usuário não encontrado." };

  const submitterType = profile.role === "main" ? "main" : "supporter";
  const profileId = profile.id;

  const { data: existingReport } = await supabase
    .from("match_reports")
    .select("id")
    .eq("match_id", matchId)
    .maybeSingle();

  let reportError = null;
  if (existingReport) {
    const { error } = await supabase
      .from("match_reports")
      .update({ status: "approved", reviewed_by: profileId, reviewed_at: now })
      .eq("id", existingReport.id);
    reportError = error;
  } else {
    const { error } = await supabase
      .from("match_reports")
      .insert({
        match_id: matchId,
        submitted_by: profileId,
        submitter_type: submitterType,
        status: "approved",
        reviewed_by: profileId,
        submitted_at: now,
        reviewed_at: now,
      });
    reportError = error;
  }

  if (reportError) return { error: reportError.message };

  const { data: match } = await supabase
    .from("matches").select("phase_id, team_a_id, team_b_id").eq("id", matchId).maybeSingle();

  if (match?.phase_id) {
    const { data: phase } = await supabase
      .from("phases").select("edition_id").eq("id", match.phase_id).maybeSingle();
    if (phase?.edition_id) {
      await supabase.rpc("recalculate_team_edition_stats", { p_edition_id: phase.edition_id });
      await supabase.rpc("recalculate_athlete_edition_stats", { p_edition_id: phase.edition_id });
      if (match.team_a_id) await supabase.rpc("recalculate_team_career_stats", { p_team_id: match.team_a_id });
      if (match.team_b_id) await supabase.rpc("recalculate_team_career_stats", { p_team_id: match.team_b_id });
    }
  }

  return { success: true };
}

export async function salvarArbitrosPartida(
  matchId: string,
  entries: { referee_id: string; referee_role_id: string }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error: deleteError } = await supabase
    .from("match_referees")
    .delete()
    .eq("match_id", matchId);

  if (deleteError) return { error: deleteError.message };

  if (entries.length === 0) return { success: true };

  const { error } = await supabase
    .from("match_referees")
    .insert(entries.map(e => ({ match_id: matchId, referee_id: e.referee_id, referee_role_id: e.referee_role_id })));

  if (error) return { error: error.message };
  return { success: true };
}