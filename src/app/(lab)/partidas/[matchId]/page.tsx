// PAGE DE PARTIDAS

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
    .select("*, phases(id, phase_type, half_duration_minutes, penalty_tiebreaker_type, edition_id, competition_editions!phases_edition_id_fkey(competition_id, ratings_are_public, competitions(full_name))), rounds(name, custom_label), teams_a:teams!matches_team_a_id_fkey(id, full_name, short_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(id, full_name, short_name, abbreviation, logo_url)")
    .eq("id", matchId)
    .maybeSingle();

  if (error) return <div style={{ padding: 32, color: "red" }}>Erro ao carregar partida: {error.message}</div>;
  if (!match) return <div style={{ padding: 32, color: "white" }}>Partida não encontrada. ID: {matchId}</div>;

  const [
    { data: actions },
    { data: lineups },
    { data: staffLineups },
    { data: venues },
    { data: matchReferees },
    { data: allReferees },
    { data: matchRatings },
    { data: teamStats },
    { data: shootout },
  ] = await Promise.all([
    supabase.from("match_actions")
      .select("*, primary_athlete:athletes!match_actions_primary_athlete_id_fkey(id, full_name, surname), secondary_athlete:athletes!match_actions_secondary_athlete_id_fkey(id, full_name, surname)")
      .eq("match_id", matchId).order("created_at"),
    supabase.from("match_lineups")
      .select("*, athletes(id, full_name, surname, position_id, player_positions(abbreviation))")
      .eq("match_id", matchId),
    supabase.from("match_staff_lineups")
      .select("staff_member_id, is_present")
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
    supabase.from("match_athlete_ratings")
      .select("athlete_id, rating")
      .eq("match_id", matchId),
    supabase.from("match_team_stats")
      .select("team_id, period, fouls")
      .eq("match_id", matchId),
    supabase.from("match_penalty_shootout")
      .select("*")
      .eq("match_id", matchId)
      .order("kick_order"),
  ]);

  if (match) (match as any).venues_list = venues ?? [];

  const editionId = match.phases?.edition_id;
  let editionTeamsWithAthletes: any[] = [];

  if (editionId && match.team_a_id && match.team_b_id) {
    const { data: editionTeamsBasic } = await supabase
      .from("edition_teams")
      .select("id, team_id")
      .eq("edition_id", editionId)
      .in("team_id", [match.team_a_id, match.team_b_id]);

    const editionTeamIds = (editionTeamsBasic ?? []).map((et: any) => et.id);

    const [
      { data: rosterAthletes },
      { data: staffEntries },
    ] = await Promise.all([
      editionTeamIds.length > 0
        ? supabase
            .from("edition_roster_entries")
            .select(`
              edition_team_id,
              athlete_id,
              member_type,
              status,
              athletes (
                id, full_name, surname, photo_url,
                player_positions ( full_name, abbreviation, is_goalkeeper )
              )
            `)
            .in("edition_team_id", editionTeamIds)
            .eq("status", "approved")
            .eq("member_type", "athlete")
        : { data: [] },
      editionTeamIds.length > 0
        ? supabase
            .from("edition_roster_entries")
            .select("staff_member_id, edition_team_id, staff_members(id, full_name, surname, photo_url, staff_role_id)")
            .in("edition_team_id", editionTeamIds)
            .eq("member_type", "staff")
            .eq("status", "approved")
            .not("staff_member_id", "is", null)
        : { data: [] },
    ]);

    // Inicializa o mapa agrupado com todos os edition_teams
    const grouped: Record<string, { id: string; team_id: string; athletes: any[]; staffMembers: any[] }> = {};
    (editionTeamsBasic ?? []).forEach((et: any) => {
      grouped[et.id] = { id: et.id, team_id: et.team_id, athletes: [], staffMembers: [] };
    });

    // Popula atletas
    (rosterAthletes ?? []).forEach((entry: any) => {
      if (!entry.athletes) return;
      const bucket = grouped[entry.edition_team_id];
      if (!bucket) return;
      const a = entry.athletes;
      const pos = a.player_positions;
      bucket.athletes.push({
        id: a.id ?? entry.athlete_id,
        full_name: a.full_name,
        surname: a.surname,
        photo_url: a.photo_url,
        player_positions: pos ? {
          full_name: pos.full_name,
          abbreviation: pos.abbreviation,
        } : null,
      });
    });

    // Popula staff
    (staffEntries ?? []).forEach((entry: any) => {
      if (!entry.staff_members) return;
      const bucket = grouped[entry.edition_team_id];
      if (!bucket) return;
      bucket.staffMembers.push({
        id: entry.staff_members.id,
        full_name: entry.staff_members.full_name,
        surname: entry.staff_members.surname,
        photo_url: entry.staff_members.photo_url,
        staff_role_id: entry.staff_members.staff_role_id,
        edition_team_id: entry.edition_team_id,
      });
    });

    editionTeamsWithAthletes = Object.values(grouped);
  }

  return (
    <PartidaClient
      match={match}
      actions={actions ?? []}
      lineups={lineups ?? []}
      staffLineups={staffLineups ?? []}
      editionTeamsWithAthletes={editionTeamsWithAthletes}
      venues={venues ?? []}
      competitionId={match.phases?.competition_editions?.competition_id ?? ""}
      edicaoId={match.phases?.edition_id ?? ""}
      faseId={match.phases?.id ?? ""}
      matchReferees={matchReferees ?? []}
      allReferees={allReferees ?? []}
      initialRatings={matchRatings ?? []}
      initialTeamStats={teamStats ?? []}
      initialShootout={shootout ?? []}
    />
  );
}