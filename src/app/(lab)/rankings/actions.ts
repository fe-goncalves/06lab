"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { calculateRanking, type RankingRow } from "@/lib/ranking-calculate";
import { rankingCategoryLabel } from "@/lib/ranking-labels";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const SPORT_SLUG = "football7";

export type RankingFiltros = {
  gender: string;
  competitionId?: string;
  seasonId?: string;
  yearId?: string;
};

export type RankingFiltroOpcoes = {
  competitions: { id: string; full_name: string; short_name: string | null; logo_url: string | null; gender: string | null }[];
  seasons: { id: string; name: string }[];
  years: { id: string; value: number }[];
};

export type RankingExtratoLine = {
  category_code: string;
  category_label: string;
  points: number;
};

export type RankingExtratoEdition = {
  edition_id: string;
  competition_label: string;
  season_name: string;
  year_value: number | null;
  lines: RankingExtratoLine[];
  subtotal: number;
};

export type RankingManualAdjustment = {
  points: number;
  label: string;
};

export type RankingExtrato = {
  team_id: string;
  team_name: string;
  short_name: string | null;
  logo_url: string | null;
  editions: RankingExtratoEdition[];
  manual_adjustments: RankingManualAdjustment[];
  total: number;
};

function teamGenderMatches(gender: string, dbGender: string | null | undefined): boolean {
  const g = (dbGender ?? "").toLowerCase();
  if (gender === "male") return g === "male" || g === "m" || g === "masculino";
  return g === "female" || g === "f" || g === "feminino";
}

async function getOrganizationId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return profile?.organization_id ?? null;
}

async function resolverEditionIds(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  filtros: RankingFiltros,
): Promise<string[]> {
  let query = supabase
    .from("competition_editions")
    .select("id, season_id, competitions!inner(organization_id, gender, sport_slug)")
    .eq("competitions.organization_id", orgId)
    .eq("competitions.gender", filtros.gender)
    .eq("competitions.sport_slug", SPORT_SLUG);

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

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((e: { id: string }) => e.id);
}

export async function buscarOpcoesFiltroRanking(): Promise<RankingFiltroOpcoes | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };
  const orgId = profile.organization_id;

  const [{ data: compsData }, { data: seasonsData }, { data: yearsData }] = await Promise.all([
    supabase
      .from("competitions")
      .select("id, full_name, short_name, logo_url, gender")
      .eq("organization_id", orgId)
      .eq("sport_slug", SPORT_SLUG)
      .order("full_name"),
    supabase
      .from("seasons")
      .select("id, name, display_order")
      .eq("organization_id", orgId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("years")
      .select("id, value")
      .eq("organization_id", orgId)
      .order("value", { ascending: false }),
  ]);

  return {
    competitions: (compsData ?? []) as RankingFiltroOpcoes["competitions"],
    seasons: (seasonsData ?? []) as RankingFiltroOpcoes["seasons"],
    years: (yearsData ?? []) as RankingFiltroOpcoes["years"],
  };
}

export async function recalcularRanking(gender: string): Promise<{ success: true } | { error: string }> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { error: "Organização não encontrada." };

  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc("calculate_ranking", {
    p_organization_id: organizationId,
    p_gender: gender,
    p_sport_slug: SPORT_SLUG,
  });

  if (rpcError) {
    try {
      await calculateRanking(admin, organizationId, gender, SPORT_SLUG);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao calcular ranking.";
      return { error: message };
    }
  }

  return { success: true };
}

export async function loadRanking(
  filtros: RankingFiltros,
): Promise<{ data: RankingRow[] } | { error: string }> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { error: "Organização não encontrada." };

  const admin = createAdminClient();
  const editionIds = await resolverEditionIds(admin, organizationId, filtros);
  if (editionIds.length === 0) return { data: [] };

  const { data: entries, error: entriesError } = await admin
    .from("ranking_point_entries")
    .select("team_id, points_earned")
    .eq("organization_id", organizationId)
    .in("edition_id", editionIds);

  if (entriesError) return { error: entriesError.message };

  const totals = new Map<string, number>();
  for (const entry of entries ?? []) {
    const teamId = entry.team_id as string;
    totals.set(teamId, (totals.get(teamId) ?? 0) + (entry.points_earned as number));
  }

  const hasScopeFilter = !!(filtros.competitionId || filtros.seasonId || filtros.yearId);
  if (!hasScopeFilter) {
    const { data: manualRows, error: manualError } = await admin
      .from("ranking_manual_adjustments")
      .select("team_id, points_delta")
      .eq("organization_id", organizationId);

    if (manualError) return { error: manualError.message };

    for (const row of manualRows ?? []) {
      const teamId = row.team_id as string;
      totals.set(teamId, (totals.get(teamId) ?? 0) + (row.points_delta as number));
    }
  }

  const teamIds = [...totals.entries()]
    .filter(([, points]) => points > 0)
    .map(([teamId]) => teamId);

  if (teamIds.length === 0) return { data: [] };

  const { data: teams, error: teamsError } = await admin
    .from("teams")
    .select("id, full_name, short_name, logo_url, gender, is_virtual")
    .in("id", teamIds)
    .eq("organization_id", organizationId)
    .eq("is_virtual", false);

  if (teamsError) return { error: teamsError.message };

  const rows: RankingRow[] = (teams ?? [])
    .filter((team) => teamGenderMatches(filtros.gender, team.gender as string | null))
    .map((team) => ({
      team_id: team.id as string,
      team_name: team.full_name as string,
      short_name: (team.short_name as string | null) ?? null,
      logo_url: (team.logo_url as string | null) ?? null,
      total_points: totals.get(team.id as string) ?? 0,
    }))
    .filter((row) => row.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points || a.team_name.localeCompare(b.team_name));

  return { data: rows };
}

