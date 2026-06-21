import { createClient } from "@/lib/supabase-server";
import { requireRepresentative, requireTeamAccess } from "@/app/(rep)/lib/rep-auth";
import { listarSolicitacoesPendentes } from "../../actions";
import TeamRosterClient, { type RosterMember } from "./team-roster-client";
import { rosterDisplayName } from "../../components/rep-ui";

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: teamId } = await params;
  const rep = await requireRepresentative();
  await requireTeamAccess(rep.id, teamId);

  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, full_name, short_name, abbreviation, logo_url")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) {
    return null;
  }

  const [{ data: athleteStints }, { data: staffStints }] = await Promise.all([
    supabase
      .from("athlete_team_stints")
      .select(`
        id,
        athletes(id, full_name, surname, photo_url, player_positions(full_name, abbreviation))
      `)
      .eq("team_id", teamId)
      .is("ended_at", null),
    supabase
      .from("staff_team_stints")
      .select(`
        id,
        staff_members(id, full_name, surname, photo_url, staff_roles(full_name))
      `)
      .eq("team_id", teamId)
      .is("ended_at", null),
  ]);

  const athletes: RosterMember[] = (athleteStints ?? [])
    .map(row => {
      const a = row.athletes as {
        id: string;
        full_name: string;
        surname: string | null;
        photo_url: string | null;
        player_positions: { full_name: string; abbreviation: string } | null;
      } | null;
      if (!a) return null;
      return {
        id: a.id,
        member_type: "athlete" as const,
        display_name: rosterDisplayName(a.full_name, a.surname),
        subtitle: a.player_positions?.full_name ?? "Atleta",
        photo_url: a.photo_url,
      };
    })
    .filter(Boolean) as RosterMember[];

  const staff: RosterMember[] = (staffStints ?? [])
    .map(row => {
      const s = row.staff_members as {
        id: string;
        full_name: string;
        surname: string | null;
        photo_url: string | null;
        staff_roles: { full_name: string } | null;
      } | null;
      if (!s) return null;
      return {
        id: s.id,
        member_type: "staff" as const,
        display_name: rosterDisplayName(s.full_name, s.surname),
        subtitle: s.staff_roles?.full_name ?? "Comissão",
        photo_url: s.photo_url,
      };
    })
    .filter(Boolean) as RosterMember[];

  const requestsResult = await listarSolicitacoesPendentes();
  const outgoing = "error" in requestsResult ? [] : requestsResult.outgoing;
  const counterparty = "error" in requestsResult ? [] : requestsResult.counterparty;

  return (
    <TeamRosterClient
      team={team}
      athletes={athletes}
      staff={staff}
      initialOutgoing={outgoing}
      initialCounterparty={counterparty}
    />
  );
}
