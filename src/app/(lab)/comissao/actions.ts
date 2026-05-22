// comissao/actions

"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";

function parseDateToISO(br: string): string | null {
  const clean = br.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  return `${clean.slice(4, 8)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
}

export async function criarMembro(
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
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const staff_role_id = String(formData.get("staff_role_id") ?? "").trim() || null;
  const rg = String(formData.get("rg") ?? "").replace(/\D/g, "") || null;
  const birth_date = parseDateToISO(String(formData.get("birth_date") ?? ""));
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
    const path = `staff/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("staff_members")
    .insert({ full_name, surname, gender, staff_role_id, rg, birth_date, photo_url, organization_id: profile.organization_id })
    .select("id").single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarMembro(
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
    .from("staff_members").select("id, photo_url")
    .eq("id", id).eq("organization_id", profile.organization_id).maybeSingle();

  if (!existing) return { error: "Membro não encontrado." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const staff_role_id = String(formData.get("staff_role_id") ?? "").trim() || null;
  const rg = String(formData.get("rg") ?? "").replace(/\D/g, "") || null;
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "") || null;
  const birth_date = parseDateToISO(String(formData.get("birth_date") ?? ""));

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
    const path = `staff/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo").upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("staff_members")
    .update({ full_name, surname, gender, staff_role_id, rg, cpf, birth_date, photo_url })
    .eq("id", id).eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function vincularMembroEquipe(
  staffMemberId: string,
  teamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  await supabase
    .from("staff_team_stints")
    .update({ ended_at: new Date().toISOString().split("T")[0], is_current: false })
    .eq("staff_member_id", staffMemberId)
    .eq("is_current", true);

  const { error } = await supabase
    .from("staff_team_stints")
    .insert({
      staff_member_id: staffMemberId,
      team_id: teamId,
      started_at: new Date().toISOString().split("T")[0],
      is_current: true,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function adicionarStintMembro(
  staffMemberId: string,
  teamId: string,
  movementType: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("staff_team_stints")
    .insert({
      staff_member_id: staffMemberId,
      team_id: teamId,
      movement_type: movementType,
      started_at: startedAt,
      ended_at: endedAt,
      is_current: false,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerStintMembro(
  stintId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: stint } = await supabase
    .from("staff_team_stints")
    .select("ended_at")
    .eq("id", stintId)
    .maybeSingle();

  if (stint?.ended_at === null) return { error: "Não é possível remover o vínculo atual. Use a aba Informações para transferir o membro." };

  const { error } = await supabase
    .from("staff_team_stints")
    .delete()
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function editarStintMembro(
  stintId: string,
  movementType: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("staff_team_stints")
    .update({
      movement_type: movementType,
      started_at: startedAt,
      ended_at: endedAt ?? null,
    })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleStintMembroAtivo(
  stintId: string,
  isActive: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("staff_team_stints")
    .update({ is_active: isActive })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}
