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
  // ── Atletas – feitos especiais ───────────────────────────────────────
  hat_tricks: AthleteEntry[];
  pokers: AthleteEntry[];
  manitas: AthleteEntry[];
  participacoes_diretas: AthleteEntry[];
  mvp: AthleteEntry[];
  top_scorer: AthleteEntry[];
  top_assists: AthleteEntry[];
  best_goalkeeper: AthleteEntry[];
  motw: AthleteEntry[];
  penalty_conversion: AthleteEntry[];
  mais_finais: AthleteEntry[];
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
  runner_up: TeamEntry[];
  podios: TeamEntry[];
  totw_appearances: TeamEntry[];
  // ── Comissão Técnica ─────────────────────────────────────────────────
  tecnicos_titulos: StaffEntry[];
  tecnicos_premiacoes: StaffEntry[];
  staff_partidas: StaffEntry[];
  staff_motw: StaffEntry[];
}

function resolveGenderDb(gender?: string): "male" | "female" | undefined {
  if (!gender) return undefined;
  if (gender === "M" || gender === "male") return "male";
  if (gender === "F" || gender === "female") return "female";
  return undefined;
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

async function phaseIdsDasEdicoes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  editionIds: string[],
): Promise<string[]> {
  if (editionIds.length === 0) return [];
  const { data } = await supabase
    .from("phases")
    .select("id")
    .in("edition_id", editionIds);
  return (data ?? []).map((p: any) => p.id);
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
  const genderDb = resolveGenderDb(filtros.gender);
  if (genderDb) query = query.eq("competitions.gender", genderDb);

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
    mvp: [], top_scorer: [], top_assists: [], best_goalkeeper: [], motw: [], penalty_conversion: [], mais_finais: [],
    titulos: [], vitorias: [], aproveitamento: [], gols_marcados: [],
    sequencia_vitorias: [], sequencia_invicto: [], maior_goleada: [], mais_cleansheets: [],
    runner_up: [], podios: [], totw_appearances: [],
    tecnicos_titulos: [], tecnicos_premiacoes: [], staff_partidas: [], staff_motw: [],
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
  const genderDb = resolveGenderDb(filtros.gender);

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
  let mvp: AthleteEntry[]              = [];
  let top_scorer: AthleteEntry[]       = [];
  let top_assists: AthleteEntry[]      = [];
  let best_goalkeeper: AthleteEntry[]  = [];
  let motw: AthleteEntry[]             = [];
  let penalty_conversion: AthleteEntry[] = [];

  if (usarCareerStats) {
    let careerQuery = supabase
      .from("athlete_career_stats")
      .select(`
        athlete_id, total_goals, total_assists, total_matches, total_yellow_cards,
        total_motm, total_tots, total_totw, total_penalty_saves, avg_rating,
        total_hat_tricks, total_pokers, total_mvp, total_top_scorer, total_top_assists,
        total_best_goalkeeper, total_motw, total_penalties_taken, total_penalties_scored,
        athletes!inner(id, gender)
      `)
      .eq("organization_id", orgId);
    if (genderDb) careerQuery = careerQuery.eq("athletes.gender", genderDb);

    const { data: careerData } = await careerQuery;

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

      const sortField = (field: string) =>
        [...rows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0)).filter((r) => (r[field] ?? 0) > 0).map((r) => toEntry(r, r[field]));

      artilharia       = sortField("total_goals");
      assistencias     = sortField("total_assists");
      partidas         = sortField("total_matches");
      cartoes_amarelos = sortField("total_yellow_cards");
      motm             = sortField("total_motm");
      tots             = sortField("total_tots");
      totw             = sortField("total_totw");
      avg_rating       = [...rows].filter((r) => (r.total_matches ?? 0) >= 10 && r.avg_rating != null).sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)).map((r) => toEntry(r, Math.round((r.avg_rating ?? 0) * 10) / 10));
      penalty_saves    = sortField("total_penalty_saves");
      mvp              = sortField("total_mvp");
      top_scorer       = sortField("total_top_scorer");
      top_assists      = sortField("total_top_assists");
      best_goalkeeper  = sortField("total_best_goalkeeper");
      motw             = sortField("total_motw");
      penalty_conversion = [...rows]
        .filter((r) => (r.total_penalties_taken ?? 0) >= 3)
        .map((r) => ({ r, pct: Math.round(((r.total_penalties_scored ?? 0) / r.total_penalties_taken) * 100) }))
        .filter(({ pct }) => pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .map(({ r, pct }) => toEntry(r, pct));
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

      if (genderDb && rows.length > 0) {
        const athleteIds = [...new Set(rows.map((r) => r.athlete_id))];
        const { data: genderData } = await supabase.from("athletes").select("id").in("id", athleteIds).eq("gender", genderDb);
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

      // Prêmios e MOTW por edição (quando há filtros)
      if (editionIdsParaUsar.length > 0) {
        let statsAwardQuery = supabase
          .from("athlete_edition_stats")
          .select("athlete_id, motw_count, penalties_taken, penalties_scored, athletes!inner(gender)")
          .in("edition_id", editionIdsParaUsar);
        if (filtros.teamId) statsAwardQuery = statsAwardQuery.eq("team_id", filtros.teamId);
        if (genderDb) statsAwardQuery = statsAwardQuery.eq("athletes.gender", genderDb);

        const { data: awardStatsData } = await statsAwardQuery;
        const motwAgg = new Map<string, number>();
        const penAgg = new Map<string, { taken: number; scored: number }>();
        for (const r of (awardStatsData ?? []) as any[]) {
          motwAgg.set(r.athlete_id, (motwAgg.get(r.athlete_id) ?? 0) + (r.motw_count ?? 0));
          const p = penAgg.get(r.athlete_id) ?? { taken: 0, scored: 0 };
          p.taken += r.penalties_taken ?? 0;
          p.scored += r.penalties_scored ?? 0;
          penAgg.set(r.athlete_id, p);
        }

        const athleteMapMotw = await enriquecerAtletas(supabase, [...motwAgg.keys(), ...penAgg.keys()]);
        const toEntryFiltered = (id: string, value: number): AthleteEntry => {
          const a = athleteMapMotw.get(id);
          return { athlete_id: id, full_name: a?.full_name ?? "", surname: a?.surname ?? null, photo_url: a?.photo_url ?? null, team_name: a?.team_name ?? null, team_logo: a?.team_logo ?? null, value };
        };

        motw = Array.from(motwAgg.entries()).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => toEntryFiltered(id, v));
        penalty_conversion = Array.from(penAgg.entries())
          .filter(([, p]) => p.taken >= 3)
          .map(([id, p]) => ({ id, pct: Math.round((p.scored / p.taken) * 100) }))
          .filter(({ pct }) => pct > 0)
          .sort((a, b) => b.pct - a.pct)
          .map(({ id, pct }) => toEntryFiltered(id, pct));

        let editionAwardsQuery = supabase
          .from("edition_awards")
          .select("award_type, athlete_id, athletes!inner(gender)")
          .in("edition_id", editionIdsParaUsar)
          .in("award_type", ["mvp", "top_scorer", "top_assists", "best_goalkeeper"])
          .not("athlete_id", "is", null);
        if (genderDb) editionAwardsQuery = editionAwardsQuery.eq("athletes.gender", genderDb);

        const { data: editionAwardsData } = await editionAwardsQuery;
        const awardCounts = new Map<string, Map<string, number>>();
        for (const r of (editionAwardsData ?? []) as any[]) {
          if (!r.athlete_id) continue;
          if (!awardCounts.has(r.award_type)) awardCounts.set(r.award_type, new Map());
          const m = awardCounts.get(r.award_type)!;
          m.set(r.athlete_id, (m.get(r.athlete_id) ?? 0) + 1);
        }

        const buildAwardRanking = async (type: string): Promise<AthleteEntry[]> => {
          const counts = awardCounts.get(type);
          if (!counts) return [];
          const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
          const am = await enriquecerAtletas(supabase, ids);
          return [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).map(([id, v]) => {
            const a = am.get(id);
            return { athlete_id: id, full_name: a?.full_name ?? "", surname: a?.surname ?? null, photo_url: a?.photo_url ?? null, team_name: a?.team_name ?? null, team_logo: a?.team_logo ?? null, value: v };
          });
        };

        [mvp, top_scorer, top_assists, best_goalkeeper] = await Promise.all([
          buildAwardRanking("mvp"),
          buildAwardRanking("top_scorer"),
          buildAwardRanking("top_assists"),
          buildAwardRanking("best_goalkeeper"),
        ]);
      }
    }
  }

  // ─── Atletas – feitos especiais (athlete_match_achievements / career) ─────────

  let hat_tricks: AthleteEntry[]            = [];
  let pokers: AthleteEntry[]                = [];
  let manitas: AthleteEntry[]               = [];
  let participacoes_diretas: AthleteEntry[] = [];

  if (usarCareerStats) {
    let htQuery = supabase
      .from("athlete_career_stats")
      .select("athlete_id, total_hat_tricks, total_pokers, athletes!inner(gender)")
      .eq("organization_id", orgId);
    if (genderDb) htQuery = htQuery.eq("athletes.gender", genderDb);
    const { data: htCareer } = await htQuery;
    const htRows = (htCareer ?? []) as any[];
    if (htRows.length > 0) {
      const athleteMapHt = await enriquecerAtletas(supabase, htRows.map((r) => r.athlete_id));
      const toHtEntry = (r: any, value: number): AthleteEntry => {
        const a = athleteMapHt.get(r.athlete_id);
        return { athlete_id: r.athlete_id, full_name: a?.full_name ?? "", surname: a?.surname ?? null, photo_url: a?.photo_url ?? null, team_name: a?.team_name ?? null, team_logo: a?.team_logo ?? null, value };
      };
      hat_tricks = [...htRows].sort((a, b) => (b.total_hat_tricks ?? 0) - (a.total_hat_tricks ?? 0)).filter((r) => (r.total_hat_tricks ?? 0) > 0).map((r) => toHtEntry(r, r.total_hat_tricks));
      pokers     = [...htRows].sort((a, b) => (b.total_pokers ?? 0) - (a.total_pokers ?? 0)).filter((r) => (r.total_pokers ?? 0) > 0).map((r) => toHtEntry(r, r.total_pokers));
    }
  }

  const editionIdsAchiev: string[] = editionIds ?? await todasEdicoesOrg(supabase, orgId);

  if (!usarCareerStats && editionIdsAchiev.length > 0) {
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

      if (genderDb && entries.length > 0) {
        const ids = entries.map(([id]) => id);
        const { data: gd } = await supabase.from("athletes").select("id").in("id", ids).eq("gender", genderDb);
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

  // ─── Atletas – Mais finais ────────────────────────────────────────────────────

  let mais_finais: AthleteEntry[] = [];

  if (editionIdsAchiev.length > 0) {
    const phaseIdsFinais = await phaseIdsDasEdicoes(supabase, editionIdsAchiev);
    if (phaseIdsFinais.length > 0) {
      const { data: finalRounds } = await supabase
        .from("rounds")
        .select("id")
        .eq("name", "Final")
        .in("phase_id", phaseIdsFinais);

      const finalRoundIds = (finalRounds ?? []).map((r: any) => r.id);
      if (finalRoundIds.length > 0) {
        const { data: finalMatches } = await supabase
          .from("matches")
          .select("id")
          .in("round_id", finalRoundIds)
          .eq("status", "finished");

        const finalMatchIds = (finalMatches ?? []).map((m: any) => m.id);
        if (finalMatchIds.length > 0) {
          const { data: finalLineups } = await supabase
            .from("match_lineups")
            .select("athlete_id")
            .in("match_id", finalMatchIds)
            .eq("is_present", true);

          const finalCounts = new Map<string, number>();
          for (const l of (finalLineups ?? []) as any[]) {
            if (!l.athlete_id) continue;
            finalCounts.set(l.athlete_id, (finalCounts.get(l.athlete_id) ?? 0) + 1);
          }

          let entries = Array.from(finalCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

          if (genderDb && entries.length > 0) {
            const ids = entries.map(([id]) => id);
            const { data: gd } = await supabase.from("athletes").select("id").in("id", ids).eq("gender", genderDb);
            const validIds = new Set((gd ?? []).map((a: any) => a.id));
            entries = entries.filter(([id]) => validIds.has(id));
          }

          if (entries.length > 0) {
            const athleteMapFinais = await enriquecerAtletas(supabase, entries.map(([id]) => id));
            mais_finais = entries.map(([id, count]) => {
              const a = athleteMapFinais.get(id);
              return {
                athlete_id: id,
                full_name: a?.full_name ?? "",
                surname: a?.surname ?? null,
                photo_url: a?.photo_url ?? null,
                team_name: a?.team_name ?? null,
                team_logo: a?.team_logo ?? null,
                value: count,
              };
            });
          }
        }
      }
    }
  }

  // ─── Equipes – stats existentes ───────────────────────────────────────────

  const editionIdsEquipes = editionIds ?? await todasEdicoesOrg(supabase, orgId);

  let titulos: TeamEntry[]        = [];
  let vitorias: TeamEntry[]       = [];
  let aproveitamento: TeamEntry[] = [];
  let gols_marcados: TeamEntry[]  = [];
  let runner_up: TeamEntry[]      = [];
  let podios: TeamEntry[]         = [];
  let totw_appearances: TeamEntry[] = [];
  let mais_cleansheets: TeamEntry[] = [];

  if (usarCareerStats) {
    let tcQuery = supabase
      .from("team_career_stats")
      .select(`
        team_id, total_clean_sheets, total_totw_appearances,
        teams!inner(full_name, logo_url, gender, organization_id)
      `)
      .eq("teams.organization_id", orgId)
      .eq("teams.is_virtual", false);
    if (genderDb) tcQuery = tcQuery.eq("teams.gender", genderDb);
    if (filtros.teamId) tcQuery = tcQuery.eq("team_id", filtros.teamId);

    const { data: tcData } = await tcQuery;
    const tcRows = (tcData ?? []) as any[];
    const toTeamCareerEntry = (r: any, value: number): TeamEntry => ({
      team_id: r.team_id,
      full_name: r.teams?.full_name ?? "",
      logo_url: r.teams?.logo_url ?? null,
      value,
    });
    const sortTc = (field: string) =>
      [...tcRows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0)).filter((r) => (r[field] ?? 0) > 0).map((r) => toTeamCareerEntry(r, r[field]));

    mais_cleansheets   = sortTc("total_clean_sheets");
    totw_appearances   = sortTc("total_totw_appearances");
  }

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
    let teamsQuery = supabase.from("teams").select("id, full_name, logo_url, gender").in("id", teamIds).eq("organization_id", orgId).eq("is_virtual", false);
    if (genderDb) teamsQuery = teamsQuery.eq("gender", genderDb);
    const { data: teamsData } = await teamsQuery;
    const teamsMap = new Map((teamsData ?? []).map((t: any) => [t.id, t]));

    const { data: awardsData } = await supabase
      .from("edition_awards")
      .select("award_type, winning_team_id, athlete_id, staff_member_id")
      .in("award_type", ["champion", "runner_up", "third_place"])
      .in("edition_id", editionIdsEquipes)
      .not("winning_team_id", "is", null);

    let awardRows = (awardsData ?? []).filter(
      (a) => a.athlete_id === null && a.staff_member_id === null,
    ) as any[];
    if (genderDb && awardRows.length > 0) {
      const awardTeamIds = [...new Set(awardRows.map((a) => a.winning_team_id).filter(Boolean))];
        const { data: genderTeams } = await supabase.from("teams").select("id").in("id", awardTeamIds).eq("gender", genderDb).eq("is_virtual", false);
      const validTeamIds = new Set((genderTeams ?? []).map((t: any) => t.id));
      awardRows = awardRows.filter((a) => validTeamIds.has(a.winning_team_id));
    }

    const tituloCount = new Map<string, number>();
    const runnerUpCount = new Map<string, number>();
    const podioCount = new Map<string, number>();
    for (const a of awardRows) {
      if (!a.winning_team_id) continue;
      if (a.award_type === "champion") {
        tituloCount.set(a.winning_team_id, (tituloCount.get(a.winning_team_id) ?? 0) + 1);
        podioCount.set(a.winning_team_id, (podioCount.get(a.winning_team_id) ?? 0) + 1);
      }
      if (a.award_type === "runner_up") {
        runnerUpCount.set(a.winning_team_id, (runnerUpCount.get(a.winning_team_id) ?? 0) + 1);
        podioCount.set(a.winning_team_id, (podioCount.get(a.winning_team_id) ?? 0) + 1);
      }
      if (a.award_type === "third_place") {
        podioCount.set(a.winning_team_id, (podioCount.get(a.winning_team_id) ?? 0) + 1);
      }
    }

    const awardTeamIdsForLookup = [...new Set(awardRows.map((a) => a.winning_team_id).filter(Boolean))];
    const { data: awardTeamsData } = awardTeamIdsForLookup.length > 0
      ? await supabase.from("teams").select("id, full_name, logo_url").in("id", awardTeamIdsForLookup).eq("organization_id", orgId).eq("is_virtual", false)
      : { data: [] };
    const awardTeamsMap = new Map((awardTeamsData ?? []).map((t: any) => [t.id, t]));

    const toAwardTeamEntry = (entries: [string, number][]): TeamEntry[] =>
      entries.sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).map(([id, count]) => {
        const t = awardTeamsMap.get(id);
        return { team_id: id, full_name: t?.full_name ?? "", logo_url: t?.logo_url ?? null, value: count };
      });

    titulos   = toAwardTeamEntry([...tituloCount.entries()]);
    runner_up = toAwardTeamEntry([...runnerUpCount.entries()]);
    podios    = toAwardTeamEntry([...podioCount.entries()]);

    const aggArr = Array.from(teamAgg.entries())
      .filter(([id]) => teamsMap.has(id))
      .map(([id, stats]) => ({ team_id: id, ...stats, team: teamsMap.get(id) }));

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
        ? supabase.from("teams").select("id, full_name, logo_url").in("id", streakTeamIds).eq("is_virtual", false)
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
    const phaseIdsGoleada = await phaseIdsDasEdicoes(supabase, editionIdsEquipes);
    if (phaseIdsGoleada.length > 0) {
      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, team_a_id, team_b_id, score_a, score_b, phase_id, phases(edition_id)")
        .eq("status", "finished")
        .in("phase_id", phaseIdsGoleada)
        .not("score_a", "is", null)
        .not("score_b", "is", null);

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
          const sa = m.score_a ?? 0;
          const sb = m.score_b ?? 0;
          const diff = Math.abs(sa - sb);
          if (diff === 0) return null;
          const [winner, loser, sw, sl] = sa > sb
            ? [m.team_a_id, m.team_b_id, sa, sb]
            : [m.team_b_id, m.team_a_id, sb, sa];
          const editionId = m.phases?.edition_id as string | undefined;
          if (!winner || !loser || !editionId) return null;
          return { match_id: m.id, winner_team_id: winner, loser_team_id: loser, edition_id: editionId, score_winner: sw, score_loser: sl, diff };
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
          ? supabase.from("teams").select("id, full_name, logo_url").in("id", goleadaTeamIds).eq("is_virtual", false)
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
  }

  // ─── Equipes – Mais cleansheets ───────────────────────────────────────────────

  if (!usarCareerStats && editionIdsEquipes.length > 0) {
    const phaseIdsCs = await phaseIdsDasEdicoes(supabase, editionIdsEquipes);
    if (phaseIdsCs.length > 0) {
      const { data: csMatchesData } = await supabase
        .from("matches")
        .select("team_a_id, team_b_id, score_a, score_b")
        .eq("status", "finished")
        .in("phase_id", phaseIdsCs)
        .not("score_a", "is", null)
        .not("score_b", "is", null);

      if ((csMatchesData ?? []).length > 0) {
      const csCount = new Map<string, number>();

      for (const m of (csMatchesData ?? []) as any[]) {
        const sa = m.score_a ?? 0;
        const sb = m.score_b ?? 0;
        if (sb === 0 && m.team_a_id) {
          csCount.set(m.team_a_id, (csCount.get(m.team_a_id) ?? 0) + 1);
        }
        if (sa === 0 && m.team_b_id) {
          csCount.set(m.team_b_id, (csCount.get(m.team_b_id) ?? 0) + 1);
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
        let csTeamsQuery = supabase.from("teams").select("id, full_name, logo_url, gender").in("id", csTeamIds).eq("is_virtual", false);
        if (genderDb) csTeamsQuery = csTeamsQuery.eq("gender", genderDb);
        const { data: csTeamsData } = await csTeamsQuery;
        const csTeamsMap = new Map((csTeamsData ?? []).map((t: any) => [t.id, t]));

        mais_cleansheets = sortedCs
          .filter(([id]) => csTeamsMap.has(id))
          .map(([id, count]) => {
            const t = csTeamsMap.get(id);
            return { team_id: id, full_name: t?.full_name ?? "", logo_url: t?.logo_url ?? null, value: count };
          });
      }
    }
    }
  }

  // ─── Comissão Técnica ─────────────────────────────────────────────────────

  let tecnicos_titulos: StaffEntry[]    = [];
  let tecnicos_premiacoes: StaffEntry[] = [];
  let staff_partidas: StaffEntry[]      = [];
  let staff_motw: StaffEntry[]          = [];

  const toStaffEntry = (r: any, value: number, staff: any): StaffEntry => ({
    staff_member_id: r.staff_member_id,
    full_name: staff?.full_name ?? "",
    surname: staff?.surname ?? null,
    photo_url: staff?.photo_url ?? null,
    value,
  });

  if (usarCareerStats) {
    let scQuery = supabase
      .from("staff_career_stats")
      .select(`
        staff_member_id, total_titles, total_best_coach, total_matches_attended, total_motw,
        staff_members!inner(full_name, surname, photo_url, gender)
      `)
      .eq("organization_id", orgId);
    if (genderDb) scQuery = scQuery.eq("staff_members.gender", genderDb);

    const { data: scData } = await scQuery;
    const scRows = (scData ?? []) as any[];
    const sortStaff = (field: string) =>
      [...scRows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0)).filter((r) => (r[field] ?? 0) > 0).map((r) => toStaffEntry(r, r[field], r.staff_members));

    tecnicos_titulos    = sortStaff("total_titles");
    tecnicos_premiacoes = sortStaff("total_best_coach");
    staff_partidas      = sortStaff("total_matches_attended");
    staff_motw          = sortStaff("total_motw");
  } else if (editionIdsEquipes.length > 0) {
    let seQuery = supabase
      .from("staff_edition_stats")
      .select(`
        staff_member_id, total_titles, matches_attended, motw_count, best_coach_count,
        staff_members!inner(full_name, surname, photo_url, gender)
      `)
      .in("edition_id", editionIdsEquipes);
    if (genderDb) seQuery = seQuery.eq("staff_members.gender", genderDb);

    const { data: seData } = await seQuery;
    const agg = new Map<string, { titles: number; coach: number; matches: number; motw: number; staff: any }>();
    for (const r of (seData ?? []) as any[]) {
      if (!agg.has(r.staff_member_id)) {
        agg.set(r.staff_member_id, { titles: 0, coach: 0, matches: 0, motw: 0, staff: r.staff_members });
      }
      const e = agg.get(r.staff_member_id)!;
      e.titles  += r.total_titles ?? 0;
      e.coach   += r.best_coach_count ?? 0;
      e.matches += r.matches_attended ?? 0;
      e.motw    += r.motw_count ?? 0;
    }

    type StaffAgg = { titles: number; coach: number; matches: number; motw: number; staff: any };
    const buildStaffRanking = (getValue: (e: StaffAgg) => number): StaffEntry[] =>
      [...agg.entries()]
        .map(([id, e]) => ({ id, e, value: getValue(e) }))
        .filter(({ value }) => value > 0)
        .sort((a, b) => b.value - a.value)
        .map(({ id, e, value }) => ({
          staff_member_id: id,
          full_name: e.staff?.full_name ?? "",
          surname: e.staff?.surname ?? null,
          photo_url: e.staff?.photo_url ?? null,
          value,
        }));

    tecnicos_titulos    = buildStaffRanking((e) => e.titles);
    tecnicos_premiacoes = buildStaffRanking((e) => e.coach);
    staff_partidas      = buildStaffRanking((e) => e.matches);
    staff_motw          = buildStaffRanking((e) => e.motw);
  }

  return {
    artilharia, assistencias, partidas, cartoes_amarelos, motm, tots, totw, avg_rating, penalty_saves,
    hat_tricks, pokers, manitas, participacoes_diretas,
    mvp, top_scorer, top_assists, best_goalkeeper, motw, penalty_conversion, mais_finais,
    titulos, vitorias, aproveitamento, gols_marcados,
    sequencia_vitorias, sequencia_invicto, maior_goleada, mais_cleansheets,
    runner_up, podios, totw_appearances,
    tecnicos_titulos, tecnicos_premiacoes, staff_partidas, staff_motw,
  };
}

