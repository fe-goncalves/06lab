"use server";

import { createClient } from "@/lib/supabase-server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface HallFiltros {
  competitionId?: string;
  seasonId?: string;
  teamId?: string;
  gender?: string;
}

export interface AthleteEntry {
  athlete_id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  team_name: string | null;
  team_logo: string | null;
  value: number;
}

export interface TeamEntry {
  team_id: string;
  full_name: string;
  logo_url: string | null;
  value: number;
  subtitle?: string | null; // para sequências: exibe "Edição · Temporada"
}

export interface StaffEntry {
  staff_member_id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  value: number;
}

export interface HallDaFamaData {
  // ── Atletas – stats existentes ──────────────────────────────────────
  artilharia: AthleteEntry[];
  assistencias: AthleteEntry[];
  partidas: AthleteEntry[];
  cartoes_amarelos: AthleteEntry[];
  motm: AthleteEntry[];
  tots: AthleteEntry[];
  totw: AthleteEntry[];
  avg_rating: AthleteEntry[];
  penalty_saves: AthleteEntry[];
  // ── Atletas – feitos especiais (achievements) ────────────────────────
  hat_tricks: AthleteEntry[];
  pokers: AthleteEntry[];
  manitas: AthleteEntry[];
  participacoes_diretas: AthleteEntry[];
  // ── Equipes – existentes ─────────────────────────────────────────────
  titulos: TeamEntry[];
  vitorias: TeamEntry[];
  aproveitamento: TeamEntry[];
  gols_marcados: TeamEntry[];
  // ── Equipes – novas ──────────────────────────────────────────────────
  sequencia_vitorias: TeamEntry[];
  sequencia_invicto: TeamEntry[];
  maior_goleada: TeamEntry[];
  mais_cleansheets: TeamEntry[];
  // ── Comissão Técnica ─────────────────────────────────────────────────
  tecnicos_titulos: StaffEntry[];
  tecnicos_premiacoes: StaffEntry[];
}

// ─── Helper: dados de atletas em batch ────────────────────────────────────────

async function enriquecerAtletas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteIds: string[],
): Promise<Map<string, { full_name: string; surname: string | null; photo_url: string | null; team_name: string | null; team_logo: string | null }>> {
  if (athleteIds.length === 0) return new Map();

  const { data } = await supabase
    .from("athletes")
    .select("id, full_name, surname, photo_url, athlete_team_stints(is_current, teams(full_name, logo_url))")
    .in("id", athleteIds);

  const map = new Map<string, any>();
  for (const a of (data ?? []) as any[]) {
    const currentStint = (a.athlete_team_stints ?? []).find((s: any) => s.is_current);
    map.set(a.id, {
      full_name: a.full_name ?? "",
      surname: a.surname ?? null,
      photo_url: a.photo_url ?? null,
      team_name: currentStint?.teams?.full_name ?? null,
      team_logo: currentStint?.teams?.logo_url ?? null,
    });
  }
  return map;
}

// ─── Helper: busca todas as edições da org ────────────────────────────────────

async function todasEdicoesOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("competition_editions")
    .select("id, competitions!inner(organization_id)")
    .eq("competitions.organization_id", orgId);
  return (data ?? []).map((e: any) => e.id);
}

// ─── Helper: resolve edition_ids a partir dos filtros ─────────────────────────

async function resolverEditionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  filtros: HallFiltros,
): Promise<string[] | null> {
  const temFiltro = filtros.competitionId || filtros.seasonId || filtros.gender;
  if (!temFiltro) return null;

  let query = supabase
    .from("competition_editions")
    .select("id, competitions!inner(gender, organization_id)")
    .eq("competitions.organization_id", orgId);

  if (filtros.competitionId) query = query.eq("competition_id", filtros.competitionId);
  if (filtros.seasonId)      query = query.eq("season_id", filtros.seasonId);
  if (filtros.gender)        query = query.eq("competitions.gender", filtros.gender);

  const { data } = await query;
  return (data ?? []).map((e: any) => e.id);
}

// ─── Helper: busca label "Edição · Temporada" para uma edition_id ─────────────

