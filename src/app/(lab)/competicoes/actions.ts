"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";

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
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `competitions/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("logo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("logo").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("competitions")
    .insert({
      full_name, short_name, gender, logo_url,
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
  const category_id = String(formData.get("category_id") ?? "").trim() || null;
  const division_above_ids = String(formData.get("division_above_ids") ?? "").trim() || null;
  const division_below_ids = String(formData.get("division_below_ids") ?? "").trim() || null;
  const division_same_ids = String(formData.get("division_same_ids") ?? "").trim() || null;
  const home_priority = Math.max(0, Number(formData.get("home_priority") ?? 0) || 0);

  const file = formData.get("logo") as File | null;
  let logo_url = existing.logo_url;

  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `competitions/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("logo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("logo").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      full_name, short_name, gender, pinned_in_sidebar,
      primary_color, category_id,
      division_above_ids, division_below_ids, division_same_ids,
      home_priority,
      logo_url,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/competicoes");
  revalidatePath("/competicoes/" + id);
  revalidatePath("/competicoes/" + id + "/configuracoes");
  return { success: true };
}

export async function atualizarPrioridadeHome(
  competitionId: string,
  priority: number,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("competitions")
    .update({ home_priority: Math.max(0, priority) })
    .eq("id", competitionId);

  if (error) return { error: error.message };
  revalidatePath("/competicoes/" + competitionId);
  revalidatePath("/competicoes");
  return { success: true };
}

export async function reordenarCompeticoes(
  gender: "male" | "female",
  orderedIds: string[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const { data: competitions, error: fetchError } = await supabase
    .from("competitions")
    .select("id, gender")
    .eq("organization_id", profile.organization_id);

  if (fetchError) return { error: fetchError.message };

  const genderIds = new Set(
    (competitions ?? [])
      .filter((c) => {
        const g = (c.gender ?? "").toLowerCase();
        if (gender === "male") return g === "male" || g === "m" || g === "masculino";
        return g === "female" || g === "f" || g === "feminino";
      })
      .map((c) => c.id as string),
  );

  if (orderedIds.length !== genderIds.size) {
    return { error: "Lista de competições inválida para reordenar." };
  }

  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || !orderedIds.every((id) => genderIds.has(id))) {
    return { error: "Lista de competições inválida para reordenar." };
  }

  const base = gender === "male" ? 200_000 : 100_000;

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("competitions")
      .update({ home_priority: base + (orderedIds.length - i) })
      .eq("id", orderedIds[i])
      .eq("organization_id", profile.organization_id);

    if (error) return { error: error.message };
  }

  revalidatePath("/competicoes");
  revalidatePath("/", "layout");
  return { success: true };
}

// ─── Categorias globais ───────────────────────────────────────────────────────

export async function criarCategoriaGlobal(
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

  const { data: last } = await supabase
    .from("categories")
    .select("display_order")
    .eq("organization_id", profile.organization_id)
    .order("display_order", { ascending: false })
    .limit(1).maybeSingle();

  const { data: inserted, error } = await supabase
    .from("categories")
    .insert({ organization_id: profile.organization_id, label: trimmed, display_order: (last?.display_order ?? 0) + 1 })
    .select("id").single();

  if (error) return { error: error.message };
  revalidatePath("/competicoes");
  return { id: inserted.id };
}

export async function editarCategoriaGlobal(
  categoryId: string,
  label: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Nome é obrigatório." };

  const { error } = await supabase.from("categories").update({ label: trimmed }).eq("id", categoryId);
  if (error) return { error: error.message };
  revalidatePath("/competicoes");
  return { success: true };
}

export async function deletarCategoriaGlobal(
  categoryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: error.message };
  revalidatePath("/competicoes");
  return { success: true };
}

// ─── Edições da competição ────────────────────────────────────────────────────

export async function criarEdicaoNaConfiguracao(
  competitionId: string,
  seasonId: string,
  customName: string,
  isCurrent: boolean,
  startDate = "",
  endDate = "",
  isHidden = false,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };
  if (!seasonId) return { error: "Temporada é obrigatória." };

  const { data: existing } = await supabase
    .from("competition_editions")
    .select("id").eq("competition_id", competitionId).eq("season_id", seasonId).maybeSingle();

  if (existing) return { error: "Já existe uma edição desta competição nesta temporada." };

  if (isCurrent) {
    await supabase
      .from("competition_editions")
      .update({ is_current: false })
      .eq("competition_id", competitionId);
  }

  const { data: inserted, error } = await supabase
    .from("competition_editions")
    .insert({
      competition_id: competitionId,
      season_id: seasonId,
      status: "planned",
      custom_name: customName.trim() || null,
      is_current: isCurrent,
      start_date: startDate.trim() || null,
      end_date: endDate.trim() || null,
      is_hidden: isHidden,
    })
    .select("id").single();

  if (error) return { error: error.message };

  await supabase.from("edition_settings").insert({ edition_id: inserted.id });

  const { data: freeAgentTeam } = await supabase
    .from("teams").select("id")
    .eq("organization_id", profile.organization_id)
    .eq("full_name", "Sem Clube").maybeSingle();

  if (freeAgentTeam) {
    await supabase.from("edition_teams").insert({
      edition_id: inserted.id, team_id: freeAgentTeam.id,
      is_free_agent_pool: true, display_order: 999,
    });
  }

  revalidatePath("/competicoes/" + competitionId + "/configuracoes");
  revalidatePath("/competicoes/" + competitionId);
  return { id: inserted.id };
}

