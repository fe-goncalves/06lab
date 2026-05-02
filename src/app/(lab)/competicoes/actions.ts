"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function criarCompeticao(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const short_name = String(formData.get("short_name") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "").trim() || "male";
  const file = formData.get("logo") as File | null;

  let logo_url: string | null = null;

  if (file && file.size > 0) {
    const safe = file.name.replace(/[^\w.\-]/g, "_") || "logo";
    const path = `competitions/${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("logo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("logo").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("competitions")
    .insert({
      full_name,
      short_name,
      gender,
      logo_url,
      sport_slug: "football7",
      organization_id: profile.organization_id,
    })
    .select("id").single();

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/competicoes");
  return { id: inserted.id };
}

export async function editarCompeticao(
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

  const { data: existing } = await supabase
    .from("competitions").select("id, logo_url")
    .eq("id", id).eq("organization_id", profile.organization_id).maybeSingle();

  if (!existing) return { error: "Competição não encontrada." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const short_name = String(formData.get("short_name") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "").trim() || "male";
  const pinned_in_sidebar = formData.get("pinned_in_sidebar") === "true";
  const primary_color = String(formData.get("primary_color") ?? "").trim() || null;

  // Divisões — múltiplas, separadas por vírgula
  const division_above_ids = String(formData.get("division_above_ids") ?? "").trim() || null;
  const division_below_ids = String(formData.get("division_below_ids") ?? "").trim() || null;
  const division_same_ids = String(formData.get("division_same_ids") ?? "").trim() || null;

  const file = formData.get("logo") as File | null;
  let logo_url = existing.logo_url;

  if (file && file.size > 0) {
    const safe = file.name.replace(/[^\w.\-]/g, "_") || "logo";
    const path = `competitions/${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("logo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("logo").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      full_name,
      short_name,
      gender,
      pinned_in_sidebar,
      primary_color,
      division_above_ids,
      division_below_ids,
      division_same_ids,
      logo_url,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/competicoes");
  revalidatePath(`/competicoes/${id}`);
  revalidatePath(`/competicoes/${id}/configuracoes`);
  return { success: true };
}

// ─── Categorias ───────────────────────────────────────────────────────────────

export async function criarCategoria(
  competitionId: string,
  label: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Nome da categoria é obrigatório." };

  const { data: existing } = await supabase
    .from("competition_categories")
    .select("display_order")
    .eq("competition_id", competitionId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.display_order ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("competition_categories")
    .insert({
      competition_id: competitionId,
      organization_id: profile.organization_id,
      label: trimmed,
      display_order: nextOrder,
    })
    .select("id").single();

  if (error) return { error: error.message };
  revalidatePath(`/competicoes/${competitionId}/configuracoes`);
  return { id: inserted.id };
}

export async function editarCategoria(
  categoryId: string,
  label: string,
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Nome é obrigatório." };

  const { error } = await supabase
    .from("competition_categories")
    .update({ label: trimmed })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath(`/competicoes/${competitionId}/configuracoes`);
  return { success: true };
}

export async function deletarCategoria(
  categoryId: string,
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("competition_categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath(`/competicoes/${competitionId}/configuracoes`);
  return { success: true };
}