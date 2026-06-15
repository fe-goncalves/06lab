"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";

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

  const referee_role_id = String(formData.get("referee_role_id") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const pix_key = String(formData.get("pix_key") ?? "").trim() || null;
  const file = formData.get("photo") as File | null;

  let photo_url: string | null = null;
  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `referees/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("referees")
    .insert({ full_name, referee_role_id, gender, phone, pix_key, photo_url, organization_id: profile.organization_id })
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

  const referee_role_id = String(formData.get("referee_role_id") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const pix_key = String(formData.get("pix_key") ?? "").trim() || null;

  let photo_url: string | null = existing.photo_url;
  const file = formData.get("photo") as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `referees/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("referees")
    .update({ full_name, referee_role_id, gender, phone, pix_key, photo_url })
    .eq("id", id).eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}
