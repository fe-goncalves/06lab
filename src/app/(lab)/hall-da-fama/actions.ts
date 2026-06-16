"use server";

import { createClient } from "@/lib/supabase-server";
import { buildHallCtx, queryCategoria } from "./categoria";

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface HallFiltros {
  competitionId?: string;
  seasonId?: string;
  yearId?: string;
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
  team_abbreviation?: string | null;
  value: number;
}

export interface TeamEntry {
  team_id: string;
  full_name: string;
  abbreviation: string | null;
  logo_url: string | null;
  value: number;
  subtitle?: string | null;
}

export interface StaffEntry {
  staff_member_id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  value: number;
}

export interface HallDaFamaData {
  // â”€â”€ Atletas â€“ stats existentes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  artilharia: AthleteEntry[];
  assistencias: AthleteEntry[];
  partidas: AthleteEntry[];
  cartoes_amarelos: AthleteEntry[];
  red_cards: AthleteEntry[];
  motm: AthleteEntry[];
  tots: AthleteEntry[];
  titles: AthleteEntry[];
  awards: AthleteEntry[];
  goal_assist: AthleteEntry[];
  penalty_goals: AthleteEntry[];
  shootout_goals: AthleteEntry[];
  best_match_goals: AthleteEntry[];
  clean_sheets: AthleteEntry[];
  totw: AthleteEntry[];
  avg_rating: AthleteEntry[];
  penalty_saves: AthleteEntry[];
  shootout_saves: AthleteEntry[];
  // â”€â”€ Atletas â€“ feitos especiais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  shootout_conversion: AthleteEntry[];
  mais_finais: AthleteEntry[];
  // â”€â”€ Equipes â€“ existentes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  titulos: TeamEntry[];
  vitorias: TeamEntry[];
  team_matches: TeamEntry[];
  team_points: TeamEntry[];
  aproveitamento: TeamEntry[];
  gols_marcados: TeamEntry[];
  // â”€â”€ Equipes â€“ novas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sequencia_vitorias: TeamEntry[];
  sequencia_invicto: TeamEntry[];
  maior_goleada: TeamEntry[];
  mais_cleansheets: TeamEntry[];
  runner_up: TeamEntry[];
  podios: TeamEntry[];
  totw_appearances: TeamEntry[];
  // â”€â”€ ComissÃ£o TÃ©cnica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  tecnicos_titulos: StaffEntry[];
  staff_wins: StaffEntry[];
  tecnicos_premiacoes: StaffEntry[];
  staff_partidas: StaffEntry[];
  staff_motw: StaffEntry[];
}

// â”€â”€â”€ Helper vazio (quando filtros nÃ£o tÃªm resultados) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function dadosVazios(): HallDaFamaData {
  return {
    artilharia: [], assistencias: [], partidas: [], cartoes_amarelos: [],
    red_cards: [], motm: [], tots: [], titles: [], awards: [], goal_assist: [],
    penalty_goals: [], shootout_goals: [], best_match_goals: [], clean_sheets: [],
    totw: [], avg_rating: [], penalty_saves: [], shootout_saves: [],
    hat_tricks: [], pokers: [], manitas: [], participacoes_diretas: [],
    mvp: [], top_scorer: [], top_assists: [], best_goalkeeper: [], motw: [], penalty_conversion: [], shootout_conversion: [], mais_finais: [],
    titulos: [], vitorias: [], team_matches: [], team_points: [], aproveitamento: [], gols_marcados: [],
    sequencia_vitorias: [], sequencia_invicto: [], maior_goleada: [], mais_cleansheets: [],
    runner_up: [], podios: [], totw_appearances: [],
    tecnicos_titulos: [], staff_wins: [], tecnicos_premiacoes: [], staff_partidas: [], staff_motw: [],
  };
}

async function autenticarOrg(): Promise<
  { supabase: Awaited<ReturnType<typeof createClient>>; orgId: string } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  return { supabase, orgId: profile.organization_id };
}

// â”€â”€â”€ Busca lazy por categoria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function buscarCategoria(
  filtros: HallFiltros,
  categoryKey: string,
): Promise<AthleteEntry[] | TeamEntry[] | StaffEntry[] | { error: string }> {
  const auth = await autenticarOrg();
  if ("error" in auth) return auth;

  const ctx = await buildHallCtx(auth.supabase, auth.orgId, filtros);
  if (ctx.editionIds !== null && ctx.editionIds.length === 0) return [];

  return queryCategoria(ctx, categoryKey);
}

// â”€â”€â”€ SSR inicial (apenas artilharia) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function buscarHallDaFama(
  filtros: HallFiltros = {},
): Promise<HallDaFamaData | { error: string }> {
  const artilharia = await buscarCategoria(filtros, "goals");
  if ("error" in artilharia) return artilharia;
  return { ...dadosVazios(), artilharia };
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

// â”€â”€â”€ OpÃ§Ãµes de filtro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FiltroOpcoes {
  competitions: { id: string; full_name: string; short_name: string | null; logo_url: string | null }[];
  seasons: { id: string; name: string }[];
  years: { id: string; value: number }[];
  teams: { id: string; full_name: string; short_name: string | null; abbreviation: string | null; logo_url: string | null }[];
}

export async function buscarOpcoesFiltro(): Promise<FiltroOpcoes | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("auth_user_id", user.id).maybeSingle();
  if (!profile?.organization_id) return { error: "Organização não encontrada." };
  const orgId = profile.organization_id;
  const [{ data: compsData }, { data: seasonsData }, { data: yearsData }, { data: teamsData }] = await Promise.all([
    supabase.from("competitions").select("id, full_name, short_name, logo_url").eq("organization_id", orgId).order("full_name"),
    supabase.from("seasons").select("id, name, display_order").eq("organization_id", orgId).order("display_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("years").select("id, value").eq("organization_id", orgId).order("value", { ascending: false }),
    supabase.from("teams").select("id, full_name, short_name, abbreviation, logo_url").eq("organization_id", orgId).eq("is_virtual", false).order("full_name"),
  ]);
  return {
    competitions: (compsData ?? []) as FiltroOpcoes["competitions"],
    seasons: (seasonsData ?? []) as FiltroOpcoes["seasons"],
    years: (yearsData ?? []) as FiltroOpcoes["years"],
    teams: (teamsData ?? []) as FiltroOpcoes["teams"],
  };
}
