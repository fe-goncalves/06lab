import type { createClient } from "@/lib/supabase-server";
import type {
  AthleteEntry,
  HallFiltros,
  StaffEntry,
  TeamEntry,
} from "./actions";
import {
  enriquecerAtletas,
  resolverEditionIds,
  resolveGenderDb,
  teamEntryFrom,
  todasEdicoesOrg,
} from "./hall-helpers";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface HallCtx {
  supabase: Supabase;
  orgId: string;
  filtros: HallFiltros;
  editionIds: string[] | null;
  usarCareerStats: boolean;
  genderDb: "male" | "female" | undefined;
}

export async function buildHallCtx(
  supabase: Supabase,
  orgId: string,
  filtros: HallFiltros,
): Promise<HallCtx> {
  const editionIds = await resolverEditionIds(supabase, orgId, filtros);
  const usarCareerStats = editionIds === null && !filtros.teamId;
  return {
    supabase,
    orgId,
    filtros,
    editionIds,
    usarCareerStats,
    genderDb: resolveGenderDb(filtros.gender),
  };
}

function athleteToEntry(
  athleteMap: Map<string, { full_name: string; surname: string | null; photo_url: string | null; team_name: string | null; team_logo: string | null; team_abbreviation: string | null }>,
  athleteId: string,
  value: number,
): AthleteEntry {
  const a = athleteMap.get(athleteId);
  return {
    athlete_id: athleteId,
    full_name: a?.full_name ?? "",
    surname: a?.surname ?? null,
    photo_url: a?.photo_url ?? null,
    team_name: a?.team_name ?? null,
    team_logo: a?.team_logo ?? null,
    team_abbreviation: a?.team_abbreviation ?? null,
    value,
  };
}

function isGoalkeeperRow(r: { athletes?: { player_positions?: { is_goalkeeper?: boolean } | { is_goalkeeper?: boolean }[] } }): boolean {
  const pp = r.athletes?.player_positions;
  if (Array.isArray(pp)) return pp.some((p) => p.is_goalkeeper);
  return pp?.is_goalkeeper === true;
}

async function editionIdsParaUsar(ctx: HallCtx): Promise<string[]> {
  return ctx.editionIds ?? await todasEdicoesOrg(ctx.supabase, ctx.orgId);
}

async function aggAthleteEditionStats(ctx: HallCtx) {
  const editionIds = await editionIdsParaUsar(ctx);
  if (editionIds.length === 0) return [];

  let statsQuery = ctx.supabase
    .from("athlete_edition_stats")
    .select("athlete_id, team_id, matches_played, goals, assists, yellow_cards, red_cards, motm_count, tots_count, totw_count, penalty_saves, avg_rating")
    .in("edition_id", editionIds);
  if (ctx.filtros.teamId) statsQuery = statsQuery.eq("team_id", ctx.filtros.teamId);

  const { data: statsData } = await statsQuery;
  let rows = (statsData ?? []) as {
    athlete_id: string;
    goals: number | null;
    assists: number | null;
    matches_played: number | null;
    yellow_cards: number | null;
    red_cards: number | null;
    motm_count: number | null;
    tots_count: number | null;
    totw_count: number | null;
    penalty_saves: number | null;
    avg_rating: number | null;
  }[];

  if (ctx.genderDb && rows.length > 0) {
    const athleteIds = [...new Set(rows.map((r) => r.athlete_id))];
    const { data: genderData } = await ctx.supabase.from("athletes").select("id").in("id", athleteIds).eq("gender", ctx.genderDb);
    const validIds = new Set((genderData ?? []).map((a: { id: string }) => a.id));
    rows = rows.filter((r) => validIds.has(r.athlete_id));
  }

  const agregado = new Map<string, {
    athlete_id: string;
    total_goals: number;
    total_assists: number;
    total_matches: number;
    total_yellow_cards: number;
    total_red_cards: number;
    total_motm: number;
    total_tots: number;
    total_totw: number;
    total_penalty_saves: number;
    rating_sum: number;
    rating_count: number;
  }>();

  for (const r of rows) {
    const key = r.athlete_id;
    if (!agregado.has(key)) {
      agregado.set(key, {
        athlete_id: key,
        total_goals: 0,
        total_assists: 0,
        total_matches: 0,
        total_yellow_cards: 0,
        total_red_cards: 0,
        total_motm: 0,
        total_tots: 0,
        total_totw: 0,
        total_penalty_saves: 0,
        rating_sum: 0,
        rating_count: 0,
      });
    }
    const e = agregado.get(key)!;
    e.total_goals += r.goals ?? 0;
    e.total_assists += r.assists ?? 0;
    e.total_matches += r.matches_played ?? 0;
    e.total_yellow_cards += r.yellow_cards ?? 0;
    e.total_red_cards += r.red_cards ?? 0;
    e.total_motm += r.motm_count ?? 0;
    e.total_tots += r.tots_count ?? 0;
    e.total_totw += r.totw_count ?? 0;
    e.total_penalty_saves += r.penalty_saves ?? 0;
    if (r.avg_rating != null) {
      e.rating_sum += r.avg_rating * (r.matches_played ?? 0);
      e.rating_count += r.matches_played ?? 0;
    }
  }

  return Array.from(agregado.values());
}

