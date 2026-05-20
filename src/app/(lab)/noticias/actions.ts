"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function salvarNoticia(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const id = formData.get("id") as string | null;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Título é obrigatório." };

  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const bodyRaw = String(formData.get("body") ?? "{}");
  const is_published = formData.get("is_published") === "true";

  let body: object;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    body = {};
  }

  // Upload de capa
  const coverFile = formData.get("cover") as File | null;
  let cover_url: string | null = (formData.get("cover_url_existing") as string | null) || null;

  if (coverFile && coverFile.size > 0) {
    const safe = coverFile.name.replace(/[^\w.\-]/g, "_") || "cover";
    const path = `covers/${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("news")
      .upload(path, coverFile, { contentType: coverFile.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("news").getPublicUrl(path);
    cover_url = pub.publicUrl;
  }

  // published_at: só define na primeira publicação
  let published_at: string | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("news_articles")
      .select("published_at, is_published")
      .eq("id", id)
      .maybeSingle();
    published_at = existing?.published_at ?? null;
    if (is_published && !published_at) {
      published_at = new Date().toISOString();
    }
  } else {
    if (is_published) published_at = new Date().toISOString();
  }

  // Upsert do artigo
  const payload = {
    organization_id: profile.organization_id,
    title,
    subtitle,
    cover_url,
    body,
    is_published,
    published_at,
    created_by: profile.id,
  };

  let articleId: string;

  if (id) {
    const { error } = await supabase
      .from("news_articles")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", profile.organization_id);
    if (error) return { error: error.message };
    articleId = id;
  } else {
    const { data: inserted, error } = await supabase
      .from("news_articles")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    articleId = inserted.id;
  }

  // Sincronizar tags de equipes
  const teamIds = formData.getAll("team_ids") as string[];
  await supabase.from("news_article_teams").delete().eq("article_id", articleId);
  if (teamIds.length > 0) {
    await supabase.from("news_article_teams").insert(
      teamIds.map((team_id) => ({ article_id: articleId, team_id }))
    );
  }

  // Sincronizar tags de competições
  const competitionIds = formData.getAll("competition_ids") as string[];
  await supabase.from("news_article_competitions").delete().eq("article_id", articleId);
  if (competitionIds.length > 0) {
    await supabase.from("news_article_competitions").insert(
      competitionIds.map((competition_id) => ({ article_id: articleId, competition_id }))
    );
  }

  revalidatePath("/noticias");
  revalidatePath(`/noticias/${articleId}`);
  return { id: articleId };
}

export async function excluirNoticia(id: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const { error } = await supabase
    .from("news_articles")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/noticias");
  return { success: true };
}