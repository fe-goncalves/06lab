import type { SupabaseClient } from "@supabase/supabase-js";

export type RankingRow = {
  team_id: string;
  team_name: string;
  short_name: string | null;
  logo_url: string | null;
  total_points: number;
};

type RankingConfig = Record<string, number>;

type PhaseBucket = "classification" | "knockout";

type MatchTally = { wins: number; draws: number; losses: number; played: number };

const CLASSIFICATION_PHASES = new Set(["round_robin", "group_stage"]);
const KNOCKOUT_PHASES = new Set(["knockout", "conference"]);

const AWARD_TYPE_TO_RANKING_CATEGORY: Record<string, string> = {
  champion: "first_place",
  runner_up: "second_place",
  third_place: "third_place",
  fourth_place: "fourth_place",
  fifth_place: "fifth_to_eighth",
  sixth_place: "fifth_to_eighth",
  seventh_place: "fifth_to_eighth",
  eighth_place: "fifth_to_eighth",
  ninth_place: "ninth_plus",
  tenth_place: "ninth_plus",
  eleventh_place: "ninth_plus",
  twelfth_place: "ninth_plus",
  thirteenth_place: "ninth_plus",
  fourteenth_place: "ninth_plus",
  fifteenth_place: "ninth_plus",
  sixteenth_place: "ninth_plus",
  seventeenth_place: "ninth_plus",
  eighteenth_place: "ninth_plus",
  nineteenth_place: "ninth_plus",
  twentieth_place: "ninth_plus",
  twenty_first_or_more: "ninth_plus",
};

function normalizeGender(gender: string | null | undefined): "male" | "female" | "other" {
  const g = (gender ?? "").trim().toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "male";
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "other";
}

function genderMatches(filter: string, dbGender: string | null | undefined): boolean {
  return normalizeGender(filter) === normalizeGender(dbGender);
}

function phaseBucket(phaseType: string): PhaseBucket | null {
  if (CLASSIFICATION_PHASES.has(phaseType)) return "classification";
  if (KNOCKOUT_PHASES.has(phaseType)) return "knockout";
  return null;
}

function addPoints(
  target: Map<string, number>,
  teamId: string,
  points: number,
) {
  if (!teamId || points <= 0) return;
  target.set(teamId, (target.get(teamId) ?? 0) + points);
}

function tallyMatch(teamId: string, scoreFor: number | null, scoreAgainst: number | null): "w" | "d" | "l" | null {
  if (!teamId || scoreFor == null || scoreAgainst == null) return null;
  if (scoreFor > scoreAgainst) return "w";
  if (scoreFor < scoreAgainst) return "l";
  return "d";
}