async function rankingFromCareerField(
  ctx: HallCtx,
  field: string,
  extraSelect = "",
): Promise<AthleteEntry[]> {
  let careerQuery = ctx.supabase
    .from("athlete_career_stats")
    .select(`
      athlete_id, ${field}${extraSelect ? `, ${extraSelect}` : ""},
      athletes!inner(id, gender, position_id, player_positions(is_goalkeeper))
    `)
    .eq("organization_id", ctx.orgId);
  if (ctx.genderDb) careerQuery = careerQuery.eq("athletes.gender", ctx.genderDb);

  const { data: careerData } = await careerQuery;
  const rows = (careerData ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const athleteMap = await enriquecerAtletas(ctx.supabase, rows.map((r) => r.athlete_id as string));
  return [...rows]
    .sort((a, b) => ((b[field] as number) ?? 0) - ((a[field] as number) ?? 0))
    .filter((r) => ((r[field] as number) ?? 0) > 0)
    .map((r) => athleteToEntry(athleteMap, r.athlete_id as string, r[field] as number));
}

async function rankingFromEditionField(ctx: HallCtx, field: keyof Awaited<ReturnType<typeof aggAthleteEditionStats>>[number]): Promise<AthleteEntry[]> {
  const aggRows = await aggAthleteEditionStats(ctx);
  if (aggRows.length === 0) return [];

  const athleteMap = await enriquecerAtletas(ctx.supabase, aggRows.map((r) => r.athlete_id));
  return [...aggRows]
    .sort((a, b) => (b[field] as number) - (a[field] as number))
    .filter((r) => (r[field] as number) > 0)
    .map((r) => athleteToEntry(athleteMap, r.athlete_id, r[field] as number));
}

async function fetchAwards(ctx: HallCtx): Promise<AthleteEntry[]> {
  const editionIds = await editionIdsParaUsar(ctx);
  if (editionIds.length === 0) return [];

  let awardsQuery = ctx.supabase
    .from("edition_awards")
    .select("athlete_id, athletes!inner(gender)")
    .in("edition_id", editionIds)
    .not("athlete_id", "is", null);
  if (ctx.genderDb) awardsQuery = awardsQuery.eq("athletes.gender", ctx.genderDb);

  const { data: allAwardsData } = await awardsQuery;
  const awardCounts = new Map<string, number>();
  for (const r of (allAwardsData ?? []) as { athlete_id: string | null }[]) {
    if (!r.athlete_id) continue;
    awardCounts.set(r.athlete_id, (awardCounts.get(r.athlete_id) ?? 0) + 1);
  }

  let awardEntries = [...awardCounts.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (ctx.filtros.teamId && awardEntries.length > 0) {
    const { data: teamAthletes } = await ctx.supabase
      .from("athlete_edition_stats")
      .select("athlete_id")
      .in("edition_id", editionIds)
      .eq("team_id", ctx.filtros.teamId);
    const validIds = new Set((teamAthletes ?? []).map((a: { athlete_id: string }) => a.athlete_id));
    awardEntries = awardEntries.filter(([id]) => validIds.has(id));
  }

  if (awardEntries.length === 0) return [];
  const athleteMap = await enriquecerAtletas(ctx.supabase, awardEntries.map(([id]) => id));
  return awardEntries.map(([id, count]) => athleteToEntry(athleteMap, id, count));
}

async function fetchGoalAssist(ctx: HallCtx): Promise<AthleteEntry[]> {
  if (ctx.usarCareerStats) {
    let careerQuery = ctx.supabase
      .from("athlete_career_stats")
      .select("athlete_id, total_goals, total_assists, athletes!inner(id, gender)")
      .eq("organization_id", ctx.orgId);
    if (ctx.genderDb) careerQuery = careerQuery.eq("athletes.gender", ctx.genderDb);
    const { data } = await careerQuery;
    const rows = (data ?? []) as { athlete_id: string; total_goals: number | null; total_assists: number | null }[];
    const filtered = rows
      .map((r) => ({ r, v: (r.total_goals ?? 0) + (r.total_assists ?? 0) }))
      .filter(({ v }) => v > 0)
      .sort((a, b) => b.v - a.v);
    if (filtered.length === 0) return [];
    const athleteMap = await enriquecerAtletas(ctx.supabase, filtered.map(({ r }) => r.athlete_id));
    return filtered.map(({ r, v }) => athleteToEntry(athleteMap, r.athlete_id, v));
  }
  const aggRows = await aggAthleteEditionStats(ctx);
  const filtered = aggRows
    .map((r) => ({ r, v: r.total_goals + r.total_assists }))
    .filter(({ v }) => v > 0)
    .sort((a, b) => b.v - a.v);
  if (filtered.length === 0) return [];
  const athleteMap = await enriquecerAtletas(ctx.supabase, filtered.map(({ r }) => r.athlete_id));
  return filtered.map(({ r, v }) => athleteToEntry(athleteMap, r.athlete_id, v));
}

async function fetchCleanSheets(ctx: HallCtx): Promise<AthleteEntry[]> {
  if (!ctx.usarCareerStats) return [];
  let careerQuery = ctx.supabase
    .from("athlete_career_stats")
    .select("athlete_id, total_clean_sheets, athletes!inner(id, gender, position_id, player_positions(is_goalkeeper))")
    .eq("organization_id", ctx.orgId);
  if (ctx.genderDb) careerQuery = careerQuery.eq("athletes.gender", ctx.genderDb);
  const { data } = await careerQuery;
  const rows = (data ?? []) as { athlete_id: string; total_clean_sheets: number | null; athletes?: { player_positions?: { is_goalkeeper?: boolean } | { is_goalkeeper?: boolean }[] } }[];
  const filtered = rows
    .filter((r) => isGoalkeeperRow(r) && (r.total_clean_sheets ?? 0) > 0)
    .sort((a, b) => (b.total_clean_sheets ?? 0) - (a.total_clean_sheets ?? 0));
  if (filtered.length === 0) return [];
  const athleteMap = await enriquecerAtletas(ctx.supabase, filtered.map((r) => r.athlete_id));
  return filtered.map((r) => athleteToEntry(athleteMap, r.athlete_id, r.total_clean_sheets ?? 0));
}

async function fetchHatTricks(ctx: HallCtx): Promise<AthleteEntry[]> {
  if (ctx.usarCareerStats) {
    return rankingFromCareerField(ctx, "total_hat_tricks");
  }
  const editionIds = await editionIdsParaUsar(ctx);
  if (editionIds.length === 0) return [];

  let q = ctx.supabase
    .from("athlete_match_achievements")
    .select("athlete_id")
    .eq("achievement_type", "hat_trick")
    .in("edition_id", editionIds);
  if (ctx.filtros.teamId) q = q.eq("team_id", ctx.filtros.teamId);
  const { data } = await q;
  return contarAchievementsPorAtleta(ctx, data ?? []);
}

async function contarAchievementsPorAtleta(ctx: HallCtx, rows: { athlete_id: string }[]): Promise<AthleteEntry[]> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.athlete_id, (counts.get(r.athlete_id) ?? 0) + 1);
  }
  let entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ctx.genderDb && entries.length > 0) {
    const ids = entries.map(([id]) => id);
    const { data: gd } = await ctx.supabase.from("athletes").select("id").in("id", ids).eq("gender", ctx.genderDb);
    const validIds = new Set((gd ?? []).map((a: { id: string }) => a.id));
    entries = entries.filter(([id]) => validIds.has(id));
  }
  if (entries.length === 0) return [];
  const athleteMap = await enriquecerAtletas(ctx.supabase, entries.map(([id]) => id));
  return entries.map(([id, count]) => athleteToEntry(athleteMap, id, count));
}

