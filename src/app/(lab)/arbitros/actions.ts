"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

function parseDateToISO(br: string): string | null {
  const clean = br.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  return `${clean.slice(4, 8)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
}

export async function criarArbitro(
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

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const rg = String(formData.get("rg") ?? "").replace(/\D/g, "") || null;
  const birth_date = parseDateToISO(String(formData.get("birth_date") ?? ""));
  const profile_public = formData.get("profile_public") === "true";
  const referee_role_id = String(formData.get("referee_role_id") ?? "").trim() || null;
  const file = formData.get("photo") as File | null;

  let photo_url: string | null = null;
  if (file && file.size > 0) {
    const safe = file.name.replace(/[^\w.\-]/g, "_") || "photo";
    const path = `referees/${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("photo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("referees")
    .insert({ full_name, surname, rg, birth_date, photo_url, profile_public, referee_role_id, organization_id: profile.organization_id })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarArbitro(
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
    .from("referees").select("id, photo_url")
    .eq("id", id).eq("organization_id", profile.organization_id).maybeSingle();

  if (!existing) return { error: "Árbitro não encontrado." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const rg = String(formData.get("rg") ?? "").replace(/\D/g, "") || null;
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "") || null;
  const birth_date = parseDateToISO(String(formData.get("birth_date") ?? ""));
  const profile_public = formData.get("profile_public") === "true";
  const referee_role_id = String(formData.get("referee_role_id") ?? "").trim() || null;

  let photo_url: string | null = existing.photo_url;
  const file = formData.get("photo") as File | null;
  if (file && file.size > 0) {
    const safe = file.name.replace(/[^\w.\-]/g, "_") || "photo";
    const path = `referees/${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("photo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("referees")
    .update({ full_name, surname, rg, cpf, birth_date, photo_url, profile_public, referee_role_id })
    .eq("id", id).eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}