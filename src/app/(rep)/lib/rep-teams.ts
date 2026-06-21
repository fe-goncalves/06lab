import type { SupabaseClient } from "@supabase/supabase-js";

export type RepNavEdition = {
  editionId: string;
  competitionName: string;
  seasonName: string;
  competitionLogoUrl: string | null;
};

export type RepNavTeam = {
  id: string;
  full_name: string;
  short_name: string | null;
  abbreviation: string | null;
  logo_url: string | null;
  editions: RepNavEdition[];
};

export async function getRepresentativeNavTeams(
  supabase: SupabaseClient,
  repId: string,
): Promise<RepNavTeam[]> {
  const { data: accessRows } = await supabase
    .from("representative_team_access")
    .select("team_id, teams(id, full_name, short_name, abbreviation, logo_url)")
    .eq("representative_id", repId);

  const teamMap = new Map<string, RepNavTeam>();
  const teamIds: string[] = [];

  for (const row of accessRows ?? []) {
    const team = row.teams as {
      id: string;
      full_name: string;
      short_name: string | null;
      abbreviation: string | null;
      logo_url: string | null;
    } | null;
    if (!team) continue;
    teamIds.push(team.id);
    teamMap.set(team.id, {
      id: team.id,
      full_name: team.full_name,
      short_name: team.short_name,
      abbreviation: team.abbreviation,
      logo_url: team.logo_url,
      editions: [],
    });
  }

  if (teamIds.length > 0) {
    const { data: editionTeams } = await supabase
      .from("edition_teams")
      .select(`
        team_id, edition_id,
        competition_editions(
          id,
          competitions(full_name, short_name, logo_url),
          seasons(name)
        )
      `)
      .in("team_id", teamIds);

    for (const et of editionTeams ?? []) {
      const card = teamMap.get(et.team_id as string);
      if (!card) continue;
      const edition = et.competition_editions as {
        id: string;
        competitions: { full_name: string; short_name: string | null; logo_url: string | null } | null;
        seasons: { name: string } | null;
      } | null;
      if (!edition) continue;
      card.editions.push({
        editionId: edition.id,
        competitionName:
          edition.competitions?.short_name
          ?? edition.competitions?.full_name
          ?? "Competição",
        seasonName: edition.seasons?.name ?? "—",
        competitionLogoUrl: edition.competitions?.logo_url ?? null,
      });
    }
  }

  return Array.from(teamMap.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "pt-BR"),
  );
}