// ─── Recálculo ─────────────────────────────────────────────────────────────────

export async function recalcularEstatisticas(): Promise<{ success: true } | { error: string }> {
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

  const { data: athletes } = await supabase
    .from("athletes")
    .select("id")
    .eq("organization_id", orgId);

  for (const athlete of athletes ?? []) {
    const { error } = await supabase.rpc("recalculate_athlete_career_stats", {
      p_athlete_id: athlete.id,
    });
    if (error) return { error: error.message };
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("organization_id", orgId)
    .eq("is_virtual", false);

  for (const team of teams ?? []) {
    const { error } = await supabase.rpc("recalculate_team_career_stats", {
      p_team_id: team.id,
    });
    if (error) return { error: error.message };
  }

  // Recalcula achievements para todas as partidas finalizadas
  const { error: e3 } = await supabase.rpc("recalculate_match_achievements_all");
  if (e3) return { error: e3.message };

  const { data: staffEditions, error: e4 } = await supabase
    .from("match_staff_lineups")
    .select("staff_member_id, matches(phases(edition_id))");

  if (e4) return { error: e4.message };

  const staffEditionPairs = new Set<string>();
  const staffIds = new Set<string>();

  for (const row of (staffEditions ?? []) as any[]) {
    const staffId = row.staff_member_id as string | null;
    const editionId = row.matches?.phases?.edition_id as string | null;
    if (!staffId) continue;
    staffIds.add(staffId);
    if (editionId) staffEditionPairs.add(`${staffId}:${editionId}`);
  }

  for (const pair of staffEditionPairs) {
    const [staffId, editionId] = pair.split(":");
    const { error } = await supabase.rpc("recalculate_staff_edition_stats", {
      p_staff_member_id: staffId,
      p_edition_id: editionId,
    });
    if (error) return { error: error.message };
  }

  for (const staffId of staffIds) {
    const { error } = await supabase.rpc("recalculate_staff_career_stats", {
      p_staff_member_id: staffId,
    });
    if (error) return { error: error.message };
  }

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
    supabase.from("seasons").select("id, name, display_order").eq("organization_id", orgId).order("display_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("teams").select("id, full_name, logo_url").eq("organization_id", orgId).eq("is_virtual", false).order("full_name"),
  ]);
  return {
    competitions: (compsData ?? []) as FiltroOpcoes["competitions"],
    seasons: (seasonsData ?? []) as FiltroOpcoes["seasons"],
    teams: (teamsData ?? []) as FiltroOpcoes["teams"],
  };
}