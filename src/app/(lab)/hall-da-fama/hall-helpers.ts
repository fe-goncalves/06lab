import { createClient } from "@/lib/supabase-server";
import type { HallFiltros, TeamEntry } from "./actions";

export function resolveGenderDb(gender?: string): "male" | "female" | undefined {
  if (!gender) return undefined;
  if (gender === "M" || gender === "male") return "male";
  if (gender === "F" || gender === "female") return "female";
  return undefined;
}

export async function enriquecerAtletas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteIds: string[],
): Promise<Map<string, { full_name: string; surname: string | null; photo_url: string | null; team_name: string | null; team_logo: string | null; team_abbreviation: string | null }>> {
  if (athleteIds.length === 0) return new Map();

  const { data: athletesData } = await supabase
    .from("athletes")
    .select("id, full_name, surname, photo_url")
    .in("id", athleteIds);

  const { data: stintsData } = await supabase
    .from("athlete_team_stints")
    .select("athlete_id, teams(full_name, abbreviation, logo_url)")
    .in("athlete_id", athleteIds)
    .eq("is_current", true);

  const stintByAthlete = new Map<string, { full_name?: string; abbreviation?: string | null; logo_url?: string | null }>();
  for (const s of (stintsData ?? []) as { athlete_id: string; teams: { full_name?: string; abbreviation?: string | null; logo_url?: string | null } }[]) {
    stintByAthlete.set(s.athlete_id, s.teams);
  }

  const map = new Map<string, { full_name: string; surname: string | null; photo_url: string | null; team_name: string | null; team_logo: string | null; team_abbreviation: string | null }>();
  for (const a of (athletesData ?? []) as { id: string; full_name: string | null; surname: string | null; photo_url: string | null }[]) {
    const team = stintByAthlete.get(a.id);
    map.set(a.id, {
      full_name: a.full_name ?? "",
      surname: a.surname ?? null,
      photo_url: a.photo_url ?? null,
      team_name: team?.full_name ?? null,
      team_logo: team?.logo_url ?? null,
      team_abbreviation: team?.abbreviation ?? null,
    });
  }
  return map;
}

export async function todasEdicoesOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("competition_editions")
    .select("id, competitions!inner(organization_id)")
    .eq("competitions.organization_id", orgId);
  return (data ?? []).map((e: { id: string }) => e.id);
}

export async function phaseIdsDasEdicoes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  editionIds: string[],
): Promise<string[]> {
  if (editionIds.length === 0) return [];
  const { data } = await supabase
    .from("phases")
    .select("id")
    .in("edition_id", editionIds);
  return (data ?? []).map((p: { id: string }) => p.id);
}

export async function resolverEditionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  filtros: HallFiltros,
): Promise<string[] | null> {
  const temFiltro = filtros.competitionId || filtros.seasonId || filtros.gender || filtros.yearId;
  if (!temFiltro) return null;

  let query = supabase
    .from("competition_editions")
    .select("id, competitions!inner(gender, organization_id)")
    .eq("competitions.organization_id", orgId);

  if (filtros.competitionId) query = query.eq("competition_id", filtros.competitionId);
  if (filtros.seasonId) query = query.eq("season_id", filtros.seasonId);

  if (filtros.yearId) {
    const { data: yearSeasons } = await supabase
      .from("seasons")
      .select("id")
      .eq("organization_id", orgId)
      .eq("year_id", filtros.yearId);
    const yearSeasonIds = (yearSeasons ?? []).map((s: { id: string }) => s.id);
    if (yearSeasonIds.length === 0) return [];
    if (filtros.seasonId) {
      if (!yearSeasonIds.includes(filtros.seasonId)) return [];
    } else {
      query = query.in("season_id", yearSeasonIds);
    }
  }

  const genderDb = resolveGenderDb(filtros.gender);
  if (genderDb) query = query.eq("competitions.gender", genderDb);

  const { data } = await query;
  return (data ?? []).map((e: { id: string }) => e.id);
}

export function teamEntryFrom(
  teamId: string,
  team: { full_name?: string; short_name?: string | null; logo_url?: string | null; abbreviation?: string | null } | undefined,
  value: number,
  subtitle?: string | null,
): TeamEntry {
  return {
    team_id: teamId,
    full_name: team?.full_name ?? "",
    short_name: team?.short_name ?? null,
    abbreviation: team?.abbreviation ?? null,
    logo_url: team?.logo_url ?? null,
    value,
    subtitle,
  };
}
