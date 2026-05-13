"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function criarSuspensao(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const athlete_id = String(formData.get("athlete_id") ?? "").trim();
  if (!athlete_id) return { error: "Atleta é obrigatório." };

  const games_total = Number(formData.get("games_total") ?? 0);
  if (!games_total || games_total < 1) return { error: "Quantidade de jogos deve ser maior que zero." };

  const scope_edition_id = String(formData.get("scope_edition_id") ?? "").trim();
  if (!scope_edition_id) return { error: "Edição é obrigatória." };

  const starts_at = String(formData.get("starts_at") ?? "").trim();
  if (!starts_at) return { error: "Data de início é obrigatória." };

  const origin_match_id = String(formData.get("origin_match_id") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { data: inserted, error } = await supabase
    .from("suspensions")
    .insert({
      organization_id: profile.organization_id,
      athlete_id,
      origin_match_id,
      scope_type: "edition",
      scope_edition_id,
      starts_at,
      games_total,
      games_remaining: games_total,
      is_active: true,
      reason,
      created_by: profile.id,
    })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarSuspensao(
  id: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const games_total = Number(formData.get("games_total") ?? 0);
  if (!games_total || games_total < 1) return { error: "Quantidade de jogos deve ser maior que zero." };

  const games_remaining = Number(formData.get("games_remaining") ?? 0);
  const starts_at = String(formData.get("starts_at") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { error } = await supabase
    .from("suspensions")
    .update({
      games_total,
      games_remaining: Math.min(games_remaining, games_total),
      starts_at,
      reason,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function desativarSuspensao(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("suspensions")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}