export async function editarEdicaoNaConfiguracao(
  edicaoId: string,
  competitionId: string,
  status: string,
  customName: string,
  isCurrent: boolean,
  startDate = "",
  endDate = "",
  isHidden = false,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  if (isCurrent) {
    await supabase
      .from("competition_editions")
      .update({ is_current: false })
      .eq("competition_id", competitionId)
      .neq("id", edicaoId);
  }

  const { error } = await supabase
    .from("competition_editions")
    .update({
      status,
      custom_name: customName.trim() || null,
      is_current: isCurrent,
      start_date: startDate.trim() || null,
      end_date: endDate.trim() || null,
      is_hidden: isHidden,
    })
    .eq("id", edicaoId);

  if (error) return { error: error.message };
  revalidatePath("/competicoes/" + competitionId + "/configuracoes");
  revalidatePath("/competicoes/" + competitionId);
  return { success: true };
}

export async function deletarEdicao(
  edicaoId: string,
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("competition_editions").delete().eq("id", edicaoId);

  if (error) return { error: error.message };
  revalidatePath("/competicoes/" + competitionId + "/configuracoes");
  return { success: true };
}

export async function atualizarOrdemEdicoesAction(
  updates: { id: string; display_order: number; is_hidden: boolean }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  for (const update of updates) {
    const { error } = await supabase
      .from("competition_editions")
      .update({ display_order: update.display_order, is_hidden: update.is_hidden })
      .eq("id", update.id);

    if (error) return { error: error.message };
  }

  return { success: true };
}

// ─── Ativação e exclusão da competição ───────────────────────────────────────

function parseDivisionIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
  } catch {
    // legado: UUIDs separados por vírgula
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

async function assertOrgCompetition(
  competitionId: string,
): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; organizationId: string }
  | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const { data: competition } = await supabase
    .from("competitions")
    .select("id")
    .eq("id", competitionId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (!competition) return { error: "Competição não encontrada." };

  return { supabase, organizationId: profile.organization_id };
}

async function collectMotivosRegistrosCompeticao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  competitionId: string,
): Promise<string[]> {
  const { data: editions } = await supabase
    .from("competition_editions")
    .select("id")
    .eq("competition_id", competitionId);

  const editionIds = (editions ?? []).map((e) => e.id);
  if (editionIds.length === 0) return [];

  const reasons: string[] = [];

  const [
    { data: phases },
    { count: teamCount },
    { data: editionTeams },
    { count: athleteStatsCount },
    { count: teamStatsCount },
    { count: suspensionCount },
    { count: awardCount },
    { count: motmCount },
  ] = await Promise.all([
    supabase.from("phases").select("id").in("edition_id", editionIds),
    supabase
      .from("edition_teams")
      .select("id", { count: "exact", head: true })
      .in("edition_id", editionIds)
      .eq("is_free_agent_pool", false),
    supabase.from("edition_teams").select("id").in("edition_id", editionIds),
    supabase
      .from("athlete_edition_stats")
      .select("id", { count: "exact", head: true })
      .in("edition_id", editionIds),
    supabase
      .from("team_edition_stats")
      .select("*", { count: "exact", head: true })
      .in("edition_id", editionIds),
    supabase
      .from("suspensions")
      .select("id", { count: "exact", head: true })
      .in("edition_id", editionIds),
    supabase
      .from("edition_awards")
      .select("id", { count: "exact", head: true })
      .in("edition_id", editionIds),
    supabase
      .from("athlete_motm_entries")
      .select("id", { count: "exact", head: true })
      .in("edition_id", editionIds),
  ]);

  const phaseIds = (phases ?? []).map((p) => p.id);
  const editionTeamIds = (editionTeams ?? []).map((et) => et.id);

  const [{ count: matchCount }, { count: rosterCount }] = await Promise.all([
    phaseIds.length > 0
      ? supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .in("phase_id", phaseIds)
      : Promise.resolve({ count: 0 }),
    editionTeamIds.length > 0
      ? supabase
        .from("edition_roster_entries")
        .select("id", { count: "exact", head: true })
        .in("edition_team_id", editionTeamIds)
      : Promise.resolve({ count: 0 }),
  ]);

  if ((matchCount ?? 0) > 0) reasons.push("possui partidas cadastradas");
  if ((rosterCount ?? 0) > 0) reasons.push("possui inscrições de atletas ou comissão");
  if ((teamCount ?? 0) > 0) reasons.push("possui equipes inscritas");
  if (phaseIds.length > 0) reasons.push("possui fases cadastradas");
  if ((athleteStatsCount ?? 0) > 0) reasons.push("possui estatísticas de atletas");
  if ((teamStatsCount ?? 0) > 0) reasons.push("possui estatísticas de equipes");
  if ((suspensionCount ?? 0) > 0) reasons.push("possui suspensões vinculadas");
  if ((awardCount ?? 0) > 0) reasons.push("possui premiações registradas");
  if ((motmCount ?? 0) > 0) reasons.push("possui registros de craque da partida");

  return reasons;
}

