"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return profile?.organization_id ?? "";
}

function fmtData(date: string | null | undefined): string {
  if (!date) return "—";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmtDoc(digits: string | null | undefined): string {
  if (!digits) return "—";
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 9)  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4");
  return digits;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CompetitionOption = { id: string; nome: string };
export type EditionOption     = { id: string; nome: string };
export type PhaseOption       = { id: string; nome: string };
export type TeamOption        = { id: string; nome: string };

export type R1Row = { "Nome Completo": string; RG: string; CPF: string; "Data de Nascimento": string; Equipe: string; Edição: string; "Status da Inscrição": string };
export type R2Row = { Nome: string; Equipe: string; Edição: string; "Partidas Jogadas": number; Gols: number; Assistências: number; "Cartões Amarelos": number; "Cartões Vermelhos": number };
export type R3Row = { Data: string; Hora: string; Local: string; "Equipe A": string; Placar: string; "Equipe B": string; Fase: string; Rodada: string; Edição: string; Status: string };
export type R4Row = { Atleta: string; Equipe: string; Edição: string; Motivo: string; "Partidas Totais": number; "Partidas Restantes": number; "Data de Início": string; Status: string };
export type R5Row = { "Data da Partida": string; Equipes: string; Edição: string; Árbitro: string; Função: string };
export type R6Row = { "Tipo de Premiação": string; Premiado: string; Edição: string };

// ─── Carregamento de filtros ──────────────────────────────────────────────────

export async function carregarCompeticoes(): Promise<CompetitionOption[] | { error: string }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from("competitions")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .order("full_name");
  if (error) return { error: error.message };
  return (data ?? []).map((c: any) => ({ id: c.id, nome: c.full_name }));
}