type ExtratoEntryRow = {
  edition_id: string;
  category_code: string;
  points_earned: number;
  years?: { value?: number | null } | null;
  competition_editions: {
    competitions?: { short_name?: string | null; full_name?: string | null } | null;
    seasons?: { name?: string | null } | null;
  } | null;
};

export async function loadRankingExtrato(
  teamId: string,
  filtros: RankingFiltros,
): Promise<{ data: RankingExtrato } | { error: string }> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { error: "Organização não encontrada." };

  const admin = createAdminClient();

  const { data: team, error: teamError } = await admin
    .from("teams")
    .select("id, full_name, short_name, logo_url, gender, is_virtual")
    .eq("id", teamId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (teamError) return { error: teamError.message };
  if (!team || team.is_virtual) return { error: "Equipe não encontrada." };
  if (!teamGenderMatches(filtros.gender, team.gender as string | null)) {
    return { error: "Equipe não pertence ao gênero selecionado." };
  }

  const editionIds = await resolverEditionIds(admin, organizationId, filtros);
  if (editionIds.length === 0) {
    return {
      data: {
        team_id: teamId,
        team_name: team.full_name as string,
        short_name: (team.short_name as string | null) ?? null,
        logo_url: (team.logo_url as string | null) ?? null,
        editions: [],
        manual_adjustments: [],
        total: 0,
      },
    };
  }

  const { data: entries, error: entriesError } = await admin
    .from("ranking_point_entries")
    .select(`
      edition_id,
      category_code,
      points_earned,
      years(value),
      competition_editions!inner(
        competitions(short_name, full_name),
        seasons(name)
      )
    `)
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .in("edition_id", editionIds)
    .gt("points_earned", 0);

  if (entriesError) return { error: entriesError.message };

  const editionMap = new Map<string, RankingExtratoEdition>();

  for (const raw of (entries ?? []) as ExtratoEntryRow[]) {
    const editionId = raw.edition_id;
    const editionMeta = raw.competition_editions;
    const competitionLabel =
      editionMeta?.competitions?.short_name ??
      editionMeta?.competitions?.full_name ??
      "Competição";
    const seasonName = editionMeta?.seasons?.name ?? "—";
    const yearValue = raw.years?.value ?? null;

    if (!editionMap.has(editionId)) {
      editionMap.set(editionId, {
        edition_id: editionId,
        competition_label: competitionLabel,
        season_name: seasonName,
        year_value: yearValue,
        lines: [],
        subtotal: 0,
      });
    }

    const edition = editionMap.get(editionId)!;
    const points = raw.points_earned as number;
    const existingLine = edition.lines.find((line) => line.category_code === raw.category_code);

    if (existingLine) {
      existingLine.points += points;
    } else {
      edition.lines.push({
        category_code: raw.category_code,
        category_label: rankingCategoryLabel(raw.category_code),
        points,
      });
    }

    edition.subtotal += points;
  }

  const editions = [...editionMap.values()]
    .map((edition) => ({
      ...edition,
      lines: edition.lines.sort((a, b) => b.points - a.points || a.category_label.localeCompare(b.category_label)),
    }))
    .sort((a, b) => {
      const yearDiff = (b.year_value ?? 0) - (a.year_value ?? 0);
      if (yearDiff !== 0) return yearDiff;
      return a.competition_label.localeCompare(b.competition_label);
    });

  const manual_adjustments: RankingManualAdjustment[] = [];
  const hasScopeFilter = !!(filtros.competitionId || filtros.seasonId || filtros.yearId);

  if (!hasScopeFilter) {
    const { data: manualRows, error: manualError } = await admin
      .from("ranking_manual_adjustments")
      .select("points_delta")
      .eq("organization_id", organizationId)
      .eq("team_id", teamId);

    if (manualError) return { error: manualError.message };

    for (const row of manualRows ?? []) {
      const points = row.points_delta as number;
      if (points === 0) continue;
      manual_adjustments.push({
        points,
        label: "Ajuste manual",
      });
    }
  }

  const total =
    editions.reduce((sum, edition) => sum + edition.subtotal, 0) +
    manual_adjustments.reduce((sum, item) => sum + item.points, 0);

  return {
    data: {
      team_id: teamId,
      team_name: team.full_name as string,
      short_name: (team.short_name as string | null) ?? null,
      logo_url: (team.logo_url as string | null) ?? null,
      editions,
      manual_adjustments,
      total,
    },
  };
}