export async function desativarCompeticao(
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertOrgCompetition(competitionId);
  if ("error" in auth) return auth;

  const { error } = await auth.supabase
    .from("competitions")
    .update({ is_active: false, pinned_in_sidebar: false })
    .eq("id", competitionId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/competicoes");
  revalidatePath("/competicoes/" + competitionId);
  revalidatePath("/competicoes/" + competitionId + "/configuracoes");
  return { success: true };
}

export async function reativarCompeticao(
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertOrgCompetition(competitionId);
  if ("error" in auth) return auth;

  const { error } = await auth.supabase
    .from("competitions")
    .update({ is_active: true })
    .eq("id", competitionId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/competicoes");
  revalidatePath("/competicoes/" + competitionId);
  revalidatePath("/competicoes/" + competitionId + "/configuracoes");
  return { success: true };
}

export async function verificarPodeExcluirCompeticao(
  competitionId: string,
): Promise<{ canDelete: boolean; reasons: string[] } | { error: string }> {
  const auth = await assertOrgCompetition(competitionId);
  if ("error" in auth) return auth;

  const { data: competition, error: fetchError } = await auth.supabase
    .from("competitions")
    .select("id, division_above_ids, division_below_ids, division_same_ids")
    .eq("id", competitionId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!competition) return { canDelete: false, reasons: ["Competição não encontrada."] };

  const reasons: string[] = [];

  const { data: activeRow, error: activeError } = await auth.supabase
    .from("competitions")
    .select("is_active")
    .eq("id", competitionId)
    .maybeSingle();

  if (!activeError && activeRow && activeRow.is_active !== false) {
    reasons.push("desative a competição antes de excluir");
  }

  const operationalReasons = await collectMotivosRegistrosCompeticao(auth.supabase, competitionId);
  for (const reason of operationalReasons) {
    if (!reasons.includes(reason)) reasons.push(reason);
  }

  const { count: editionCount } = await auth.supabase
    .from("competition_editions")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);

  if ((editionCount ?? 0) > 0 && operationalReasons.length === 0) {
    reasons.push("possui edições cadastradas — remova-as antes de excluir a competição");
  }

  const { data: others } = await auth.supabase
    .from("competitions")
    .select("id, full_name, division_above_ids, division_below_ids, division_same_ids")
    .eq("organization_id", auth.organizationId)
    .neq("id", competitionId);

  const linkedFrom = (others ?? []).filter((other) => {
    const fields = [
      other.division_above_ids,
      other.division_below_ids,
      other.division_same_ids,
    ];
    return fields.some((raw) => parseDivisionIds(raw).includes(competitionId));
  });

  if (linkedFrom.length > 0) {
    const names = linkedFrom
      .slice(0, 3)
      .map((c) => c.full_name)
      .join(", ");
    reasons.push(`vinculada em divisões de ${names}${linkedFrom.length > 3 ? "…" : ""}`);
  }

  return { canDelete: reasons.length === 0, reasons };
}

export async function excluirCompeticao(
  competitionId: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertOrgCompetition(competitionId);
  if ("error" in auth) return auth;

  const check = await verificarPodeExcluirCompeticao(competitionId);
  if ("error" in check) return check;
  if (!check.canDelete) {
    return { error: `Não é possível excluir: ${check.reasons.join(", ")}.` };
  }

  const { error } = await auth.supabase
    .from("competitions")
    .delete()
    .eq("id", competitionId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/competicoes");
  return { success: true };
}
