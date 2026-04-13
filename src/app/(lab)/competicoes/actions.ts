"use server";

import { createClient } from "@/lib/supabase-server";
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
  const division_above_id = String(formData.get("division_above_id") ?? "").trim() || null;
  const division_below_id = String(formData.get("division_below_id") ?? "").trim() || null;
  const pinned_in_sidebar = formData.get("pinned_in_sidebar") === "true";

  let logo_url: string | null = existing.logo_url;
  const file = formData.get("logo") as File | null;

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
    .update({ full_name, short_name, gender, logo_url, division_above_id, division_below_id, pinned_in_sidebar })
    .eq("id", id).eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}