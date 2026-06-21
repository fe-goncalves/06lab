// EQUIPES / ACTIONS

"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";
import { parseSupabaseError } from "@/lib/error-messages";

function normalizeHex(value: FormDataEntryValue | null): string | null {
  if (value === null || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  const hex = s.startsWith("#") ? s : `#${s}`;
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : null;
}

function normalizeGenderValue(value: string | null): "male" | "female" {
  const g = String(value ?? "").toLowerCase();
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "male";
}

function parseHiddenFlag(formData: FormData): boolean {
  const raw = formData.get("is_hidden");
  return raw === "true" || raw === "on" || raw === "1";
}

export async function criarEquipe(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const primary_color = (formData.get("primary_color") as string) || null;
  const secondary_color = (formData.get("secondary_color") as string) || null;
  const tertiary_color = (formData.get("tertiary_color") as string) || null;
  const is_hidden = parseHiddenFlag(formData);
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
    const path = `teams/${gerarNomeSeguro(ext)}`;

    const { error: uploadError } = await supabase.storage
      .from("logo")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      return { error: parseSupabaseError(uploadError.message) };
    }

    const { data: publicData } = supabase.storage
      .from("logo")
      .getPublicUrl(path);

    logo_url = publicData.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("teams")
    .insert({
      full_name: full_name.trim(),
      gender,
      logo_url,
      primary_color,
      secondary_color,
      tertiary_color,
      is_hidden,
      organization_id: profile.organization_id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: parseSupabaseError(error.message) };
  }

  return { id: inserted.id };
}

export async function editarEquipe(
  id: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const orgId = profile.organization_id;

  const { data: existing, error: fetchErr } = await supabase
    .from("teams")
    .select("id, logo_url, is_virtual")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { error: "Equipe não encontrada ou sem permissão." };
  }

  if (existing.is_virtual) {
    return { error: "\"Sem Clube\" é um pool do sistema e não pode ser editado." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) {
    return { error: "Nome completo é obrigatório." };
  }

  const short_nameRaw = String(formData.get("short_name") ?? "").trim();
  const short_name = short_nameRaw === "" ? null : short_nameRaw;

  const abbrRaw = String(formData.get("abbreviation") ?? "").trim().slice(0, 3);
  const abbreviation = abbrRaw === "" ? null : abbrRaw;

  const foundedRaw = formData.get("founded_year");
  let founded_year: number | null = null;
  if (foundedRaw !== null && foundedRaw !== "") {
    const n = Number(foundedRaw);
    if (Number.isFinite(n)) founded_year = Math.round(n);
  }

  const gender = String(formData.get("gender") ?? "");
  if (gender !== "male" && gender !== "female") {
    return { error: "Gênero inválido." };
  }

  const homeVenueRaw = formData.get("home_venue_id");
  const home_venue_id =
    homeVenueRaw === null || homeVenueRaw === ""
      ? null
      : String(homeVenueRaw);

  if (home_venue_id) {
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("id", home_venue_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!venue) {
      return { error: "Local inválido para esta organização." };
    }
  }

  const parentRaw = formData.get("parent_team_id");
  const parent_team_id =
    parentRaw === null || parentRaw === "" ? null : String(parentRaw);

  if (parent_team_id) {
    if (parent_team_id === id) {
      return { error: "A equipe não pode ser pai dela mesma." };
    }
    const { data: parent } = await supabase
      .from("teams")
      .select("id, gender, organization_id")
      .eq("id", parent_team_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!parent) {
      return { error: "Time pai não encontrado." };
    }
    if (normalizeGenderValue(parent.gender as string) !== gender) {
      return { error: "O time pai deve ser do mesmo gênero." };
    }
  }

  const primary_color = normalizeHex(formData.get("primary_color"));
  const secondary_color = normalizeHex(formData.get("secondary_color"));
  const tertiary_color = normalizeHex(formData.get("tertiary_color"));
  const is_hidden = parseHiddenFlag(formData);

  let logo_url: string | null = existing.logo_url;

  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `teams/${gerarNomeSeguro(ext)}`;

    const { error: uploadError } = await supabase.storage
      .from("logo")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      return { error: parseSupabaseError(uploadError.message) };
    }

    const { data: publicData } = supabase.storage
      .from("logo")
      .getPublicUrl(path);

    logo_url = publicData.publicUrl;
  }

  const { error: updateError } = await supabase
    .from("teams")
    .update({
      full_name,
      short_name,
      abbreviation,
      founded_year,
      gender,
      home_venue_id,
      parent_team_id,
      primary_color,
      secondary_color,
      tertiary_color,
      is_hidden,
      logo_url,
    })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (updateError) {
    return { error: parseSupabaseError(updateError.message) };
  }

  return { success: true };
}