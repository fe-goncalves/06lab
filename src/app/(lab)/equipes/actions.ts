"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

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
  const file = formData.get("logo") as File | null;

  let logo_url: string | null = null;

  if (file && file.size > 0) {
    const safeFilename = file.name.replace(/[^\w.\-]/g, "_") || "logo";
    const path = `teams/${Date.now()}-${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("logo")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      return { error: uploadError.message };
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
      organization_id: profile.organization_id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: inserted.id };
}