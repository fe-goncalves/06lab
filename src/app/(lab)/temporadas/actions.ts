"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function criarAno(
  value: number,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const { data: existing } = await supabase
    .from("years").select("id")
    .eq("organization_id", profile.organization_id)
    .eq("value", value).maybeSingle();

  if (existing) return { error: "Esse ano já existe." };

  const { data: inserted, error } = await supabase
    .from("years")
    .insert({ organization_id: profile.organization_id, value })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function criarTemporada(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };

  const year_id = String(formData.get("year_id") ?? "").trim();
  if (!year_id) return { error: "Ano é obrigatório." };

  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const starts_at = String(formData.get("starts_at") ?? "").trim() || null;
  const ends_at = String(formData.get("ends_at") ?? "").trim() || null;
  const is_current = formData.get("is_current") === "true";

  // Se marcar como atual, desativa as outras
  if (is_current) {
    await supabase
      .from("seasons")
      .update({ is_current: false })
      .eq("organization_id", profile.organization_id);
  }

  const { data: inserted, error } = await supabase
    .from("seasons")
    .insert({ name, year_id, display_order, starts_at, ends_at, is_current, organization_id: profile.organization_id })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarTemporada(
  id: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };

  const display_order = Number(formData.get("display_order") ?? 0) || 0;
  const starts_at = String(formData.get("starts_at") ?? "").trim() || null;
  const ends_at = String(formData.get("ends_at") ?? "").trim() || null;
  const is_current = formData.get("is_current") === "true";

  if (is_current) {
    await supabase
      .from("seasons")
      .update({ is_current: false })
      .eq("organization_id", profile.organization_id)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("seasons")
    .update({ name, display_order, starts_at, ends_at, is_current })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletarTemporada(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  // Verifica se há edições de competição vinculadas
  const { data: editions } = await supabase
    .from("competition_editions")
    .select("id")
    .eq("season_id", id)
    .limit(1);

  if (editions && editions.length > 0) {
    return {
      error:
        "Esta temporada possui edições de competição vinculadas e não pode ser excluída. Desative-a em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("seasons")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function desativarTemporada(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const { error } = await supabase
    .from("seasons")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}