import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import NoticiaFormClient from "./noticia-form-client";

type Props = { params: Promise<{ id: string }> };

export default async function NoticiaPage({ params }: Props) {
  const { id } = await params;
  const isNew = id === "novo";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) redirect("/login");

  const orgId = profile.organization_id;

  // Dados do artigo (null se novo)
  let article: {
    id: string;
    title: string;
    subtitle: string | null;
    cover_url: string | null;
    body: object;
    is_published: boolean;
  } | null = null;

  let initialTeamIds: string[] = [];
  let initialCompetitionIds: string[] = [];

  if (!isNew) {
    const { data } = await supabase
      .from("news_articles")
      .select("id, title, subtitle, cover_url, body, is_published, published_at")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!data) redirect("/noticias");
    article = data;

    const { data: teamTags } = await supabase
      .from("news_article_teams")
      .select("team_id")
      .eq("article_id", id);

    initialTeamIds = (teamTags ?? []).map((t) => t.team_id);

    const { data: compTags } = await supabase
      .from("news_article_competitions")
      .select("competition_id")
      .eq("article_id", id);

    initialCompetitionIds = (compTags ?? []).map((c) => c.competition_id);
  }

  // Equipes e competições da organização para os selects
  const { data: teams } = await supabase
    .from("teams")
    .select("id, full_name, abbreviation, logo_url")
    .eq("organization_id", orgId)
    .order("full_name");

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, full_name, short_name, logo_url")
    .eq("organization_id", orgId)
    .order("full_name");

  return (
    <NoticiaFormClient
      article={article}
      teams={teams ?? []}
      competitions={competitions ?? []}
      initialTeamIds={initialTeamIds}
      initialCompetitionIds={initialCompetitionIds}
    />
  );
}