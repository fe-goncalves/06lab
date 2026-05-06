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
    .select("*, phases(id, phase_type, half_duration_minutes, penalty_tiebreaker_type, edition_id, competition_editions!phases_edition_id_fkey(competition_id, competitions(full_name, logo_url))), rounds(name, custom_label), teams_a:teams!matches_team_a_id_fkey(id, full_name, short_name, abbreviation, logo_url, primary_color), teams_b:teams!matches_team_b_id_fkey(id, full_name, short_name, abbreviation, logo_url, primary_color)")
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
    { data: teamStats },
    { data: shootoutData },
  ] = await Promise.all([
    supabase.from("match_actions")
      .select("*, primary_athlete:athletes!match_actions_primary_athlete_id_fkey(id, full_name, surname, photo_url), secondary_athlete:athletes!match_actions_secondary_athlete_id_fkey(id, full_name, surname)")
      .eq("match_id", matchId).order("minute", { ascending: true }),
    supabase.from("match_lineups")
      .select("*, athletes(id, full_name, surname, photo_url, position_id, player_positions(abbreviation, full_name))")
      .eq("match_id", matchId),
    supabase.from("venues")
      .select("id, full_name")
      .eq("organization_id", orgId).order("full_name"),
    supabase.from("match_referees")
      .select("id, referee_id, referee_role_id, referees(id, full_name, surname, photo_url), referee_roles(id, full_name)")
      .eq("match_id", matchId),
    supabase.from("referees")
      .select("id, full_name, surname, photo_url, referee_role_id")
      .eq("organization_id", orgId).order("full_name"),
    supabase.from("match_team_stats")
      .select("*")
      .eq("match_id", matchId),
    supabase.from("match_penalty_shootout")
      .select("*, athlete:athletes!match_penalty_shootout_athlete_id_fkey(id, full_name, surname, photo_url), goalkeeper:athletes!match_penalty_shootout_goalkeeper_id_fkey(id, full_name, surname)")
      .eq("match_id", matchId).order("kick_order", { ascending: true }),
  ]);

  if (match) (match as any).venues_list = venues ?? [];

  const editionId = match.phases?.edition_id;
  let editionTeamsWithAthletes: any[] = [];

  if (editionId && match.team_a_id && match.team_b_id && match.match_date) {
    const { data: eligibleAthletes } = await supabase.rpc("get_eligible_athletes_for_match", {
      p_edition_id: editionId,
      p_team_ids: [match.team_a_id, match.team_b_id],
      p_match_date: match.match_date,
    });

    // Reagrupa no formato esperado pelo client
    const grouped: Record<string, { id: string; team_id: string; athletes: any[] }> = {};
    (eligibleAthletes ?? []).forEach((row: any) => {
      if (!grouped[row.edition_team_id]) {
        grouped[row.edition_team_id] = {
          id: row.edition_team_id,
          team_id: row.team_id,
          athletes: [],
        };
      }
      grouped[row.edition_team_id].athletes.push({
        id: row.athlete_id,
        full_name: row.full_name,
        surname: row.surname,
        photo_url: row.photo_url,
        position_id: row.position_id,
        player_positions: row.position_full_name ? {
          full_name: row.position_full_name,
          abbreviation: row.position_abbreviation,
          display_order: row.position_display_order,
        } : null,
      });
    });
    editionTeamsWithAthletes = Object.values(grouped);
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
      initialTeamStats={teamStats ?? []}
      initialShootout={shootoutData ?? []}
    />
  );
}