async function fetchBestMatchGoals(ctx: HallCtx): Promise<AthleteEntry[]> {
  const editionIds = await editionIdsParaUsar(ctx);
  if (editionIds.length === 0) return [];

  let bmgQuery = ctx.supabase
    .from("athlete_match_achievements")
    .select("athlete_id, value")
    .in("achievement_type", ["hat_trick", "poker", "manita"])
    .in("edition_id", editionIds);
  if (ctx.filtros.teamId) bmgQuery = bmgQuery.eq("team_id", ctx.filtros.teamId);

  const { data: bmgData } = await bmgQuery;
  const maxByAthlete = new Map<string, number>();
  for (const r of (bmgData ?? []) as { athlete_id: string; value: number | null }[]) {
    const cur = maxByAthlete.get(r.athlete_id) ?? 0;
    if ((r.value ?? 0) > cur) maxByAthlete.set(r.athlete_id, r.value ?? 0);
  }

  let bmgEntries = [...maxByAthlete.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (ctx.genderDb && bmgEntries.length > 0) {
    const { data: gd } = await ctx.supabase.from("athletes").select("id").in("id", bmgEntries.map(([id]) => id)).eq("gender", ctx.genderDb);
    const validIds = new Set((gd ?? []).map((a: { id: string }) => a.id));
    bmgEntries = bmgEntries.filter(([id]) => validIds.has(id));
  }
  if (bmgEntries.length === 0) return [];
  const athleteMap = await enriquecerAtletas(ctx.supabase, bmgEntries.map(([id]) => id));
  return bmgEntries.map(([id, val]) => athleteToEntry(athleteMap, id, val));
}

async function fetchTeamEditionAgg(ctx: HallCtx) {
  const editionIds = await editionIdsParaUsar(ctx);
  if (editionIds.length === 0) return { editionIds, aggArr: [] as { team_id: string; total_matches: number; total_wins: number; total_draws: number; total_goals: number; team: { full_name: string; abbreviation: string | null; logo_url: string | null } }[] };

  let teamStatsQuery = ctx.supabase
    .from("team_edition_stats")
    .select("team_id, matches_played, wins, draws, goals_scored")
    .in("edition_id", editionIds);
  if (ctx.filtros.teamId) teamStatsQuery = teamStatsQuery.eq("team_id", ctx.filtros.teamId);

  const { data: teamStatsData } = await teamStatsQuery;
  const teamAgg = new Map<string, { total_matches: number; total_wins: number; total_draws: number; total_goals: number }>();
  for (const r of (teamStatsData ?? []) as { team_id: string; matches_played: number | null; wins: number | null; draws: number | null; goals_scored: number | null }[]) {
    if (!teamAgg.has(r.team_id)) teamAgg.set(r.team_id, { total_matches: 0, total_wins: 0, total_draws: 0, total_goals: 0 });
    const e = teamAgg.get(r.team_id)!;
    e.total_matches += r.matches_played ?? 0;
    e.total_wins += r.wins ?? 0;
    e.total_draws += r.draws ?? 0;
    e.total_goals += r.goals_scored ?? 0;
  }

  const teamIds = Array.from(teamAgg.keys());
  let teamsQuery = ctx.supabase.from("teams").select("id, full_name, abbreviation, logo_url, gender").in("id", teamIds).eq("organization_id", ctx.orgId).eq("is_virtual", false);
  if (ctx.genderDb) teamsQuery = teamsQuery.eq("gender", ctx.genderDb);
  const { data: teamsData } = await teamsQuery;
  const teamsMap = new Map((teamsData ?? []).map((t: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null }) => [t.id, t]));

  const aggArr = Array.from(teamAgg.entries())
    .filter(([id]) => teamsMap.has(id))
    .map(([id, stats]) => ({ team_id: id, ...stats, team: teamsMap.get(id)! }));

  return { editionIds, aggArr };
}

