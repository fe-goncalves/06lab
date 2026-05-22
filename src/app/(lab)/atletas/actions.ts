"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";

function parseDate(ddmmaaaa: string): string | null {
  const cleaned = ddmmaaaa.replace(/\D/g, "");
  if (cleaned.length !== 8) return null;
  const d = cleaned.slice(0, 2);
  const m = cleaned.slice(2, 4);
  const y = cleaned.slice(4, 8);
  return `${y}-${m}-${d}`;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, organization_id: profile?.organization_id ?? null };
}

export async function criarAtleta(formData: FormData) {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);

  if (!organization_id) return { error: "Organização não encontrada." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "") || null;
  const position_id = String(formData.get("position_id") ?? "") || null;
  const rg = onlyDigits(String(formData.get("rg") ?? "")) || null;

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const birth_date = birthRaw ? parseDate(birthRaw) : null;

  let photo_url: string | null = null;
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
    const path = `athletes/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("athletes")
    .insert({ full_name, surname, gender, position_id, rg, birth_date, photo_url, organization_id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarAtleta(id: string, formData: FormData) {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);

  if (!organization_id) return { error: "Organização não encontrada." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "") || null;
  const position_id = String(formData.get("position_id") ?? "") || null;
  const rg = onlyDigits(String(formData.get("rg") ?? "")) || null;
  const cpf = onlyDigits(String(formData.get("cpf") ?? "")) || null;

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const birth_date = birthRaw ? parseDate(birthRaw) : null;

  const { data: existing } = await supabase
    .from("athletes")
    .select("id, photo_url")
    .eq("id", id)
    .eq("organization_id", organization_id)
    .maybeSingle();

  if (!existing) return { error: "Atleta não encontrado." };

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
    const path = `athletes/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("athletes")
    .update({ full_name, surname, gender, position_id, rg, cpf, birth_date, photo_url })
    .eq("id", id)
    .eq("organization_id", organization_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function vincularAtleta(
  athleteId: string,
  teamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  // Encerra stint atual se existir
  await supabase
    .from("athlete_team_stints")
    .update({ ended_at: new Date().toISOString().split("T")[0], is_current: false })
    .eq("athlete_id", athleteId)
    .eq("is_current", true);

  // Cria novo stint
  const { error } = await supabase
    .from("athlete_team_stints")
    .insert({
      athlete_id: athleteId,
      team_id: teamId,
      started_at: new Date().toISOString().split("T")[0],
      is_current: true,
    });

  if (error) return { error: error.message };

  return { success: true };
}

export async function adicionarStint(
  athleteId: string,
  teamId: string,
  movementType: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .insert({
      athlete_id: athleteId,
      team_id: teamId,
      movement_type: movementType,
      started_at: startedAt,
      ended_at: endedAt,
      is_current: false,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerStint(
  stintId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: stint } = await supabase
    .from("athlete_team_stints")
    .select("ended_at")
    .eq("id", stintId)
    .maybeSingle();

  if (stint?.ended_at === null) return { error: "Não é possível remover o vínculo atual. Use a aba Informações para transferir o atleta." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .delete()
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function editarStint(
  stintId: string,
  movementType: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .update({
      movement_type: movementType,
      started_at: startedAt,
      ended_at: endedAt ?? null,
    })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleStintAtivo(
  stintId: string,
  isActive: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .update({ is_active: isActive })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}
