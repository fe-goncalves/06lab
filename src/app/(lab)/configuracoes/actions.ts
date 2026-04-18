"use server";

import { createClient } from "@/lib/supabase-server";

export async function salvarOrganizacao(
  orgId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("role")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main") return { error: "Sem permissão." };

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const custom_domain = String(formData.get("custom_domain") ?? "").trim() || null;

  if (!name) return { error: "Nome é obrigatório." };
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug inválido. Use apenas letras minúsculas, números e hífens." };

  const file = formData.get("logo") as File | null;
  let logo_url: string | undefined = undefined;

  if (file && file.size > 0) {
    const safe = file.name.replace(/[^\w.\-]/g, "_") || "logo";
    const path = `orgs/${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("logo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("logo").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name, slug, custom_domain, ...(logo_url ? { logo_url } : {}) })
    .eq("id", orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function alterarSenha(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const newPassword = String(formData.get("new_password") ?? "").trim();
  if (!newPassword || newPassword.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}