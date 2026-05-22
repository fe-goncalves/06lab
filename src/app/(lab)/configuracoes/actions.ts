"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";
import { validarURL, DOMINIOS_REDES_SOCIAIS } from "@/lib/security/urls";

// ─── Salvar organização (campos gerais + redes sociais + site) ────────────────

export async function salvarOrganizacao(
  orgId: string | undefined,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  if (!orgId) return { error: "Organização não encontrada." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("role")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main") return { error: "Sem permissão." };

  // Campos gerais
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!name) return { error: "Nome é obrigatório." };
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug inválido." };

  // Campos de site
  const custom_domain_raw = String(formData.get("custom_domain") ?? "").trim() || null;
  const primary_color = String(formData.get("primary_color") ?? "").trim() || null;
  const secondary_color = String(formData.get("secondary_color") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  // Validação de custom_domain (se preenchido, deve ser HTTPS ou um hostname sem protocolo)
  // Aceita formato de hostname puro (ex: "scores.org.com.br") ou URL HTTPS completa
  let custom_domain: string | null = null;
  if (custom_domain_raw) {
    // Normaliza: se não tem protocolo, tenta com https://
    const domainToTest = custom_domain_raw.startsWith("http")
      ? custom_domain_raw
      : `https://${custom_domain_raw}`;
    if (!validarURL(domainToTest)) {
      return { error: "Domínio personalizado inválido. Use apenas domínios válidos (ex: scores.suaorg.com.br)." };
    }
    // Salva apenas o hostname limpo (sem protocolo ou trailing slash)
    try {
      custom_domain = new URL(domainToTest).hostname;
    } catch {
      return { error: "Domínio personalizado inválido." };
    }
  }

  // Redes sociais — validadas com lista de domínios permitidos
  const instagram_url_raw = String(formData.get("instagram_url") ?? "").trim() || null;
  const youtube_url_raw = String(formData.get("youtube_url") ?? "").trim() || null;
  const tiktok_url_raw = String(formData.get("tiktok_url") ?? "").trim() || null;
  const twitter_url_raw = String(formData.get("twitter_url") ?? "").trim() || null;

  if (instagram_url_raw && !validarURL(instagram_url_raw, DOMINIOS_REDES_SOCIAIS)) {
    return { error: "URL do Instagram inválida. Use uma URL HTTPS do Instagram." };
  }
  if (youtube_url_raw && !validarURL(youtube_url_raw, DOMINIOS_REDES_SOCIAIS)) {
    return { error: "URL do YouTube inválida. Use uma URL HTTPS do YouTube." };
  }
  if (tiktok_url_raw && !validarURL(tiktok_url_raw, DOMINIOS_REDES_SOCIAIS)) {
    return { error: "URL do TikTok inválida. Use uma URL HTTPS do TikTok." };
  }
  if (twitter_url_raw && !validarURL(twitter_url_raw, DOMINIOS_REDES_SOCIAIS)) {
    return { error: "URL do Twitter/X inválida. Use uma URL HTTPS do Twitter ou X." };
  }

  // Upload de logo (opcional)
  const file = formData.get("logo") as File | null;
  let logo_url: string | undefined = undefined;

  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `orgs/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("logo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("logo").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      slug,
      custom_domain,
      primary_color,
      secondary_color,
      description,
      instagram_url: instagram_url_raw,
      youtube_url: youtube_url_raw,
      tiktok_url: tiktok_url_raw,
      twitter_url: twitter_url_raw,
      ...(logo_url ? { logo_url } : {}),
    })
    .eq("id", orgId);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Alterar senha ────────────────────────────────────────────────────────────

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

// ─── Listar usuários da organização ──────────────────────────────────────────

export async function listarUsuarios(
  orgId: string,
): Promise<{ users: Array<{ id: string; auth_user_id: string; full_name: string | null; role: string; created_at: string; email: string }> } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("role")
    .eq("auth_user_id", user.id).maybeSingle();
  if (profile?.role !== "main") return { error: "Sem permissão." };

  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("id, auth_user_id, full_name, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (profilesError) return { error: profilesError.message };
  if (!profiles || profiles.length === 0) return { users: [] };

  const adminClient = createAdminClient();
  const authUserIds = profiles.map(p => p.auth_user_id);

  const emailMap: Record<string, string> = {};
  for (const uid of authUserIds) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(uid);
    if (authUser?.user?.email) {
      emailMap[uid] = authUser.user.email;
    }
  }

  const users = profiles.map(p => ({
    ...p,
    email: emailMap[p.auth_user_id] ?? "—",
  }));

  return { users };
}

// ─── Convidar usuário ─────────────────────────────────────────────────────────

export async function convidarUsuario(
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

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "editor").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
  if (!["admin", "editor"].includes(role)) return { error: "Role inválida." };

  const adminClient = createAdminClient();

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: orgId, role },
  });

  if (inviteError) return { error: inviteError.message };
  if (!invited?.user) return { error: "Falha ao criar convite." };

  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      auth_user_id: invited.user.id,
      organization_id: orgId,
      full_name: null,
      role,
    });

  if (profileError) return { error: profileError.message };
  return { success: true };
}

// ─── Desativar usuário ────────────────────────────────────────────────────────

export async function desativarUsuario(
  profileId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("role")
    .eq("auth_user_id", user.id).maybeSingle();
  if (profile?.role !== "main") return { error: "Sem permissão." };

  const { error } = await supabase
    .from("user_profiles")
    .update({ role: "inactive" })
    .eq("id", profileId);

  if (error) return { error: error.message };
  return { success: true };
}