export async function calculateRanking(
  supabase: SupabaseClient,
  organizationId: string,
  gender: string,
  sportSlug: string,
): Promise<RankingRow[]> {
  const { data: competitions, error: compError } = await supabase
    .from("competitions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("gender", gender)
    .eq("sport_slug", sportSlug);

  if (compError) throw new Error(compError.message);

  const competitionIds = (competitions ?? []).map((c) => c.id as string);
  if (competitionIds.length === 0) return [];

  const { data: editions, error: editionError } = await supabase
    .from("competition_editions")
    .select("id, season_id, seasons(year_id)")
    .in("competition_id", competitionIds);

  if (editionError) throw new Error(editionError.message);

  const editionRows = editions ?? [];
  const editionIds = editionRows.map((e) => e.id as string);
  if (editionIds.length === 0) return [];

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, full_name, short_name, logo_url, gender, is_virtual")
    .eq("organization_id", organizationId)
    .eq("is_virtual", false);

  if (teamsError) throw new Error(teamsError.message);

  const teamMap = new Map(
    (teams ?? [])
      .filter((t) => genderMatches(gender, t.gender as string | null))
      .map((t) => [t.id as string, t]),
  );

  const pointEntries: {
    organization_id: string;
    team_id: string;
    edition_id: string;
    season_id: string;
    year_id: string;
    category_code: string;
    points_earned: number;
  }[] = [];

  const totalsByTeam = new Map<string, number>();

  for (const edition of editionRows) {
    const editionId = edition.id as string;
    const seasonId = edition.season_id as string;
    const yearId = (edition.seasons as { year_id?: string } | null)?.year_id;
    if (!seasonId || !yearId) continue;

    const [
      { data: configRows },
      { data: editionTeams },
      { data: phases },
      { data: awardsRows },
    ] = await Promise.all([
      supabase
        .from("edition_ranking_config")
        .select("category_code, points_value")
        .eq("edition_id", editionId),
      supabase
        .from("edition_teams")
        .select("team_id, is_free_agent_pool, is_active")
        .eq("edition_id", editionId),
      supabase
        .from("phases")
        .select("id, phase_type")
        .eq("edition_id", editionId),
      supabase
        .from("edition_awards")
        .select("award_type, winning_team_id")
        .eq("edition_id", editionId)
        .is("athlete_id", null)
        .is("staff_member_id", null)
        .not("winning_team_id", "is", null),
    ]);

    const config: RankingConfig = Object.fromEntries(
      (configRows ?? []).map((row) => [row.category_code as string, row.points_value as number]),
    );
    if (Object.keys(config).length === 0) continue;

    const activeTeamIds = new Set(
      (editionTeams ?? [])
        .filter((row) => row.is_active !== false && row.is_free_agent_pool !== true)
        .map((row) => row.team_id as string)
        .filter((teamId) => teamMap.has(teamId)),
    );

    const phaseTypeById = new Map(
      (phases ?? []).map((phase) => [phase.id as string, phase.phase_type as string]),
    );
    const phaseIds = [...phaseTypeById.keys()];

    const matchTallies = new Map<string, { classification: MatchTally; knockout: MatchTally }>();
    for (const teamId of activeTeamIds) {
      matchTallies.set(teamId, {
        classification: { wins: 0, draws: 0, losses: 0, played: 0 },
        knockout: { wins: 0, draws: 0, losses: 0, played: 0 },
      });
    }

    if (phaseIds.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select("phase_id, team_a_id, team_b_id, score_a, score_b")
        .in("phase_id", phaseIds)
        .eq("status", "finished");

      for (const match of matches ?? []) {
        const bucket = phaseBucket(phaseTypeById.get(match.phase_id as string) ?? "");
        if (!bucket) continue;

        const sides = [
          { teamId: match.team_a_id as string | null, scoreFor: match.score_a as number | null, scoreAgainst: match.score_b as number | null },
          { teamId: match.team_b_id as string | null, scoreFor: match.score_b as number | null, scoreAgainst: match.score_a as number | null },
        ];

        for (const side of sides) {
          if (!side.teamId || !activeTeamIds.has(side.teamId)) continue;
          const result = tallyMatch(side.teamId, side.scoreFor, side.scoreAgainst);
          if (!result) continue;
          const tally = matchTallies.get(side.teamId)?.[bucket];
          if (!tally) continue;
          tally.played += 1;
          if (result === "w") tally.wins += 1;
          if (result === "d") tally.draws += 1;
          if (result === "l") tally.losses += 1;
        }
      }
    }

    const finalPositionCategoryByTeam = new Map<string, string>();
    for (const row of awardsRows ?? []) {
      const positionCode = AWARD_TYPE_TO_RANKING_CATEGORY[row.award_type as string];
      if (positionCode && row.winning_team_id) {
        finalPositionCategoryByTeam.set(row.winning_team_id as string, positionCode);
      }
    }

    for (const teamId of activeTeamIds) {
      const tally = matchTallies.get(teamId) ?? {
        classification: { wins: 0, draws: 0, losses: 0, played: 0 },
        knockout: { wins: 0, draws: 0, losses: 0, played: 0 },
      };

      const pushEntry = (categoryCode: string, points: number) => {
        if (points <= 0) return;
        pointEntries.push({
          organization_id: organizationId,
          team_id: teamId,
          edition_id: editionId,
          season_id: seasonId,
          year_id: yearId,
          category_code: categoryCode,
          points_earned: points,
        });
        addPoints(totalsByTeam, teamId, points);
      };

      pushEntry("participation", config.participation ?? 0);

      pushEntry("win_in_classification", (config.win_in_classification ?? 0) * tally.classification.wins);
      pushEntry("draw_in_classification", (config.draw_in_classification ?? 0) * tally.classification.draws);
      pushEntry("loss_in_classification", (config.loss_in_classification ?? 0) * tally.classification.losses);

      pushEntry("win_in_knockout", (config.win_in_knockout ?? 0) * tally.knockout.wins);
      pushEntry("draw_in_knockout", (config.draw_in_knockout ?? 0) * tally.knockout.draws);
      pushEntry("loss_in_knockout", (config.loss_in_knockout ?? 0) * tally.knockout.losses);

      const positionCode = finalPositionCategoryByTeam.get(teamId);
      if (positionCode) {
        pushEntry(positionCode, config[positionCode] ?? 0);
      }
    }
  }

  await supabase
    .from("ranking_point_entries")
    .delete()
    .eq("organization_id", organizationId)
    .in("edition_id", editionIds);

  if (pointEntries.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < pointEntries.length; i += chunkSize) {
      const chunk = pointEntries.slice(i, i + chunkSize);
      const { error } = await supabase.from("ranking_point_entries").insert(chunk);
      if (error) throw new Error(error.message);
    }
  }

  const { data: manualAdjustments, error: manualError } = await supabase
    .from("ranking_manual_adjustments")
    .select("team_id, points_delta")
    .eq("organization_id", organizationId);

  if (manualError) throw new Error(manualError.message);

  const manualByTeam = new Map<string, number>();
  for (const row of manualAdjustments ?? []) {
    const teamId = row.team_id as string;
    if (!teamMap.has(teamId)) continue;
    manualByTeam.set(teamId, (manualByTeam.get(teamId) ?? 0) + (row.points_delta as number));
  }

  const allTeamIds = new Set([...totalsByTeam.keys(), ...manualByTeam.keys()]);
  const cacheRows = [...allTeamIds].map((teamId) => {
    const totalPoints = totalsByTeam.get(teamId) ?? 0;
    const manualAdjustment = manualByTeam.get(teamId) ?? 0;
    return {
      organization_id: organizationId,
      team_id: teamId,
      total_points: totalPoints,
      manual_adjustment_total: manualAdjustment,
      final_points: totalPoints + manualAdjustment,
      last_calculated_at: new Date().toISOString(),
    };
  });

  await supabase
    .from("team_ranking_cache")
    .delete()
    .eq("organization_id", organizationId);

  if (cacheRows.length > 0) {
    const sorted = [...cacheRows].sort((a, b) => b.final_points - a.final_points);
    const withPosition = sorted.map((row, index) => ({
      ...row,
      position: index + 1,
    }));

    const { error: cacheError } = await supabase.from("team_ranking_cache").insert(withPosition);
    if (cacheError) throw new Error(cacheError.message);
  }

  const rows: RankingRow[] = [...allTeamIds]
    .map((teamId) => {
      const team = teamMap.get(teamId);
      if (!team) return null;
      const totalPoints = (totalsByTeam.get(teamId) ?? 0) + (manualByTeam.get(teamId) ?? 0);
      return {
        team_id: teamId,
        team_name: team.full_name as string,
        short_name: (team.short_name as string | null) ?? null,
        logo_url: (team.logo_url as string | null) ?? null,
        total_points: totalPoints,
      };
    })
    .filter((row): row is RankingRow => row !== null && row.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points);

  return rows;
}
