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
  const matchup_id = String(formData.get("matchup_id") ?? "").trim() || null;
  const team_a_id = String(formData.get("team_a_id") ?? "").trim() || null;
  const team_b_id = String(formData.get("team_b_id") ?? "").trim() || null;
  const team_a_is_home = formData.get("team_a_is_home") === "true";
  const match_date = String(formData.get("match_date") ?? "").trim() || null;
  const match_time = String(formData.get("match_time") ?? "").trim() || null;
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;

  const { data: inserted, error } = await supabase
    .from("matches")
    .insert({
      phase_id: faseId,
      round_id,
      matchup_id,
      team_a_id,
      team_b_id,
      team_a_is_home,
      match_date,
      match_time,
      venue_id,
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

  // Nunca sobrescreve team_a_id e team_b_id — esses são definidos na criação
  const updateData: Record<string, any> = {
    status, finish_type, score_a, score_b,
    motm_athlete_id, highlights_url, photos_url,
  };

  // Só atualiza data/hora/local se foram passados
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

  // Busca a partida para pegar team_a_id e team_b_id
  const { data: match } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, phase_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Partida não encontrada." };

  // Busca edition_id a partir da fase
  const { data: phase } = await supabase
    .from("phases").select("edition_id").eq("id", match.phase_id).maybeSingle();

  if (!phase) return { error: "Fase não encontrada." };

  // Busca edition_teams para mapear team_id → edition_team_id
  const { data: editionTeams } = await supabase
    .from("edition_teams")
    .select("id, team_id")
    .eq("edition_id", phase.edition_id)
    .in("team_id", [match.team_a_id, match.team_b_id].filter(Boolean));

  const teamToEditionTeam: Record<string, string> = {};
  (editionTeams ?? []).forEach((et: any) => {
    teamToEditionTeam[et.team_id] = et.id;
  });

  // Busca atletas via edition_roster_entries — mais confiável que stints
  const athleteIds = lineups.map(l => l.athlete_id);
  const { data: rosterEntries } = await supabase
    .from("edition_roster_entries")
    .select("athlete_id, edition_team_id")
    .in("athlete_id", athleteIds)
    .eq("member_type", "athlete");

  const athleteToEditionTeam: Record<string, string> = {};
  (rosterEntries ?? []).forEach((r: any) => {
    // Filtra apenas os edition_teams da partida
    if (Object.values(teamToEditionTeam).includes(r.edition_team_id)) {
      athleteToEditionTeam[r.athlete_id] = r.edition_team_id;
    }
  });

  // Monta os registros com edition_team_id correto
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
      // Gol contra: ponto para o adversário
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

  // Busca a ação para reverter o placar se necessário
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

  return { success: true };
}

export async function deletarPartida(
  matchId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Verifica se tem ações registradas
  const { data: actions } = await supabase
    .from("match_actions").select("id").eq("match_id", matchId).limit(1);

  if (actions && actions.length > 0) {
    return { error: "Esta partida possui ações registradas. Remova as ações antes de excluir." };
  }

  // Remove lineups
  await supabase.from("match_lineups").delete().eq("match_id", matchId);
  await supabase.from("match_staff_lineups").delete().eq("match_id", matchId);

  const { error } = await supabase
    .from("matches").delete().eq("id", matchId);

  if (error) return { error: error.message };
  return { success: true };
}