import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ConfiguracoesClient from "./configuracoes-client";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role, full_name, id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "main") redirect("/");

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, custom_domain, status, logo_url, primary_color, secondary_color, tertiary_color, description, instagram_url, youtube_url, tiktok_url, twitter_url",
    )
    .eq("id", profile?.organization_id ?? "")
    .maybeSingle();

  return (
    <ConfiguracoesClient org={org} userProfile={profile} />
  );
}