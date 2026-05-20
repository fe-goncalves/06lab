"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function criarFase(
  edicaoId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome é obrigatório." };

  const phase_type = String(formData.get("phase_type") ?? "").trim();
  if (!phase_type) return { error: "Tipo de fase é obrigatório." };

  const custom_label = String(formData.get("custom_label") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const half_duration_minutes = Number(formData.get("half_duration_minutes") ?? 0) || null;
  const template_id = String(formData.get("template_id") ?? "").trim() || null;
  const third_place_match = formData.get("third_place_match") === "true";
  const penalty_tiebreaker_type = String(formData.get("penalty_tiebreaker_type") ?? "").trim() || null;
  const points_win = Number(formData.get("points_win") ?? 3) || 3;
  const points_draw = Number(formData.get("points_draw") ?? 1) || 1;
  const points_loss = Number(formData.get("points_loss") ?? 0);
  const isKnockout = phase_type === "knockout" || phase_type === "conference";
  const isClassificatory = phase_type === "round_robin" || phase_type === "group_stage";

  const { data: inserted, error } = await supabase
    .from("phases")
    .insert({
      edition_id: edicaoId,
      phase_type,
      full_name,
      custom_label,
      display_order,
      half_duration_minutes,
      is_current: false,
      template_id,
      ...(isKnockout ? { third_place_match, penalty_tiebreaker_type } : {}),
      ...(isClassificatory ? { points_win, points_draw, points_loss } : {}),
    })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function criarFaseDoTemplate(
  templateId: string,
  edicaoId: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: template, error: templateError } = await supabase
    .from("phase_templates").select("*").eq("id", templateId).maybeSingle();

  if (templateError || !template) return { error: "Template não encontrado." };

  const isKnockout = template.phase_type === "knockout" || template.phase_type === "conference";
  const isClassificatory = template.phase_type === "round_robin" || template.phase_type === "group_stage";

  const { data: inserted, error } = await supabase
    .from("phases")
    .insert({
      edition_id: edicaoId,
      phase_type: template.phase_type,
      full_name: template.name,
      custom_label: template.custom_label,
      display_order: template.display_order,
      half_duration_minutes: template.half_duration_minutes,
      is_current: false,
      template_id: templateId,
      ...(isKnockout ? {
        third_place_match: template.third_place_match,
        penalty_tiebreaker_type: template.penalty_tiebreaker_type,
      } : {}),
      ...(isClassificatory ? {
        points_win: template.points_win,
        points_draw: template.points_draw,
        points_loss: template.points_loss,
      } : {}),
    })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarFase(
  faseId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome é obrigatório." };

  const custom_label = String(formData.get("custom_label") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const half_duration_minutes = Number(formData.get("half_duration_minutes") ?? 0) || null;
  const is_current = formData.get("is_current") === "true";
  const phase_type = String(formData.get("phase_type") ?? "");
  const third_place_match = formData.get("third_place_match") === "true";
  const penalty_tiebreaker_type = String(formData.get("penalty_tiebreaker_type") ?? "").trim() || null;
  const points_win = Number(formData.get("points_win") ?? 3) || 3;
  const points_draw = Number(formData.get("points_draw") ?? 1) || 1;
  const points_loss = Number(formData.get("points_loss") ?? 0);
  const isKnockout = phase_type === "knockout" || phase_type === "conference";
  const isClassificatory = phase_type === "round_robin" || phase_type === "group_stage";

  if (is_current) {
    const { data: phase } = await supabase
      .from("phases").select("edition_id").eq("id", faseId).maybeSingle();
    if (phase?.edition_id) {
      await supabase.from("phases")
        .update({ is_current: false })
        .eq("edition_id", phase.edition_id)
        .neq("id", faseId);
    }
  }

  const { error } = await supabase
    .from("phases")
    .update({
      full_name,
      custom_label,
      display_order,
      half_duration_minutes,
      is_current,
      ...(isKnockout ? { third_place_match, penalty_tiebreaker_type } : {}),
      ...(isClassificatory ? { points_win, points_draw, points_loss } : {}),
    })
    .eq("id", faseId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletarFase(
  faseId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: matches } = await supabase
    .from("matches").select("id").eq("phase_id", faseId).limit(1);

  if (matches && matches.length > 0) {
    return { error: "Esta fase possui partidas. Remova as partidas antes de excluir a fase." };
  }

  const { error } = await supabase
    .from("phases").delete().eq("id", faseId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function criarRodada(
  faseId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Tipo é obrigatório." };

  const custom_label = String(formData.get("custom_label") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const legs = formData.get("legs") === "true";
  const aggregate_score = formData.get("aggregate_score") === "true";

  const { data: inserted, error } = await supabase
    .from("rounds")
    .insert({ phase_id: faseId, name, custom_label, display_order, legs, aggregate_score })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarRodada(
  roundId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };

  const custom_label = String(formData.get("custom_label") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const is_current = formData.get("is_current") === "true";
  const legs = formData.get("legs") === "true";
  const aggregate_score = formData.get("aggregate_score") === "true";

  const { error } = await supabase
    .from("rounds")
    .update({ name, custom_label, display_order, is_current, legs, aggregate_score })
    .eq("id", roundId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletarRodada(
  roundId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: matches } = await supabase
    .from("matches").select("id").eq("round_id", roundId).limit(1);

  if (matches && matches.length > 0)
    return { error: "Esta rodada possui partidas. Remova as partidas antes de excluir." };

  const { error } = await supabase
    .from("rounds").delete().eq("id", roundId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function salvarFaseComoTemplate(
  faseId: string,
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: phase, error: phaseError } = await supabase
    .from("phases").select("*").eq("id", faseId).maybeSingle();

  if (phaseError || !phase) return { error: "Fase não encontrada." };

  const { data: existing } = await supabase
    .from("phase_templates")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("name", phase.full_name)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("phase_templates")
      .update({
        custom_label: phase.custom_label,
        phase_type: phase.phase_type,
        display_order: phase.display_order,
        half_duration_minutes: phase.half_duration_minutes,
        third_place_match: phase.third_place_match,
        penalty_tiebreaker_type: phase.penalty_tiebreaker_type,
        points_win: phase.points_win,
        points_draw: phase.points_draw,
        points_loss: phase.points_loss,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("phase_templates")
      .insert({
        competition_id: competitionId,
        name: phase.full_name,
        custom_label: phase.custom_label,
        phase_type: phase.phase_type,
        display_order: phase.display_order,
        half_duration_minutes: phase.half_duration_minutes,
        third_place_match: phase.third_place_match,
        penalty_tiebreaker_type: phase.penalty_tiebreaker_type,
        points_win: phase.points_win,
        points_draw: phase.points_draw,
        points_loss: phase.points_loss,
      });
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function deletarTemplate(
  templateId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("phase_templates").delete().eq("id", templateId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function editarTemplate(
  templateId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };

  const custom_label = String(formData.get("custom_label") ?? "").trim() || null;
  const half_duration_minutes = Number(formData.get("half_duration_minutes") ?? 0) || null;
  const third_place_match = formData.get("third_place_match") === "true";
  const penalty_tiebreaker_type = String(formData.get("penalty_tiebreaker_type") ?? "").trim() || null;
  const points_win = Number(formData.get("points_win") ?? 3) || 3;
  const points_draw = Number(formData.get("points_draw") ?? 1) || 1;
  const points_loss = Number(formData.get("points_loss") ?? 0);

  const { error } = await supabase
    .from("phase_templates")
    .update({
      name,
      custom_label,
      half_duration_minutes,
      third_place_match,
      penalty_tiebreaker_type,
      points_win,
      points_draw,
      points_loss,
    })
    .eq("id", templateId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function adicionarEquipeFase(
  phaseId: string,
  editionTeamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("phase_teams").select("id")
    .eq("phase_id", phaseId).eq("edition_team_id", editionTeamId).maybeSingle();

  if (existing) return { error: "Equipe já adicionada a esta fase." };

  const { error } = await supabase
    .from("phase_teams")
    .insert({ phase_id: phaseId, edition_team_id: editionTeamId });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerEquipeFase(
  phaseId: string,
  editionTeamId: string,
): Promise<{ success: true; deactivated?: boolean } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Busca o team_id real a partir do edition_team_id
  const { data: editionTeam } = await supabase
    .from("edition_teams")
    .select("team_id")
    .eq("id", editionTeamId)
    .maybeSingle();

  if (!editionTeam) return { error: "Equipe não encontrada." };

  // Verifica se há partidas nesta fase com essa equipe
  const { data: matchesA } = await supabase
    .from("matches")
    .select("id")
    .eq("phase_id", phaseId)
    .eq("team_a_id", editionTeam.team_id)
    .limit(1);

  const { data: matchesB } = await supabase
    .from("matches")
    .select("id")
    .eq("phase_id", phaseId)
    .eq("team_b_id", editionTeam.team_id)
    .limit(1);

  const hasMatches =
    (matchesA && matchesA.length > 0) || (matchesB && matchesB.length > 0);

  if (hasMatches) {
    // Tem partidas: desativa em vez de deletar
    const { error } = await supabase
      .from("phase_teams")
      .update({ is_active: false })
      .eq("phase_id", phaseId)
      .eq("edition_team_id", editionTeamId);

    if (error) return { error: error.message };
    return { success: true, deactivated: true };
  }

  // Sem partidas: pode deletar com segurança
  const { error } = await supabase
    .from("phase_teams")
    .delete()
    .eq("phase_id", phaseId)
    .eq("edition_team_id", editionTeamId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function criarGrupo(
  phaseId: string,
  name: string,
  displayOrder: number,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: inserted, error } = await supabase
    .from("groups")
    .insert({ phase_id: phaseId, name, display_order: displayOrder })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarGrupo(
  groupId: string,
  name: string,
  customLabel: string | null,
  displayOrder: number,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("groups")
    .update({ name, custom_label: customLabel, display_order: displayOrder })
    .eq("id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletarGrupo(
  groupId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  await supabase.from("group_teams").delete().eq("group_id", groupId);

  const { error } = await supabase
    .from("groups").delete().eq("id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function adicionarEquipeGrupo(
  groupId: string,
  editionTeamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("group_teams").select("id")
    .eq("group_id", groupId).eq("edition_team_id", editionTeamId).maybeSingle();

  if (existing) return { error: "Equipe já está neste grupo." };

  const { error } = await supabase
    .from("group_teams")
    .insert({ group_id: groupId, edition_team_id: editionTeamId });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerEquipeGrupo(
  groupId: string,
  editionTeamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("group_teams")
    .delete()
    .eq("group_id", groupId)
    .eq("edition_team_id", editionTeamId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function editarConfronto(
  matchupId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const round_label = String(formData.get("round_label") ?? "").trim();
  const team_a_id = String(formData.get("team_a_id") ?? "").trim() || null;
  const team_b_id = String(formData.get("team_b_id") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const is_current = formData.get("is_current") === "true";

  const { error } = await supabase
    .from("matchups")
    .update({ round_label, team_a_id, team_b_id, display_order, is_current })
    .eq("id", matchupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletarConfronto(
  matchupId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: matches } = await supabase
    .from("matches").select("id").eq("matchup_id", matchupId).limit(1);

  if (matches && matches.length > 0)
    return { error: "Este confronto possui partidas. Remova as partidas antes de excluir." };

  const { error } = await supabase
    .from("matchups").delete().eq("id", matchupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function atualizarPartidaLogistica(
  matchId: string,
  data: { match_date: string | null; match_time: string | null; venue_id: string | null },
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("matches")
    .update({
      match_date: data.match_date || null,
      match_time: data.match_time || null,
      venue_id: data.venue_id || null,
    })
    .eq("id", matchId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function atualizarArbitrosPartida(
  matchId: string,
  referees: { referee_id: string; referee_role_id: string }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error: deleteError } = await supabase
    .from("match_referees")
    .delete()
    .eq("match_id", matchId);

  if (deleteError) return { error: deleteError.message };

  if (referees.length > 0) {
    const rows = referees.map(r => ({
      match_id: matchId,
      referee_id: r.referee_id,
      referee_role_id: r.referee_role_id,
    }));
    const { error: insertError } = await supabase
      .from("match_referees")
      .insert(rows);
    if (insertError) return { error: insertError.message };
  }

  return { success: true };
}