async function fetchTeamTitles(ctx: HallCtx): Promise<TeamEntry[]> {
  const { editionIds } = await fetchTeamEditionAgg(ctx);
  if (editionIds.length === 0) return [];

  const { data: awardsData } = await ctx.supabase
    .from("edition_awards")
    .select("award_type, winning_team_id, athlete_id, staff_member_id")
    .in("award_type", ["champion", "runner_up", "third_place"])
    .in("edition_id", editionIds)
    .not("winning_team_id", "is", null);

  let awardRows = (awardsData ?? []).filter(
    (a) => a.athlete_id === null && a.staff_member_id === null,
  ) as { award_type: string; winning_team_id: string }[];

  if (ctx.genderDb && awardRows.length > 0) {
    const awardTeamIds = [...new Set(awardRows.map((a) => a.winning_team_id).filter(Boolean))];
    const { data: genderTeams } = await ctx.supabase.from("teams").select("id").in("id", awardTeamIds).eq("gender", ctx.genderDb).eq("is_virtual", false);
    const validTeamIds = new Set((genderTeams ?? []).map((t: { id: string }) => t.id));
    awardRows = awardRows.filter((a) => validTeamIds.has(a.winning_team_id));
  }

  const tituloCount = new Map<string, number>();
  for (const a of awardRows) {
    if (!a.winning_team_id || a.award_type !== "champion") continue;
    tituloCount.set(a.winning_team_id, (tituloCount.get(a.winning_team_id) ?? 0) + 1);
  }

  const teamIds = [...tituloCount.keys()];
  if (teamIds.length === 0) return [];
  const { data: teamsData } = await ctx.supabase.from("teams").select("id, full_name, abbreviation, logo_url").in("id", teamIds).eq("organization_id", ctx.orgId).eq("is_virtual", false);
  const teamsMap = new Map((teamsData ?? []).map((t: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null }) => [t.id, t]));

  return [...tituloCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .map(([id, count]) => teamEntryFrom(id, teamsMap.get(id), count));
}