async function labelEdicao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  editionId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("competition_editions")
    .select("competitions(short_name, full_name), seasons(name)")
    .eq("id", editionId)
    .maybeSingle();
  if (!data) return null;
  const compName = (data as any).competitions?.short_name ?? (data as any).competitions?.full_name ?? "";
  const seasonName = (data as any).seasons?.name ?? "";
  return [compName, seasonName].filter(Boolean).join(" · ") || null;
}

// ─── Helper vazio (quando filtros não têm resultados) ─────────────────────────

function dadosVazios(): HallDaFamaData {
  return {
    artilharia: [], assistencias: [], partidas: [], cartoes_amarelos: [],
    motm: [], tots: [], totw: [], avg_rating: [], penalty_saves: [],
    hat_tricks: [], pokers: [], manitas: [], participacoes_diretas: [],
    titulos: [], vitorias: [], aproveitamento: [], gols_marcados: [],
    sequencia_vitorias: [], sequencia_invicto: [], maior_goleada: [], mais_cleansheets: [],
    tecnicos_titulos: [], tecnicos_premiacoes: [],
  };
}

// ─── Action principal ─────────────────────────────────────────────────────────

export async function buscarHallDaFama(
  filtros: HallFiltros = {},
): Promise<HallDaFamaData | { error: string }> {
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

  const editionIds = await resolverEditionIds(supabase, orgId, filtros);
  const temFiltroTime = !!filtros.teamId;
  const usarCareerStats = editionIds === null && !temFiltroTime;

  if (editionIds !== null && editionIds.length === 0) {
    return dadosVazios();
  }

  // ─── Atletas – stats existentes ───────────────────────────────────────────

  let artilharia: AthleteEntry[]       = [];
  let assistencias: AthleteEntry[]     = [];
  let partidas: AthleteEntry[]         = [];
  let cartoes_amarelos: AthleteEntry[] = [];
  let motm: AthleteEntry[]             = [];
  let tots: AthleteEntry[]             = [];
  let totw: AthleteEntry[]             = [];
  let avg_rating: AthleteEntry[]       = [];
  let penalty_saves: AthleteEntry[]    = [];

  if (usarCareerStats) {
    const { data: careerData } = await supabase
      .from("athlete_career_stats")
      .select("athlete_id, total_goals, total_assists, total_matches, total_yellow_cards, total_motm, total_tots, total_totw, total_penalty_saves, avg_rating")
      .eq("organization_id", orgId);

    const rows = (careerData ?? []) as any[];
    if (rows.length > 0) {
      const athleteMap = await enriquecerAtletas(supabase, rows.map((r) => r.athlete_id));

      const toEntry = (r: any, value: number): AthleteEntry => {
        const a = athleteMap.get(r.athlete_id);
        return {
          athlete_id: r.athlete_id,
          full_name: a?.full_name ?? "",
          surname: a?.surname ?? null,
          photo_url: a?.photo_url ?? null,
          team_name: a?.team_name ?? null,
          team_logo: a?.team_logo ?? null,
          value,
        };
      };

      artilharia       = [...rows].sort((a, b) => (b.total_goals ?? 0) - (a.total_goals ?? 0)).filter((r) => (r.total_goals ?? 0) > 0).map((r) => toEntry(r, r.total_goals));
      assistencias     = [...rows].sort((a, b) => (b.total_assists ?? 0) - (a.total_assists ?? 0)).filter((r) => (r.total_assists ?? 0) > 0).map((r) => toEntry(r, r.total_assists));
      partidas         = [...rows].sort((a, b) => (b.total_matches ?? 0) - (a.total_matches ?? 0)).filter((r) => (r.total_matches ?? 0) > 0).map((r) => toEntry(r, r.total_matches));
      cartoes_amarelos = [...rows].sort((a, b) => (b.total_yellow_cards ?? 0) - (a.total_yellow_cards ?? 0)).filter((r) => (r.total_yellow_cards ?? 0) > 0).map((r) => toEntry(r, r.total_yellow_cards));
      motm             = [...rows].sort((a, b) => (b.total_motm ?? 0) - (a.total_motm ?? 0)).filter((r) => (r.total_motm ?? 0) > 0).map((r) => toEntry(r, r.total_motm));
      tots             = [...rows].sort((a, b) => (b.total_tots ?? 0) - (a.total_tots ?? 0)).filter((r) => (r.total_tots ?? 0) > 0).map((r) => toEntry(r, r.total_tots));
      totw             = [...rows].sort((a, b) => (b.total_totw ?? 0) - (a.total_totw ?? 0)).filter((r) => (r.total_totw ?? 0) > 0).map((r) => toEntry(r, r.total_totw));
      avg_rating       = [...rows].filter((r) => (r.total_matches ?? 0) >= 10 && r.avg_rating != null).sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)).map((r) => toEntry(r, Math.round((r.avg_rating ?? 0) * 10) / 10));
      penalty_saves    = [...rows].sort((a, b) => (b.total_penalty_saves ?? 0) - (a.total_penalty_saves ?? 0)).filter((r) => (r.total_penalty_saves ?? 0) > 0).map((r) => toEntry(r, r.total_penalty_saves));
    }

  } else {
    const editionIdsParaUsar: string[] = editionIds ?? await todasEdicoesOrg(supabase, orgId);

    if (editionIdsParaUsar.length > 0) {
      let statsQuery = supabase
        .from("athlete_edition_stats")
        .select("athlete_id, team_id, matches_played, goals, assists, yellow_cards, motm_count, tots_count, totw_count, penalty_saves, avg_rating")
        .in("edition_id", editionIdsParaUsar);

      if (filtros.teamId) statsQuery = statsQuery.eq("team_id", filtros.teamId);

      const { data: statsData } = await statsQuery;
      let rows = (statsData ?? []) as any[];

      if (filtros.gender && rows.length > 0) {
        const athleteIds = [...new Set(rows.map((r) => r.athlete_id))];
        const { data: genderData } = await supabase.from("athletes").select("id").in("id", athleteIds).eq("gender", filtros.gender);
        const validIds = new Set((genderData ?? []).map((a: any) => a.id));
        rows = rows.filter((r) => validIds.has(r.athlete_id));
      }

      const agregado = new Map<string, any>();
      for (const r of rows) {
        const key = r.athlete_id;
        if (!agregado.has(key)) {
          agregado.set(key, { athlete_id: key, total_goals: 0, total_assists: 0, total_matches: 0, total_yellow_cards: 0, total_motm: 0, total_tots: 0, total_totw: 0, total_penalty_saves: 0, rating_sum: 0, rating_count: 0 });
        }
        const e = agregado.get(key)!;
        e.total_goals         += r.goals         ?? 0;
        e.total_assists       += r.assists        ?? 0;
        e.total_matches       += r.matches_played ?? 0;
        e.total_yellow_cards  += r.yellow_cards   ?? 0;
        e.total_motm          += r.motm_count     ?? 0;
        e.total_tots          += r.tots_count     ?? 0;
        e.total_totw          += r.totw_count     ?? 0;
        e.total_penalty_saves += r.penalty_saves  ?? 0;
        if (r.avg_rating != null) {
          e.rating_sum   += r.avg_rating * (r.matches_played ?? 0);
          e.rating_count += r.matches_played ?? 0;
        }
      }

      const aggRows = Array.from(agregado.values()).map((e) => ({
        ...e,
        avg_rating: e.rating_count >= 10 ? e.rating_sum / e.rating_count : null,
      }));

      if (aggRows.length > 0) {
        const athleteMap = await enriquecerAtletas(supabase, aggRows.map((r) => r.athlete_id));
        const toEntry = (r: any, value: number): AthleteEntry => {
          const a = athleteMap.get(r.athlete_id);
          return { athlete_id: r.athlete_id, full_name: a?.full_name ?? "", surname: a?.surname ?? null, photo_url: a?.photo_url ?? null, team_name: a?.team_name ?? null, team_logo: a?.team_logo ?? null, value };
        };

        artilharia       = [...aggRows].sort((a, b) => b.total_goals - a.total_goals).filter((r) => r.total_goals > 0).map((r) => toEntry(r, r.total_goals));
        assistencias     = [...aggRows].sort((a, b) => b.total_assists - a.total_assists).filter((r) => r.total_assists > 0).map((r) => toEntry(r, r.total_assists));
        partidas         = [...aggRows].sort((a, b) => b.total_matches - a.total_matches).filter((r) => r.total_matches > 0).map((r) => toEntry(r, r.total_matches));
        cartoes_amarelos = [...aggRows].sort((a, b) => b.total_yellow_cards - a.total_yellow_cards).filter((r) => r.total_yellow_cards > 0).map((r) => toEntry(r, r.total_yellow_cards));
        motm             = [...aggRows].sort((a, b) => b.total_motm - a.total_motm).filter((r) => r.total_motm > 0).map((r) => toEntry(r, r.total_motm));
        tots             = [...aggRows].sort((a, b) => b.total_tots - a.total_tots).filter((r) => r.total_tots > 0).map((r) => toEntry(r, r.total_tots));
        totw             = [...aggRows].sort((a, b) => b.total_totw - a.total_totw).filter((r) => r.total_totw > 0).map((r) => toEntry(r, r.total_totw));
        avg_rating       = [...aggRows].filter((r) => r.rating_count >= 10 && r.avg_rating != null).sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)).map((r) => toEntry(r, Math.round((r.avg_rating ?? 0) * 10) / 10));
        penalty_saves    = [...aggRows].sort((a, b) => b.total_penalty_saves - a.total_penalty_saves).filter((r) => r.total_penalty_saves > 0).map((r) => toEntry(r, r.total_penalty_saves));
      }
    }
  }

  // ─── Atletas – feitos especiais (athlete_match_achievements) ─────────────────

  let hat_tricks: AthleteEntry[]            = [];
  let pokers: AthleteEntry[]                = [];
  let manitas: AthleteEntry[]               = [];
  let participacoes_diretas: AthleteEntry[] = [];

  // achievements sempre usam edition_ids para respeitar filtros de competição/temporada/gênero
  // sem filtros: busca de todas as edições da org
  const editionIdsAchiev: string[] = editionIds ?? await todasEdicoesOrg(supabase, orgId);

  if (editionIdsAchiev.length > 0) {
    const achievTypes = ["hat_trick", "poker", "manita", "goal_and_assist"] as const;

    const achievQueries = achievTypes.map((type) => {
      let q = supabase
        .from("athlete_match_achievements")
        .select("athlete_id")
        .eq("achievement_type", type)
        .in("edition_id", editionIdsAchiev);
      if (filtros.teamId) q = q.eq("team_id", filtros.teamId);
      return q;
    });

    const [htRes, pkRes, mnRes, gaRes] = await Promise.all(achievQueries);

    const contarPorAtleta = async (
      rows: any[],
    ): Promise<AthleteEntry[]> => {
      const counts = new Map<string, number>();
      for (const r of rows) {
        counts.set(r.athlete_id, (counts.get(r.athlete_id) ?? 0) + 1);
      }

      let entries = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Filtro de gênero
      if (filtros.gender && entries.length > 0) {
        const ids = entries.map(([id]) => id);
        const { data: gd } = await supabase.from("athletes").select("id").in("id", ids).eq("gender", filtros.gender);
        const validIds = new Set((gd ?? []).map((a: any) => a.id));
        entries = entries.filter(([id]) => validIds.has(id));
      }

      const athleteMap = await enriquecerAtletas(supabase, entries.map(([id]) => id));
      return entries.map(([id, count]) => {
        const a = athleteMap.get(id);
        return { athlete_id: id, full_name: a?.full_name ?? "", surname: a?.surname ?? null, photo_url: a?.photo_url ?? null, team_name: a?.team_name ?? null, team_logo: a?.team_logo ?? null, value: count };
      });
    };

    [hat_tricks, pokers, manitas, participacoes_diretas] = await Promise.all([
      contarPorAtleta(htRes.data ?? []),
      contarPorAtleta(pkRes.data ?? []),
      contarPorAtleta(mnRes.data ?? []),
      contarPorAtleta(gaRes.data ?? []),
    ]);
  }

  // ─── Equipes – stats existentes ───────────────────────────────────────────

  const editionIdsEquipes = editionIds ?? await todasEdicoesOrg(supabase, orgId);

  let titulos: TeamEntry[]        = [];
  let vitorias: TeamEntry[]       = [];
  let aproveitamento: TeamEntry[] = [];
  let gols_marcados: TeamEntry[]  = [];

  if (editionIdsEquipes.length > 0) {
    let teamStatsQuery = supabase
      .from("team_edition_stats")
      .select("team_id, matches_played, wins, goals_scored")
      .in("edition_id", editionIdsEquipes);
    if (filtros.teamId) teamStatsQuery = teamStatsQuery.eq("team_id", filtros.teamId);

    const { data: teamStatsData } = await teamStatsQuery;
    const teamAgg = new Map<string, any>();
    for (const r of (teamStatsData ?? []) as any[]) {
      if (!teamAgg.has(r.team_id)) teamAgg.set(r.team_id, { total_matches: 0, total_wins: 0, total_goals: 0 });
      const e = teamAgg.get(r.team_id)!;
      e.total_matches += r.matches_played ?? 0;
      e.total_wins    += r.wins           ?? 0;
      e.total_goals   += r.goals_scored   ?? 0;
    }

    const teamIds = Array.from(teamAgg.keys());
    const { data: teamsData } = await supabase.from("teams").select("id, full_name, logo_url").in("id", teamIds).eq("organization_id", orgId);
    const teamsMap = new Map((teamsData ?? []).map((t: any) => [t.id, t]));

    const { data: awardsData } = await supabase
      .from("edition_awards")
      .select("winning_team_id")
      .eq("award_type", "champion")
      .in("edition_id", editionIdsEquipes)
      .not("winning_team_id", "is", null);

    const tituloCount = new Map<string, number>();
    for (const a of (awardsData ?? []) as any[]) {
      tituloCount.set(a.winning_team_id, (tituloCount.get(a.winning_team_id) ?? 0) + 1);
    }

    titulos = Array.from(tituloCount.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => {
      const t = teamsMap.get(id);
      return { team_id: id, full_name: t?.full_name ?? "", logo_url: t?.logo_url ?? null, value: count };
    });

    const aggArr = Array.from(teamAgg.entries()).map(([id, stats]) => ({ team_id: id, ...stats, team: teamsMap.get(id) }));

    vitorias = [...aggArr].filter((t) => t.total_wins > 0).sort((a, b) => b.total_wins - a.total_wins).map((t) => ({ team_id: t.team_id, full_name: t.team?.full_name ?? "", logo_url: t.team?.logo_url ?? null, value: t.total_wins }));
    aproveitamento = [...aggArr].filter((t) => t.total_matches >= 5).sort((a, b) => b.total_wins / b.total_matches - a.total_wins / a.total_matches).map((t) => ({ team_id: t.team_id, full_name: t.team?.full_name ?? "", logo_url: t.team?.logo_url ?? null, value: Math.round((t.total_wins / t.total_matches) * 100) }));
    gols_marcados = [...aggArr].filter((t) => t.total_goals > 0).sort((a, b) => b.total_goals - a.total_goals).map((t) => ({ team_id: t.team_id, full_name: t.team?.full_name ?? "", logo_url: t.team?.logo_url ?? null, value: t.total_goals }));
  }

  // ─── Equipes – Sequências (views) ────────────────────────────────────────────

  let sequencia_vitorias: TeamEntry[] = [];
  let sequencia_invicto: TeamEntry[]  = [];

  if (editionIdsEquipes.length > 0) {
    // Busca dados de equipes de uma vez para as queries de streak
    const allTeamIds: string[] = filtros.teamId ? [filtros.teamId] : [];

    let winStreakQuery = supabase
      .from("view_team_winning_streaks")
      .select("team_id, edition_id, max_winning_streak")
      .in("edition_id", editionIdsEquipes)
      .order("max_winning_streak", { ascending: false })
      .limit(10);
    if (filtros.teamId) winStreakQuery = winStreakQuery.eq("team_id", filtros.teamId);

    let unbeatenStreakQuery = supabase
      .from("view_team_unbeaten_streaks")
      .select("team_id, edition_id, max_unbeaten_streak")
      .in("edition_id", editionIdsEquipes)
      .order("max_unbeaten_streak", { ascending: false })
      .limit(10);
    if (filtros.teamId) unbeatenStreakQuery = unbeatenStreakQuery.eq("team_id", filtros.teamId);

    const [winStreakRes, unbeatenStreakRes] = await Promise.all([winStreakQuery, unbeatenStreakQuery]);

    // Recolhe todos os team_ids e edition_ids para buscar nomes em batch
    const streakTeamIds = [...new Set([
      ...(winStreakRes.data ?? []).map((r: any) => r.team_id),
      ...(unbeatenStreakRes.data ?? []).map((r: any) => r.team_id),
    ])];
    const streakEditionIds = [...new Set([
      ...(winStreakRes.data ?? []).map((r: any) => r.edition_id),
      ...(unbeatenStreakRes.data ?? []).map((r: any) => r.edition_id),
    ])];

    const [teamsStreakRes, editionsStreakRes] = await Promise.all([
      streakTeamIds.length > 0
        ? supabase.from("teams").select("id, full_name, logo_url").in("id", streakTeamIds)
        : Promise.resolve({ data: [] }),
      streakEditionIds.length > 0
        ? supabase.from("competition_editions").select("id, competitions(short_name, full_name), seasons(name)").in("id", streakEditionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const teamsStreakMap = new Map((teamsStreakRes.data ?? []).map((t: any) => [t.id, t]));
    const editionsStreakMap = new Map((editionsStreakRes.data ?? []).map((e: any) => {
      const compName = (e.competitions?.short_name ?? e.competitions?.full_name ?? "");
      const seasonName = e.seasons?.name ?? "";
      return [e.id, [compName, seasonName].filter(Boolean).join(" · ") || null];
    }));

    const toStreakEntry = (r: any, value: number): TeamEntry => {
      const t = teamsStreakMap.get(r.team_id);
      const subtitle = editionsStreakMap.get(r.edition_id) ?? null;
      return { team_id: r.team_id, full_name: t?.full_name ?? "", logo_url: t?.logo_url ?? null, value, subtitle };
    };

    sequencia_vitorias = (winStreakRes.data ?? [])
      .filter((r: any) => (r.max_winning_streak ?? 0) > 0)
      .map((r: any) => toStreakEntry(r, r.max_winning_streak));

    sequencia_invicto = (unbeatenStreakRes.data ?? [])
      .filter((r: any) => (r.max_unbeaten_streak ?? 0) > 0)
      .map((r: any) => toStreakEntry(r, r.max_unbeaten_streak));
  }

  // ─── Equipes – Maior goleada ─────────────────────────────────────────────────

  let maior_goleada: TeamEntry[] = [];

  if (editionIdsEquipes.length > 0) {
    let goleadaQuery = supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, score_home, score_away, edition_id")
      .eq("status", "finished")
      .in("edition_id", editionIdsEquipes)
      .not("score_home", "is", null)
      .not("score_away", "is", null);

    const { data: matchesData } = await goleadaQuery;

    if ((matchesData ?? []).length > 0) {
      // Calcula diferença de gols e identifica o vencedor
      type GoleadaRow = {
        match_id: string;
        winner_team_id: string;
        loser_team_id: string;
        edition_id: string;
        score_winner: number;
        score_loser: number;
        diff: number;
      };

      const goleadas: GoleadaRow[] = ((matchesData ?? []) as any[])
        .map((m) => {
          const sh = m.score_home ?? 0;
          const sa = m.score_away ?? 0;
          const diff = Math.abs(sh - sa);
          if (diff === 0) return null;
          const [winner, loser, sw, sl] = sh > sa
            ? [m.home_team_id, m.away_team_id, sh, sa]
            : [m.away_team_id, m.home_team_id, sa, sh];
          return { match_id: m.id, winner_team_id: winner, loser_team_id: loser, edition_id: m.edition_id, score_winner: sw, score_loser: sl, diff };
        })
        .filter(Boolean) as GoleadaRow[];

      goleadas.sort((a, b) => {
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.score_winner - a.score_winner;
      });

      const top10 = goleadas.slice(0, 10);

      const goleadaTeamIds = [...new Set(top10.flatMap((g) => [g.winner_team_id, g.loser_team_id]).filter(Boolean))];
      const goleadaEditionIds = [...new Set(top10.map((g) => g.edition_id))];

      const [goleadaTeamsRes, goleadaEditionsRes] = await Promise.all([
        goleadaTeamIds.length > 0
          ? supabase.from("teams").select("id, full_name, logo_url").in("id", goleadaTeamIds)
          : Promise.resolve({ data: [] }),
        goleadaEditionIds.length > 0
          ? supabase.from("competition_editions").select("id, competitions(short_name, full_name), seasons(name)").in("id", goleadaEditionIds)
          : Promise.resolve({ data: [] }),
      ]);

      const goleadaTeamsMap = new Map((goleadaTeamsRes.data ?? []).map((t: any) => [t.id, t]));
      const goleadaEditionsMap = new Map((goleadaEditionsRes.data ?? []).map((e: any) => {
        const cn = e.competitions?.short_name ?? e.competitions?.full_name ?? "";
        const sn = e.seasons?.name ?? "";
        return [e.id, [cn, sn].filter(Boolean).join(" · ") || null];
      }));

      // Filtra por time se solicitado
      const goleadasFiltradas = filtros.teamId
        ? top10.filter((g) => g.winner_team_id === filtros.teamId || g.loser_team_id === filtros.teamId)
        : top10;

      maior_goleada = goleadasFiltradas.map((g) => {
        const t = goleadaTeamsMap.get(g.winner_team_id);
        const loserTeam = goleadaTeamsMap.get(g.loser_team_id);
        const edicaoLabel = goleadaEditionsMap.get(g.edition_id) ?? null;
        const placar = `${g.score_winner}×${g.score_loser} vs ${loserTeam?.full_name ?? "—"}`;
        const subtitle = edicaoLabel ? `${placar} · ${edicaoLabel}` : placar;
        return { team_id: g.winner_team_id, full_name: t?.full_name ?? "", logo_url: t?.logo_url ?? null, value: g.diff, subtitle };
      });
    }
  }

  // ─── Equipes – Mais cleansheets ───────────────────────────────────────────────

  let mais_cleansheets: TeamEntry[] = [];

  if (editionIdsEquipes.length > 0) {
    // Busca partidas finalizadas e calcula cleansheets por equipe
    // Uma equipe tem cleansheet quando não sofreu gols (score do adversário = 0)
    let csQuery = supabase
      .from("matches")
      .select("home_team_id, away_team_id, score_home, score_away, edition_id")
      .eq("status", "finished")
      .in("edition_id", editionIdsEquipes)
      .not("score_home", "is", null)
      .not("score_away", "is", null);

    const { data: csMatchesData } = await csQuery;

    if ((csMatchesData ?? []).length > 0) {
      const csCount = new Map<string, number>();

      for (const m of (csMatchesData ?? []) as any[]) {
        const sh = m.score_home ?? 0;
        const sa = m.score_away ?? 0;
        if (sa === 0 && m.home_team_id) {
          csCount.set(m.home_team_id, (csCount.get(m.home_team_id) ?? 0) + 1);
        }
        if (sh === 0 && m.away_team_id) {
          csCount.set(m.away_team_id, (csCount.get(m.away_team_id) ?? 0) + 1);
        }
      }

      // Filtra por time se solicitado
      if (filtros.teamId) {
        for (const key of csCount.keys()) {
          if (key !== filtros.teamId) csCount.delete(key);
        }
      }

      const sortedCs = Array.from(csCount.entries())
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sortedCs.length > 0) {
        const csTeamIds = sortedCs.map(([id]) => id);
        const { data: csTeamsData } = await supabase.from("teams").select("id, full_name, logo_url").in("id", csTeamIds);
        const csTeamsMap = new Map((csTeamsData ?? []).map((t: any) => [t.id, t]));

        mais_cleansheets = sortedCs.map(([id, count]) => {
          const t = csTeamsMap.get(id);
          return { team_id: id, full_name: t?.full_name ?? "", logo_url: t?.logo_url ?? null, value: count };
        });
      }
    }
  }

  // ─── Comissão Técnica ─────────────────────────────────────────────────────

  let tecnicos_titulos: StaffEntry[]    = [];
  let tecnicos_premiacoes: StaffEntry[] = [];

  let staffQuery = supabase
    .from("edition_awards")
    .select("award_type, staff_member_id")
    .in("award_type", ["champion", "best_coach"])
    .not("staff_member_id", "is", null)
    .eq("organization_id", orgId);
  if (editionIds !== null && editionIds.length > 0) staffQuery = staffQuery.in("edition_id", editionIds);

  const { data: staffData } = await staffQuery;
  const staffTitulo = new Map<string, number>();
  const staffPremio = new Map<string, number>();

  for (const r of (staffData ?? []) as any[]) {
    if (!r.staff_member_id) continue;
    if (r.award_type === "champion") staffTitulo.set(r.staff_member_id, (staffTitulo.get(r.staff_member_id) ?? 0) + 1);
    if (r.award_type === "best_coach") staffPremio.set(r.staff_member_id, (staffPremio.get(r.staff_member_id) ?? 0) + 1);
  }

  const allStaffIds = [...new Set([...staffTitulo.keys(), ...staffPremio.keys()])];
  let staffMap = new Map<string, any>();
  if (allStaffIds.length > 0) {
    const { data: staffMembersData } = await supabase.from("staff_members").select("id, full_name, surname, photo_url").in("id", allStaffIds);
    staffMap = new Map((staffMembersData ?? []).map((s: any) => [s.id, s]));
  }

  tecnicos_titulos = Array.from(staffTitulo.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => {
    const s = staffMap.get(id);
    return { staff_member_id: id, full_name: s?.full_name ?? "", surname: s?.surname ?? null, photo_url: s?.photo_url ?? null, value: count };
  });

  tecnicos_premiacoes = Array.from(staffPremio.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => {
    const s = staffMap.get(id);
    return { staff_member_id: id, full_name: s?.full_name ?? "", surname: s?.surname ?? null, photo_url: s?.photo_url ?? null, value: count };
  });

  return {
    artilharia, assistencias, partidas, cartoes_amarelos, motm, tots, totw, avg_rating, penalty_saves,
    hat_tricks, pokers, manitas, participacoes_diretas,
    titulos, vitorias, aproveitamento, gols_marcados,
    sequencia_vitorias, sequencia_invicto, maior_goleada, mais_cleansheets,
    tecnicos_titulos, tecnicos_premiacoes,
  };
}

// ─── Recálculo ─────────────────────────────────────────────────────────────────

export async function recalcularEstatisticas(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error: e1 } = await supabase.rpc("recalculate_athlete_career_stats");
  if (e1) return { error: e1.message };

  const { error: e2 } = await supabase.rpc("recalculate_team_career_stats");
  if (e2) return { error: e2.message };

  // Recalcula achievements para todas as partidas finalizadas
  const { error: e3 } = await supabase.rpc("recalculate_match_achievements_all");
  if (e3) return { error: e3.message };

  return { success: true };
}

// ─── Opções de filtro ─────────────────────────────────────────────────────────

export interface FiltroOpcoes {
  competitions: { id: string; full_name: string; short_name: string | null }[];
  seasons: { id: string; name: string }[];
  teams: { id: string; full_name: string; logo_url: string | null }[];
}

export async function buscarOpcoesFiltro(): Promise<FiltroOpcoes | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("auth_user_id", user.id).maybeSingle();
  if (!profile?.organization_id) return { error: "Organização não encontrada." };
  const orgId = profile.organization_id;
  const [{ data: compsData }, { data: seasonsData }, { data: teamsData }] = await Promise.all([
    supabase.from("competitions").select("id, full_name, short_name").eq("organization_id", orgId).order("full_name"),
    supabase.from("seasons").select("id, name").eq("organization_id", orgId).order("name"),
    supabase.from("teams").select("id, full_name, logo_url").eq("organization_id", orgId).order("full_name"),
  ]);
  return {
    competitions: (compsData ?? []) as FiltroOpcoes["competitions"],
    seasons: (seasonsData ?? []) as FiltroOpcoes["seasons"],
    teams: (teamsData ?? []) as FiltroOpcoes["teams"],
  };
}