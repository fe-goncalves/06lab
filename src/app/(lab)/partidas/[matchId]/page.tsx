import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import PartidaClient from "./partida-client";

export default async function PartidaPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const { data: match, error } = await supabase
    .from("matches")
    .select("*, phases(id, phase_type, half_duration_minutes, penalty_tiebreaker_type, edition_id, competition_editions!phases_edition_id_fkey(competition_id, competitions(full_name))), rounds(name, custom_label), teams_a:teams!matches_team_a_id_fkey(id, full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(id, full_name, abbreviation, logo_url)")
    .eq("id", matchId)
    .maybeSingle();

  if (error) return <div style={{ padding: 32, color: "red" }}>Erro ao carregar partida: {error.message}</div>;
  if (!match) return <div style={{ padding: 32, color: "white" }}>Partida não encontrada. ID: {matchId}</div>;

  const [
    { data: actions },
    { data: lineups },
    { data: venues },
    { data: matchReferees },
    { data: allReferees },
  ] = await Promise.all([
    supabase.from("match_actions")
      .select("*, primary_athlete:athletes!match_actions_primary_athlete_id_fkey(id, full_name, surname), secondary_athlete:athletes!match_actions_secondary_athlete_id_fkey(id, full_name, surname)")
      .eq("match_id", matchId).order("created_at"),
    supabase.from("match_lineups")
      .select("*, athletes(id, full_name, surname, position_id, player_positions(abbreviation))")
      .eq("match_id", matchId),
    supabase.from("venues")
      .select("id, full_name")
      .eq("organization_id", orgId).order("full_name"),
    supabase.from("match_referees")
      .select("id, referee_id, referee_role_id, referees(id, full_name, surname), referee_roles(id, full_name)")
      .eq("match_id", matchId),
    supabase.from("referees")
      .select("id, full_name, surname, referee_role_id")
      .eq("organization_id", orgId).order("full_name"),
  ]);

  if (match) (match as any).venues_list = venues ?? [];

  const editionId = match.phases?.edition_id;
  let editionTeamsWithAthletes: any[] = [];

  if (editionId && match.team_a_id && match.team_b_id) {
    const { data: etData } = await supabase
      .from("edition_teams")
      .select("id, team_id, edition_roster_entries(id, athlete_id, member_type, status, athletes(id, full_name, surname, position_id, player_positions(full_name, abbreviation, display_order)))")
      .eq("edition_id", editionId)
      .in("team_id", [match.team_a_id, match.team_b_id]);
    editionTeamsWithAthletes = etData ?? [];
  }

  return (
    <PartidaClient
      match={match}
      actions={actions ?? []}
      lineups={lineups ?? []}
      editionTeamsWithAthletes={editionTeamsWithAthletes}
      venues={venues ?? []}
      competitionId={match.phases?.competition_editions?.competition_id ?? ""}
      edicaoId={match.phases?.edition_id ?? ""}
      faseId={match.phases?.id ?? ""}
      matchReferees={matchReferees ?? []}
      allReferees={allReferees ?? []}
    />
  );
}