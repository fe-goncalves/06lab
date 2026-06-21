"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";
import { validarURL, DOMINIOS_REDES_SOCIAIS } from "@/lib/security/urls";

type MainAdminContext =
  | { error: string }
  | { user: { id: string }; profileId: string; organizationId: string };

async function assertMainAdmin(): Promise<MainAdminContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role, organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "main") return { error: "Sem permissão." };
  if (!profile.organization_id) return { error: "Organização não encontrada." };

  return { user, profileId: profile.id, organizationId: profile.organization_id };
}

function teamShortLabel(team: {
  abbreviation: string | null;
  short_name: string | null;
  full_name: string;
}): string {
  return (
    team.abbreviation?.toUpperCase()
    ?? team.short_name?.toUpperCase()
    ?? team.full_name.slice(0, 3).toUpperCase()
  );
}

export type RepresentativeRow = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  photo_url: string | null;
  teams: Array<{
    id: string;
    short_label: string;
    full_name: string;
    short_name: string | null;
    logo_url: string | null;
  }>;
};

export type TeamOption = {
  id: string;
  full_name: string;
  short_name: string | null;
  short_label: string;
  logo_url: string | null;
};

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
  const tertiary_color = String(formData.get("tertiary_color") ?? "").trim() || null;
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
      tertiary_color,
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

  if (!newPassword || newPassword.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

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

// ─── Representantes ───────────────────────────────────────────────────────────

export async function listarEquipesOrganizacao(
  orgId: string,
): Promise<{ teams: TeamOption[] } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;
  if (auth.organizationId !== orgId) return { error: "Sem permissão." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, full_name, short_name, abbreviation, logo_url")
    .eq("organization_id", orgId)
    .eq("is_virtual", false)
    .order("full_name");

  if (error) return { error: error.message };

  const teams = (data ?? []).map(t => ({
    id: t.id,
    full_name: t.full_name,
    short_name: t.short_name,
    short_label: teamShortLabel(t),
    logo_url: (t.logo_url as string | null) ?? null,
  }));

  return { teams };
}

export async function listarRepresentantes(
  orgId: string,
): Promise<{ representatives: RepresentativeRow[] } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;
  if (auth.organizationId !== orgId) return { error: "Sem permissão." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("representatives")
    .select(`
      id, full_name, email, status, created_at, photo_url,
      representative_team_access (
        team_id,
        teams ( id, full_name, short_name, abbreviation, logo_url )
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };

  const representatives: RepresentativeRow[] = (data ?? []).map(rep => {
    const access = (rep.representative_team_access ?? []) as Array<{
      team_id: string;
      teams: {
        id: string;
        full_name: string;
        short_name: string | null;
        abbreviation: string | null;
        logo_url: string | null;
      } | null;
    }>;

    const teams = access
      .filter(a => a.teams)
      .map(a => ({
        id: a.teams!.id,
        full_name: a.teams!.full_name,
        short_name: a.teams!.short_name,
        short_label: teamShortLabel(a.teams!),
        logo_url: a.teams!.logo_url ?? null,
      }));

    return {
      id: rep.id,
      full_name: rep.full_name,
      email: rep.email,
      status: rep.status,
      created_at: rep.created_at,
      photo_url: (rep.photo_url as string | null) ?? null,
      teams,
    };
  });

  return { representatives };
}

export async function criarRepresentante(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const teamIds = formData.getAll("team_ids").map(String).filter(Boolean);

  if (!fullName || !email || password.length < 6 || teamIds.length === 0) {
    return { error: "Preencha todos os campos e selecione ao menos uma equipe." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "E-mail inválido." };
  }

  const { data: orgId, error: orgError } = await supabase.rpc("get_user_organization_id");
  if (orgError || !orgId) return { error: "Organização não encontrada." };
  if (orgId !== auth.organizationId) return { error: "Sem permissão." };

  const supabaseAdmin = createAdminClient();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Erro ao criar usuário." };
  }

  const { data: rep, error: repError } = await supabase
    .from("representatives")
    .insert({
      auth_user_id: authData.user.id,
      organization_id: orgId,
      full_name: fullName,
      email,
      status: "active",
      created_by: auth.profileId,
    })
    .select("id")
    .single();

  if (repError || !rep) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: repError?.message ?? "Erro ao criar representante." };
  }

  const accessRows = teamIds.map(teamId => ({
    representative_id: rep.id,
    team_id: teamId,
  }));

  const { error: accessError } = await supabase
    .from("representative_team_access")
    .insert(accessRows);

  if (accessError) {
    await supabase.from("representatives").delete().eq("id", rep.id);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: accessError.message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/representantes");
  return { success: true };
}

export async function atualizarRepresentante(
  repId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: rep, error: fetchError } = await supabase
    .from("representatives")
    .select("id, organization_id, auth_user_id, photo_url")
    .eq("id", repId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!rep || rep.organization_id !== auth.organizationId) {
    return { error: "Representante não encontrado." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const newPassword = String(formData.get("new_password") ?? "").trim();
  const removePhoto = formData.get("remove_photo") === "true";
  const teamIds = formData.getAll("team_ids").map(String).filter(Boolean);

  if (!fullName) return { error: "Nome é obrigatório." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "E-mail inválido." };
  }
  if (teamIds.length === 0) return { error: "Selecione ao menos uma equipe." };
  if (newPassword && newPassword.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres." };
  }

  let photo_url: string | null = rep.photo_url as string | null;
  if (removePhoto) {
    photo_url = null;
  } else {
    const file = formData.get("photo") as File | null;
    if (file && file.size > 0) {
      if (file.size > MAX_IMAGE_SIZE) {
        return { error: "A imagem deve ter no máximo 5 MB." };
      }
      const tipoValido = await validarTipoImagem(file);
      if (!tipoValido) return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
      const ext = await extensaoSegura(file);
      const path = `representatives/${gerarNomeSeguro(ext)}`;
      const { error: uploadError } = await supabase.storage
        .from("photo")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (uploadError) return { error: uploadError.message };
      const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
      photo_url = pub.publicUrl;
    }
  }

  const { error: updateError } = await supabase
    .from("representatives")
    .update({ full_name: fullName, email, photo_url })
    .eq("id", repId);

  if (updateError) return { error: updateError.message };

  const supabaseAdmin = createAdminClient();
  if (rep.auth_user_id) {
    const authUpdate: { email?: string; password?: string } = { email };
    if (newPassword) authUpdate.password = newPassword;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      rep.auth_user_id as string,
      authUpdate,
    );
    if (authError) return { error: authError.message };
  }

  const { error: deleteError } = await supabase
    .from("representative_team_access")
    .delete()
    .eq("representative_id", repId);

  if (deleteError) return { error: deleteError.message };

  const accessRows = teamIds.map(teamId => ({
    representative_id: repId,
    team_id: teamId,
  }));

  const { error: insertError } = await supabase
    .from("representative_team_access")
    .insert(accessRows);

  if (insertError) return { error: insertError.message };

  revalidatePath("/configuracoes");
  revalidatePath("/representantes");
  return { success: true };
}

export async function verificarPodeExcluirRepresentante(
  repId: string,
): Promise<{ canDelete: boolean; reasons: string[] } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: rep, error: fetchError } = await supabase
    .from("representatives")
    .select("id, organization_id, status")
    .eq("id", repId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!rep || rep.organization_id !== auth.organizationId) {
    return { canDelete: false, reasons: ["Representante não encontrado."] };
  }

  const reasons: string[] = [];

  if (rep.status === "active") {
    reasons.push("desative o representante antes de excluir");
  }

  const { count: pendingCount } = await supabase
    .from("roster_requests")
    .select("id", { count: "exact", head: true })
    .eq("requested_by_representative_id", repId)
    .eq("status", "pending");

  if ((pendingCount ?? 0) > 0) {
    reasons.push("possui solicitações pendentes");
  }

  return { canDelete: reasons.length === 0, reasons };
}

export async function excluirRepresentante(
  repId: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: rep, error: fetchError } = await supabase
    .from("representatives")
    .select("id, organization_id, auth_user_id, full_name")
    .eq("id", repId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!rep || rep.organization_id !== auth.organizationId) {
    return { error: "Representante não encontrado." };
  }

  const check = await verificarPodeExcluirRepresentante(repId);
  if ("error" in check) return check;
  if (!check.canDelete) {
    return { error: `Não é possível excluir: ${check.reasons.join(", ")}.` };
  }

  const { error: accessError } = await supabase
    .from("representative_team_access")
    .delete()
    .eq("representative_id", repId);

  if (accessError) return { error: accessError.message };

  const { error: deleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("id", repId);

  if (deleteError) return { error: deleteError.message };

  if (rep.auth_user_id) {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.auth.admin.deleteUser(rep.auth_user_id as string);
  }

  revalidatePath("/configuracoes");
  revalidatePath("/representantes");
  return { success: true };
}

export async function atualizarEquipesRepresentante(
  repId: string,
  teamIds: string[],
): Promise<{ success: true } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;
  if (!repId || teamIds.length === 0) {
    return { error: "Selecione ao menos uma equipe." };
  }

  const supabase = await createClient();
  const { data: rep, error: repError } = await supabase
    .from("representatives")
    .select("id, organization_id")
    .eq("id", repId)
    .maybeSingle();

  if (repError) return { error: repError.message };
  if (!rep || rep.organization_id !== auth.organizationId) {
    return { error: "Representante não encontrado." };
  }

  const { error: deleteError } = await supabase
    .from("representative_team_access")
    .delete()
    .eq("representative_id", repId);

  if (deleteError) return { error: deleteError.message };

  const accessRows = teamIds.map(teamId => ({
    representative_id: repId,
    team_id: teamId,
  }));

  const { error: insertError } = await supabase
    .from("representative_team_access")
    .insert(accessRows);

  if (insertError) return { error: insertError.message };

  revalidatePath("/configuracoes");
  revalidatePath("/representantes");
  return { success: true };
}

export async function desativarRepresentante(
  repId: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: rep, error: fetchError } = await supabase
    .from("representatives")
    .select("id, organization_id, status")
    .eq("id", repId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!rep || rep.organization_id !== auth.organizationId) {
    return { error: "Representante não encontrado." };
  }

  const { error } = await supabase
    .from("representatives")
    .update({ status: "inactive" })
    .eq("id", repId);

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/representantes");
  return { success: true };
}

export async function reativarRepresentante(
  repId: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertMainAdmin();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: rep, error: fetchError } = await supabase
    .from("representatives")
    .select("id, organization_id, status")
    .eq("id", repId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!rep || rep.organization_id !== auth.organizationId) {
    return { error: "Representante não encontrado." };
  }

  const { error } = await supabase
    .from("representatives")
    .update({ status: "active" })
    .eq("id", repId);

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/representantes");
  return { success: true };
}
