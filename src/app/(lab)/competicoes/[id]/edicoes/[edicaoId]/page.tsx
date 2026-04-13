import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EdicaoClient from "./edicao-client";

export default async function EdicaoPage({
  params,
}: {
  params: Promise<{ id: string; edicaoId: string }>;
}) {
  const { id: competitionId, edicaoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [
    { data: edition, error },
    { data: settings },
    { data: windows },
    { data: editionTeams },
    { data: allTeams },
    { data: phases },
  ] = await Promise.all([
    supabase.from("competition_editions")
      .select("id, status, competition_id, season_id, seasons(name, years(value)), competitions(full_name, short_name, logo_url)")
      .eq("id", edicaoId).maybeSingle(),
    supabase.from("edition_settings")
      .select("*").eq("edition_id", edicaoId).maybeSingle(),
    supabase.from("edition_registration_windows")
      .select("id, opens_at, closes_at, is_active")
      .eq("edition_id", edicaoId).order("opens_at"),
    supabase.from("edition_teams")
      .select("id, team_id, arrival_origin, display_order, teams(id, full_name, logo_url, abbreviation)")
      .eq("edition_id", edicaoId).order("display_order"),
    supabase.from("teams")
      .select("id, full_name, abbreviation, logo_url")
      .eq("organization_id", orgId).order("full_name"),
    supabase.from("phases")
      .select("id, full_name, custom_label, phase_type, display_order, is_current")
      .eq("edition_id", edicaoId).order("display_order"),
  ]);

  if (error || !edition) redirect(`/competicoes/${competitionId}`);

  return (
    <EdicaoClient
      edition={edition as any}
      settings={settings}
      windows={windows ?? []}
      editionTeams={editionTeams ?? []}
      allTeams={allTeams ?? []}
      phases={phases ?? []}
      competitionId={competitionId}
    />
  );
}