async function fetchWinStreak(ctx: HallCtx): Promise<TeamEntry[]> {
  const editionIds = await editionIdsParaUsar(ctx);
  if (editionIds.length === 0) return [];

  let winStreakQuery = ctx.supabase
    .from("view_team_winning_streaks")
    .select("team_id, edition_id, max_winning_streak")
    .in("edition_id", editionIds)
    .order("max_winning_streak", { ascending: false })
    .limit(10);
  if (ctx.filtros.teamId) winStreakQuery = winStreakQuery.eq("team_id", ctx.filtros.teamId);

  const { data } = await winStreakQuery;
  const rows = (data ?? []) as { team_id: string; edition_id: string; max_winning_streak: number | null }[];
  const filtered = rows.filter((r) => (r.max_winning_streak ?? 0) > 0);
  if (filtered.length === 0) return [];

  const streakTeamIds = [...new Set(filtered.map((r) => r.team_id))];
  const streakEditionIds = [...new Set(filtered.map((r) => r.edition_id))];

  const [teamsRes, editionsRes] = await Promise.all([
    ctx.supabase.from("teams").select("id, full_name, abbreviation, logo_url").in("id", streakTeamIds).eq("is_virtual", false),
    ctx.supabase.from("competition_editions").select("id, competitions(short_name, full_name), seasons(name)").in("id", streakEditionIds),
  ]);

  const teamsMap = new Map((teamsRes.data ?? []).map((t: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null }) => [t.id, t]));
  const editionsMap = new Map((editionsRes.data ?? []).map((e: { id: string; competitions?: { short_name?: string; full_name?: string }; seasons?: { name?: string } }) => {
    const compName = e.competitions?.short_name ?? e.competitions?.full_name ?? "";
    const seasonName = e.seasons?.name ?? "";
    return [e.id, [compName, seasonName].filter(Boolean).join(" · ") || null];
  }));

  return filtered.map((r) => {
    const t = teamsMap.get(r.team_id);
    const subtitle = editionsMap.get(r.edition_id) ?? null;
    return teamEntryFrom(r.team_id, t, r.max_winning_streak ?? 0, subtitle);
  });
}

