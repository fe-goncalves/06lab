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

  const team_a_id = String(formData.get("team_a_id") ?? "").trim() || null;
  const team_b_id = String(formData.get("team_b_id") ?? "").trim() || null;
  const team_a_is_home = formData.get("team_a_is_home") === "true";
  const match_date = String(formData.get("match_date") ?? "").trim() || null;
  const match_time = String(formData.get("match_time") ?? "").trim() || null;
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "scheduled");
  const finish_type = String(formData.get("finish_type") ?? "").trim() || null;
  const result_only_mode = formData.get("result_only_mode") === "true";
  const score_a = Number(formData.get("score_a") ?? 0);
  const score_b = Number(formData.get("score_b") ?? 0);
  const motm_athlete_id = String(formData.get("motm_athlete_id") ?? "").trim() || null;
  const highlights_url = String(formData.get("highlights_url") ?? "").trim() || null;
  const photos_url = String(formData.get("photos_url") ?? "").trim() || null;

  const { error } = await supabase
    .from("matches")
    .update({
      team_a_id, team_b_id, team_a_is_home,
      match_date, match_time, venue_id,
      status, finish_type, result_only_mode,
      score_a, score_b,
      motm_athlete_id, highlights_url, photos_url,
    })
    .eq("id", matchId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function salvarFormacoes(
  matchId: string,
  lineups: { athlete_id: string; edition_team_id: string; is_present: boolean; played_as_goalkeeper: boolean; is_captain: boolean }[],
  staffLineups: { staff_member_id: string; edition_team_id: string; is_present: boolean }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Delete e reinsere lineups
  await supabase.from("match_lineups").delete().eq("match_id", matchId);
  if (lineups.length > 0) {
    const { error } = await supabase.from("match_lineups").insert(
      lineups.map(l => ({ match_id: matchId, ...l }))
    );
    if (error) return { error: error.message };
  }

  await supabase.from("match_staff_lineups").delete().eq("match_id", matchId);
  if (staffLineups.length > 0) {
    const { error } = await supabase.from("match_staff_lineups").insert(
      staffLineups.map(s => ({ match_id: matchId, ...s }))
    );
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