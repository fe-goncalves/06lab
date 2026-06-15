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
