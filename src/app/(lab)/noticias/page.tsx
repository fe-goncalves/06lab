import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import NoticiasClient from "./noticias-client";

export const metadata = { title: "Notícias — 06.LAB" };

export default async function NoticiasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) redirect("/login");

  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, title, subtitle, cover_url, is_published, published_at, created_at, updated_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return <NoticiasClient articles={articles ?? []} />;
}
