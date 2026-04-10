"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

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
    const safeName = file.name.replace(/[^\w.\-]/g, "_") || "photo";
    const path = `athletes/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photos").getPublicUrl(path);
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
    const safeName = file.name.replace(/[^\w.\-]/g, "_") || "photo";
    const path = `athletes/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photos").getPublicUrl(path);
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