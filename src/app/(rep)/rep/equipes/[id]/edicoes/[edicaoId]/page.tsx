import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireRepresentative, requireTeamAccess } from "@/app/(rep)/lib/rep-auth";
import { listarSolicitacoesPendentes } from "../../../../actions";
import EditionRosterClient, { type EditionRosterMember } from "./edition-roster-client";
import { rosterDisplayName } from "../../../../components/rep-ui";

export default async function EditionRosterPage({
  params,
}: {
  params: Promise<{ id: string; edicaoId: string }>;
}) {
  const { id: teamId, edicaoId } = await params;
  const rep = await requireRepresentative();
  await requireTeamAccess(rep.id, teamId);

  const supabase = await createClient();

  const [{ data: team }, { data: editionTeam }, { data: edition }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, full_name, short_name, abbreviation, logo_url")
      .eq("id", teamId)
      .maybeSingle(),
    supabase
      .from("edition_teams")
      .select("id")
      .eq("team_id", teamId)
      .eq("edition_id", edicaoId)
      .maybeSingle(),
    supabase
      .from("competition_editions")
      .select(`
        id,
        competitions(full_name, short_name, logo_url),
        seasons(name)
      `)
      .eq("id", edicaoId)
      .maybeSingle(),
  ]);

  if (!team || !editionTeam || !edition) {
    redirect("/rep");
  }

  const competition = edition.competitions as {
    full_name: string;
    short_name: string | null;
    logo_url: string | null;
  } | null;
  const season = edition.seasons as { name: string } | null;

  const [{ data: settings }, { data: rosterEntries }] = await Promise.all([
    supabase
      .from("edition_settings")
      .select("max_athletes")
      .eq("edition_id", edicaoId)
      .maybeSingle(),
    supabase
      .from("edition_roster_entries")
      .select(`
        id, member_type, athlete_id, staff_member_id,
        athletes(id, full_name, surname, photo_url, player_positions(full_name, abbreviation)),
        staff_members(id, full_name, surname, photo_url, staff_roles(full_name))
      `)
      .eq("edition_team_id", editionTeam.id)
      .eq("status", "approved"),
  ]);

  const roster: EditionRosterMember[] = (rosterEntries ?? []).map(entry => {
    if (entry.member_type === "athlete" && entry.athletes) {
      const a = entry.athletes as {
        id: string;
        full_name: string;
        surname: string | null;
        photo_url: string | null;
        player_positions: { full_name: string; abbreviation: string } | null;
      };
      return {
        rosterEntryId: entry.id as string,
        member_type: "athlete" as const,
        display_name: rosterDisplayName(a.full_name, a.surname),
        subtitle: a.player_positions?.full_name ?? "Atleta",
        photo_url: a.photo_url,
        athlete_id: a.id,
        staff_member_id: null,
      };
    }
    const s = entry.staff_members as {
      id: string;
      full_name: string;
      surname: string | null;
      photo_url: string | null;
      staff_roles: { full_name: string } | null;
    } | null;
    if (!s) return null;
    return {
      rosterEntryId: entry.id as string,
      member_type: "staff" as const,
      display_name: rosterDisplayName(s.full_name, s.surname),
      subtitle: s.staff_roles?.full_name ?? "Comissão",
      photo_url: s.photo_url,
      athlete_id: null,
      staff_member_id: s.id,
    };
  }).filter(Boolean) as EditionRosterMember[];

  const athleteCount = roster.filter(r => r.member_type === "athlete").length;
  const maxAthletes = settings?.max_athletes ?? null;
  const limitReached = maxAthletes != null && athleteCount >= maxAthletes;

  const requestsResult = await listarSolicitacoesPendentes();
  const outgoing = "error" in requestsResult ? [] : requestsResult.outgoing;
  const counterparty = "error" in requestsResult ? [] : requestsResult.counterparty;

  return (
    <EditionRosterClient
      team={team}
      edition={{
        id: edicaoId,
        competitionName: competition?.short_name ?? competition?.full_name ?? "Competição",
        seasonName: season?.name ?? "—",
        competitionLogoUrl: competition?.logo_url ?? null,
      }}
      roster={roster}
      athleteCount={athleteCount}
      maxAthletes={maxAthletes}
      limitReached={limitReached}
      initialOutgoing={outgoing}
      initialCounterparty={counterparty}
    />
  );
}