async function fetchStaffByField(ctx: HallCtx, field: string): Promise<StaffEntry[]> {
  if (!ctx.usarCareerStats) {
    const editionIds = await editionIdsParaUsar(ctx);
    if (editionIds.length === 0) return [];

    const fieldMap: Record<string, (e: { titles: number; coach: number; matches: number; motw: number }) => number> = {
      total_titles: (e) => e.titles,
      total_wins: () => 0,
      total_matches_attended: (e) => e.matches,
    };
    const getter = fieldMap[field];
    if (!getter) return [];

    let seQuery = ctx.supabase
      .from("staff_edition_stats")
      .select("staff_member_id, total_titles, matches_attended, motw_count, best_coach_count, staff_members!inner(full_name, surname, photo_url, gender)")
      .in("edition_id", editionIds);
    if (ctx.genderDb) seQuery = seQuery.eq("staff_members.gender", ctx.genderDb);

    const { data: seData } = await seQuery;
    const agg = new Map<string, { titles: number; coach: number; matches: number; motw: number; staff: { full_name: string; surname: string | null; photo_url: string | null } }>();
    for (const r of (seData ?? []) as { staff_member_id: string; total_titles: number | null; matches_attended: number | null; motw_count: number | null; best_coach_count: number | null; staff_members: { full_name: string; surname: string | null; photo_url: string | null } }[]) {
      if (!agg.has(r.staff_member_id)) {
        agg.set(r.staff_member_id, { titles: 0, coach: 0, matches: 0, motw: 0, staff: r.staff_members });
      }
      const e = agg.get(r.staff_member_id)!;
      e.titles += r.total_titles ?? 0;
      e.coach += r.best_coach_count ?? 0;
      e.matches += r.matches_attended ?? 0;
      e.motw += r.motw_count ?? 0;
    }

    return [...agg.entries()]
      .map(([id, e]) => ({ id, e, value: getter(e) }))
      .filter(({ value }) => value > 0)
      .sort((a, b) => b.value - a.value)
      .map(({ id, e, value }) => ({
        staff_member_id: id,
        full_name: e.staff?.full_name ?? "",
        surname: e.staff?.surname ?? null,
        photo_url: e.staff?.photo_url ?? null,
        value,
      }));
  }

  let scQuery = ctx.supabase
    .from("staff_career_stats")
    .select(`staff_member_id, ${field}, staff_members!inner(full_name, surname, photo_url, gender)`)
    .eq("organization_id", ctx.orgId);
  if (ctx.genderDb) scQuery = scQuery.eq("staff_members.gender", ctx.genderDb);

  const { data: scData } = await scQuery;
  const rows = (scData ?? []) as { staff_member_id: string; staff_members: { full_name: string; surname: string | null; photo_url: string | null } }[] & Record<string, number>[];
  return [...rows]
    .sort((a, b) => ((b[field] as number) ?? 0) - ((a[field] as number) ?? 0))
    .filter((r) => ((r[field] as number) ?? 0) > 0)
    .map((r) => ({
      staff_member_id: r.staff_member_id,
      full_name: r.staff_members?.full_name ?? "",
      surname: r.staff_members?.surname ?? null,
      photo_url: r.staff_members?.photo_url ?? null,
      value: r[field] as number,
    }));
}

