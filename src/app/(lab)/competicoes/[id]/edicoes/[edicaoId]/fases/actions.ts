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

  // Campos de mata-mata e conferência
  const legs = formData.get("legs") === "true";
  const aggregate_score = formData.get("aggregate_score") === "true";
  const third_place_match = formData.get("third_place_match") === "true";
  const penalty_tiebreaker_type = String(formData.get("penalty_tiebreaker_type") ?? "").trim() || null;

  // Campos classificatórios
  const points_win = Number(formData.get("points_win") ?? 3) || 3;
  const points_draw = Number(formData.get("points_draw") ?? 1) || 1;
  const points_loss = Number(formData.get("points_loss") ?? 0) || 0;

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
      ...(isKnockout ? { legs, aggregate_score, third_place_match, penalty_tiebreaker_type } : {}),
      ...(isClassificatory ? { points_win, points_draw, points_loss } : {}),
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
  const legs = formData.get("legs") === "true";
  const aggregate_score = formData.get("aggregate_score") === "true";
  const third_place_match = formData.get("third_place_match") === "true";
  const penalty_tiebreaker_type = String(formData.get("penalty_tiebreaker_type") ?? "").trim() || null;
  const points_win = Number(formData.get("points_win") ?? 3) || 3;
  const points_draw = Number(formData.get("points_draw") ?? 1) || 1;
  const points_loss = Number(formData.get("points_loss") ?? 0) || 0;

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
      ...(isKnockout ? { legs, aggregate_score, third_place_match, penalty_tiebreaker_type } : {}),
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

  // Verifica se há partidas nesta fase
  const { data: matches } = await supabase
    .from("matches").select("id").eq("phase_id", faseId).limit(1);

  if (matches && matches.length > 0) {
    return { error: "Esta fase possui partidas. Remova ou realoque as partidas antes de excluir a fase." };
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
  if (!name) return { error: "Nome é obrigatório." };

  const custom_label = String(formData.get("custom_label") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;

  const { data: inserted, error } = await supabase
    .from("rounds")
    .insert({ phase_id: faseId, name, custom_label, display_order })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function criarConfrontoEliminatorio(
  faseId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const round_label = String(formData.get("round_label") ?? "").trim();
  if (!round_label) return { error: "Rótulo da rodada é obrigatório." };

  const team_a_id = String(formData.get("team_a_id") ?? "").trim() || null;
  const team_b_id = String(formData.get("team_b_id") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0) || 0;

  const { data: inserted, error } = await supabase
    .from("matchups")
    .insert({ phase_id: faseId, round_label, team_a_id, team_b_id, display_order, is_completed: false })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}