export async function carregarEdicoes(competitionId: string): Promise<EditionOption[] | { error: string }> {
  if (!competitionId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_editions")
    .select("id, custom_name, seasons(name)")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return (data ?? []).map((e: any) => ({
    id: e.id,
    nome: e.custom_name ?? e.seasons?.name ?? "—",
  }));
}

export async function carregarFases(editionId: string): Promise<PhaseOption[] | { error: string }> {
  if (!editionId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select("id, full_name, custom_label")
    .eq("edition_id", editionId)
    .order("display_order");
  if (error) return { error: error.message };
  return (data ?? []).map((p: any) => ({ id: p.id, nome: p.custom_label ?? p.full_name }));
}

export async function carregarEquipesDaEdicao(editionId: string): Promise<TeamOption[] | { error: string }> {
  if (!editionId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edition_teams")
    .select("team_id, teams!inner(full_name)")
    .eq("edition_id", editionId)
    .eq("is_free_agent_pool", false);
  if (error) return { error: error.message };
  return (data ?? [])
    .map((et: any) => ({ id: et.team_id, nome: et.teams?.full_name ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// ─── Helper: resolve edition_ids a partir de competition_id ou edition_id ────
// Quando edition_id não é passado, busca todas as edições da competição.

async function resolveEditionIds(params: {
  competition_id: string;
  edition_id?: string;
}): Promise<string[] | { error: string }> {
  if (params.edition_id) return [params.edition_id];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_editions")
    .select("id")
    .eq("competition_id", params.competition_id);
  if (error) return { error: error.message };
  return (data ?? []).map((e: any) => e.id);
}

async function editionLabel(supabase: any, editionId: string): Promise<string> {
  const { data } = await supabase
    .from("competition_editions")
    .select("custom_name, seasons(name)")
    .eq("id", editionId)
    .maybeSingle();
  return data?.custom_name ?? data?.seasons?.name ?? "—";
}

// ─── R1 — Lista de atletas inscritos ─────────────────────────────────────────

export async function relatorioAtletasInscritos(params: {
  competition_id: string;
  edition_id?: string;
  team_id?: string;
}): Promise<R1Row[] | { error: string }> {
  if (!params.competition_id) return { error: "Selecione a competição." };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const ids = await resolveEditionIds(params);
  if ("error" in ids) return ids;
  if (!ids.length) return [];

  // Busca label das edições para exibir na coluna
  const edLabels: Record<string, string> = {};
  for (const id of ids) edLabels[id] = await editionLabel(supabase, id);

  let query = supabase
    .from("edition_roster_entries")
    .select(`
      status, member_type,
      athletes!inner(full_name, surname, rg, cpf, birth_date),
      edition_teams!inner(
        team_id, edition_id,
        teams!inner(full_name, organization_id)
      )
    `)
    .eq("member_type", "athlete")
    .in("edition_teams.edition_id", ids)
    .eq("edition_teams.teams.organization_id", orgId);

  if (params.team_id) query = query.eq("edition_teams.team_id", params.team_id);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return (data ?? []).map((row: any) => ({
    "Nome Completo": [row.athletes?.full_name, row.athletes?.surname].filter(Boolean).join(" "),
    RG: fmtDoc(row.athletes?.rg),
    CPF: fmtDoc(row.athletes?.cpf),
    "Data de Nascimento": fmtData(row.athletes?.birth_date),
    Equipe: row.edition_teams?.teams?.full_name ?? "—",
    Edição: edLabels[row.edition_teams?.edition_id] ?? "—",
    "Status da Inscrição": row.status === "approved" ? "Aprovado" : "Pendente",
  }));
}

// ─── R2 — Estatísticas de atletas ─────────────────────────────────────────────

export async function relatorioEstatisticasAtletas(params: {
  competition_id: string;
  edition_id?: string;
}): Promise<R2Row[] | { error: string }> {
  if (!params.competition_id) return { error: "Selecione a competição." };

  const supabase = await createClient();
  const ids = await resolveEditionIds(params);
  if ("error" in ids) return ids;
  if (!ids.length) return [];

  const edLabels: Record<string, string> = {};
  for (const id of ids) edLabels[id] = await editionLabel(supabase, id);

  const { data, error } = await supabase
    .from("athlete_edition_stats")
    .select(`
      edition_id, goals, assists, yellow_cards, red_cards, matches_played,
      athletes!inner(full_name, surname),
      teams!inner(full_name)
    `)
    .in("edition_id", ids)
    .order("goals", { ascending: false });

  if (error) return { error: error.message };

  return (data ?? []).map((row: any) => ({
    Nome: [row.athletes?.full_name, row.athletes?.surname].filter(Boolean).join(" "),
    Equipe: row.teams?.full_name ?? "—",
    Edição: edLabels[row.edition_id] ?? "—",
    "Partidas Jogadas": row.matches_played ?? 0,
    Gols: row.goals ?? 0,
    Assistências: row.assists ?? 0,
    "Cartões Amarelos": row.yellow_cards ?? 0,
    "Cartões Vermelhos": row.red_cards ?? 0,
  }));
}

// ─── R3 — Resultados de partidas ──────────────────────────────────────────────

export async function relatorioResultadosPartidas(params: {
  competition_id: string;
  edition_id?: string;
  phase_id?: string;
}): Promise<R3Row[] | { error: string }> {
  if (!params.competition_id) return { error: "Selecione a competição." };

  const supabase = await createClient();
  const ids = await resolveEditionIds(params);
  if ("error" in ids) return ids;
  if (!ids.length) return [];

  const edLabels: Record<string, string> = {};
  for (const id of ids) edLabels[id] = await editionLabel(supabase, id);

  const statusLabel: Record<string, string> = {
    scheduled: "Agendada",
    ongoing: "Em andamento",
    finished: "Finalizada",
    postponed: "Adiada",
  };

  let query = supabase
    .from("matches")
    .select(`
      match_date, match_time, score_a, score_b, status,
      venues(full_name),
      teams_a:teams!matches_team_a_id_fkey(full_name),
      teams_b:teams!matches_team_b_id_fkey(full_name),
      phases!inner(full_name, custom_label, edition_id),
      rounds(name, custom_label)
    `)
    .in("phases.edition_id", ids)
    .order("match_date", { ascending: true });

  if (params.phase_id) query = query.eq("phase_id", params.phase_id);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return (data ?? []).map((row: any) => ({
    Data: fmtData(row.match_date),
    Hora: row.match_time ? String(row.match_time).slice(0, 5) : "—",
    Local: row.venues?.full_name ?? "—",
    "Equipe A": row.teams_a?.full_name ?? "—",
    Placar: row.score_a != null && row.score_b != null ? `${row.score_a} x ${row.score_b}` : "— x —",
    "Equipe B": row.teams_b?.full_name ?? "—",
    Fase: row.phases?.custom_label ?? row.phases?.full_name ?? "—",
    Rodada: row.rounds?.custom_label ?? row.rounds?.name ?? "—",
    Edição: edLabels[row.phases?.edition_id] ?? "—",
    Status: statusLabel[row.status] ?? row.status ?? "—",
  }));
}

// ─── R4 — Histórico de suspensões ────────────────────────────────────────────

export async function relatorioSuspensoes(params: {
  competition_id: string;
  edition_id?: string;
}): Promise<R4Row[] | { error: string }> {
  if (!params.competition_id) return { error: "Selecione a competição." };

  const supabase = await createClient();
  const ids = await resolveEditionIds(params);
  if ("error" in ids) return ids;
  if (!ids.length) return [];

  const edLabels: Record<string, string> = {};
  for (const id of ids) edLabels[id] = await editionLabel(supabase, id);

  const { data, error } = await supabase
    .from("suspensions")
    .select(`
      scope_edition_id, games_total, games_remaining, starts_at, is_active, reason,
      athletes!inner(
        full_name, surname,
        athlete_team_stints(is_current, teams!inner(full_name))
      )
    `)
    .in("scope_edition_id", ids)
    .order("is_active", { ascending: false })
    .order("starts_at", { ascending: false });

  if (error) return { error: error.message };

  return (data ?? []).map((row: any) => {
    const currentStint = (row.athletes?.athlete_team_stints ?? []).find((s: any) => s.is_current);
    return {
      Atleta: [row.athletes?.full_name, row.athletes?.surname].filter(Boolean).join(" "),
      Equipe: currentStint?.teams?.full_name ?? "—",
      Edição: edLabels[row.scope_edition_id] ?? "—",
      Motivo: row.reason ?? "—",
      "Partidas Totais": row.games_total ?? 0,
      "Partidas Restantes": row.games_remaining ?? 0,
      "Data de Início": fmtData(row.starts_at),
      Status: row.is_active ? "Ativo" : "Inativo",
    };
  });
}

// ─── R5 — Árbitros por partida ────────────────────────────────────────────────

export async function relatorioArbitrosPorPartida(params: {
  competition_id: string;
  edition_id?: string;
  phase_id?: string;
}): Promise<R5Row[] | { error: string }> {
  if (!params.competition_id) return { error: "Selecione a competição." };

  const supabase = await createClient();
  const ids = await resolveEditionIds(params);
  if ("error" in ids) return ids;
  if (!ids.length) return [];

  const edLabels: Record<string, string> = {};
  for (const id of ids) edLabels[id] = await editionLabel(supabase, id);

  let matchQuery = supabase
    .from("matches")
    .select(`
      id, match_date,
      teams_a:teams!matches_team_a_id_fkey(full_name),
      teams_b:teams!matches_team_b_id_fkey(full_name),
      phases!inner(edition_id)
    `)
    .in("phases.edition_id", ids);

  if (params.phase_id) matchQuery = matchQuery.eq("phase_id", params.phase_id);

  const { data: matches, error: mErr } = await matchQuery;
  if (mErr) return { error: mErr.message };
  if (!matches?.length) return [];

  const matchIds = (matches as any[]).map((m) => m.id);

  const { data: refs, error: rErr } = await supabase
    .from("match_referees")
    .select(`
      match_id,
      referees!inner(full_name, surname),
      referee_roles(full_name)
    `)
    .in("match_id", matchIds);

  if (rErr) return { error: rErr.message };

  const matchMap: Record<string, { date: string; teams: string; editionId: string }> =
    Object.fromEntries(
      (matches as any[]).map((m) => [
        m.id,
        {
          date: m.match_date,
          teams: `${m.teams_a?.full_name ?? "—"} x ${m.teams_b?.full_name ?? "—"}`,
          editionId: m.phases?.edition_id ?? "",
        },
      ])
    );

  return (refs ?? []).map((row: any) => ({
    "Data da Partida": fmtData(matchMap[row.match_id]?.date),
    Equipes: matchMap[row.match_id]?.teams ?? "—",
    Edição: edLabels[matchMap[row.match_id]?.editionId] ?? "—",
    Árbitro: [row.referees?.full_name, row.referees?.surname].filter(Boolean).join(" "),
    Função: row.referee_roles?.full_name ?? "—",
  }));
}

// ─── R6 — Premiações por edição ───────────────────────────────────────────────

export async function relatorioPremiacoes(params: {
  competition_id: string;
  edition_id?: string;
}): Promise<R6Row[] | { error: string }> {
  if (!params.competition_id) return { error: "Selecione a competição." };

  const supabase = await createClient();
  const ids = await resolveEditionIds(params);
  if ("error" in ids) return ids;
  if (!ids.length) return [];

  const edLabels: Record<string, string> = {};
  for (const id of ids) edLabels[id] = await editionLabel(supabase, id);

  const { data, error } = await supabase
    .from("edition_awards")
    .select(`
      edition_id, award_type,
      athletes(full_name, surname),
      winning_team:teams!edition_awards_winning_team_id_fkey(full_name),
      staff_members(full_name, surname)
    `)
    .in("edition_id", ids);

  if (error) return { error: error.message };

  const awardLabel: Record<string, string> = {
    top_scorer: "Artilheiro", top_assists: "Garçom", mvp: "MVP",
    best_goalkeeper: "Melhor Goleiro", revelation: "Revelação",
    best_defense: "Melhor Defesa", best_performance: "Melhor Desempenho",
    champion: "Campeão", runner_up: "Vice-campeão", third_place: "Terceiro Lugar",
  };

  return (data ?? []).map((row: any) => {
    let premiado = "—";
    if (row.athletes?.full_name) {
      premiado = [row.athletes.full_name, row.athletes.surname].filter(Boolean).join(" ");
    } else if (row.winning_team?.full_name) {
      premiado = row.winning_team.full_name;
    } else if (row.staff_members?.full_name) {
      premiado = [row.staff_members.full_name, row.staff_members.surname].filter(Boolean).join(" ");
    }
    return {
      "Tipo de Premiação": awardLabel[row.award_type] ?? row.award_type ?? "—",
      Premiado: premiado,
      Edição: edLabels[row.edition_id] ?? "—",
    };
  });
}