const CAREER_ATHLETE_FIELDS: Record<string, string> = {
  goals: "total_goals",
  assists: "total_assists",
  matches: "total_matches",
  yellow_cards: "total_yellow_cards",
  red_cards: "total_red_cards",
  motm: "total_motm",
  tots: "total_tots",
  titles: "total_titles",
  penalty_goals: "total_penalties_scored",
  shootout_goals: "total_shootouts_scored",
  penalty_saves: "total_penalty_saves",
};

const EDITION_ATHLETE_FIELDS: Record<string, "total_goals" | "total_assists" | "total_matches" | "total_yellow_cards" | "total_red_cards" | "total_motm" | "total_tots" | "total_penalty_saves"> = {
  goals: "total_goals",
  assists: "total_assists",
  matches: "total_matches",
  yellow_cards: "total_yellow_cards",
  red_cards: "total_red_cards",
  motm: "total_motm",
  tots: "total_tots",
  penalty_saves: "total_penalty_saves",
};

export async function queryCategoria(
  ctx: HallCtx,
  categoryKey: string,
): Promise<AthleteEntry[] | TeamEntry[] | StaffEntry[]> {
  switch (categoryKey) {
    case "goals":
    case "assists":
    case "matches":
    case "yellow_cards":
    case "red_cards":
    case "motm":
    case "tots":
    case "titles":
    case "penalty_goals":
    case "shootout_goals":
    case "penalty_saves":
      if (ctx.usarCareerStats) {
        return rankingFromCareerField(ctx, CAREER_ATHLETE_FIELDS[categoryKey]);
      }
      if (EDITION_ATHLETE_FIELDS[categoryKey]) {
        return rankingFromEditionField(ctx, EDITION_ATHLETE_FIELDS[categoryKey]);
      }
      return [];

    case "awards":
      return fetchAwards(ctx);

    case "goal_assist":
      return fetchGoalAssist(ctx);

    case "clean_sheets":
      return fetchCleanSheets(ctx);

    case "hat_tricks":
      return fetchHatTricks(ctx);

    case "best_match_goals":
      return fetchBestMatchGoals(ctx);

    case "shootout_saves":
      return [];

    case "team_titles":
      return fetchTeamTitles(ctx);

    case "team_wins": {
      const { aggArr } = await fetchTeamEditionAgg(ctx);
      return [...aggArr].filter((t) => t.total_wins > 0).sort((a, b) => b.total_wins - a.total_wins).map((t) => teamEntryFrom(t.team_id, t.team, t.total_wins));
    }

    case "team_matches": {
      const { aggArr } = await fetchTeamEditionAgg(ctx);
      return [...aggArr].filter((t) => t.total_matches > 0).sort((a, b) => b.total_matches - a.total_matches).map((t) => teamEntryFrom(t.team_id, t.team, t.total_matches));
    }

    case "team_goals": {
      const { aggArr } = await fetchTeamEditionAgg(ctx);
      return [...aggArr].filter((t) => t.total_goals > 0).sort((a, b) => b.total_goals - a.total_goals).map((t) => teamEntryFrom(t.team_id, t.team, t.total_goals));
    }

    case "team_points": {
      const { aggArr } = await fetchTeamEditionAgg(ctx);
      return [...aggArr]
        .map((t) => ({ t, pts: t.total_wins * 3 + t.total_draws }))
        .filter(({ pts }) => pts > 0)
        .sort((a, b) => b.pts - a.pts)
        .map(({ t, pts }) => teamEntryFrom(t.team_id, t.team, pts));
    }

    case "win_streak":
      return fetchWinStreak(ctx);

    case "staff_titles":
      return fetchStaffByField(ctx, "total_titles");

    case "staff_wins":
      return fetchStaffByField(ctx, "total_wins");

    case "staff_matches":
      return fetchStaffByField(ctx, "total_matches_attended");

    default:
      return [];
  }
}
