// COMPETICAO-HUB

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "@/app/(lab)/components/toast";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import Link from "next/link";
import { ChevronDown, Plus, ChevronRight, Users, X, Check, Trash2 } from "lucide-react";
import { criarEdicao, editarEdicao, inscreverAtleta, removerAtletaEdicao, atribuirPremiacao, removerPremiacao, criarConfronto, criarPartidaNoConfronto, editarTimesConfronto } from "./edicoes/actions";
import { criarPartida, deletarPartida } from "@/app/(lab)/partidas/[matchId]/actions";
import { criarOuAtualizarTOTW, criarOuAtualizarMOTW, deletarSquad } from "./edicoes/actions";
import { Star, Search } from "lucide-react";

type Competition = any;
type Edition = { id: string; season_id: string; status: string; season_name: string; year_value: number };
type Season = { id: string; name: string; year_value: number };
type Team = { id: string; full_name: string; abbreviation: string | null; logo_url: string | null };
type Match = {
  id: string; match_date: string | null; match_time: string | null; status: string;
  score_a: number; score_b: number; matchup_id: string | null;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  rounds: { name: string; custom_label: string | null } | null;
  phases: { id: string; full_name: string; custom_label: string | null; phase_type: string } | null;
};
type Phase = { id: string; full_name: string; custom_label: string | null; phase_type: string; display_order: number; is_current: boolean };
type Round = { id: string; name: string; custom_label: string | null; phase_id: string; display_order: number; is_current: boolean; legs: boolean; aggregate_score: boolean };
type EditionTeam = { id: string; team_id: string; arrival_origin: string | null; is_free_agent_pool: boolean; teams: Team | null };
type Standing = any;
type Scorer = any;

const STATUS_LABEL: Record<string, string> = { scheduled: "AG", ongoing: "AO VIVO", finished: "FT", postponed: "AD" };
const STATUS_COLOR: Record<string, string> = { scheduled: "#A6A6A6", ongoing: "#BFF205", finished: "#A6A6A6", postponed: "#FF4444" };
const PHASE_TYPE_LABEL: Record<string, string> = {
  round_robin: "Pontos Corridos",
  group_stage: "Fase de Grupos",
  knockout: "Mata-mata",
  conference: "Conferência",
};
const AWARD_LABELS: Record<string, string> = {
  top_scorer: "Artilheiro", top_assists: "Garçom", mvp: "MVP", best_goalkeeper: "Melhor Goleiro",
  revelation: "Revelação", best_defense: "Melhor Defesa", best_performance: "Melhor Desempenho",
  champion: "Campeão", runner_up: "Vice-campeão", third_place: "Terceiro Lugar",
};

export default function CompeticaoHub({ competition, editions, seasons, allTeams, orgId }: {
  competition: Competition; editions: Edition[]; seasons: Season[]; allTeams: Team[]; orgId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"jogos" | "classificacao" | "estatisticas" | "competicao" | "configuracoes">("jogos");
  const [activeStatsTab, setActiveStatsTab] = useState<"geral" | "semanal">("geral");
  const [activeCompTab, setActiveCompTab] = useState<"fases" | "equipes">("fases");
  const [activeConfigTab, setActiveConfigTab] = useState<"gerais" | "premiacoes" | "inscricoes" | "ranking">("gerais");
  const [selectedEditionId, setSelectedEditionId] = useState<string>(searchParams.get("edicao") ?? editions[0]?.id ?? "");
  const [showEditionDropdown, setShowEditionDropdown] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [editionTeams, setEditionTeams] = useState<EditionTeam[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupTeams, setGroupTeams] = useState<any[]>([]);
  const [matchFilterPhaseId, setMatchFilterPhaseId] = useState<string>("");
  const [venues, setVenues] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Novo confronto (fases eliminatórias)
  const [showNovoConfronto, setShowNovoConfronto] = useState(false);
  

  // Nova partida
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [newMatchPhaseId, setNewMatchPhaseId] = useState("");
  const [newMatchRoundId, setNewMatchRoundId] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchTime, setNewMatchTime] = useState("");
  const [newMatchVenueId, setNewMatchVenueId] = useState("");
  const [newMatchTeamA, setNewMatchTeamA] = useState("");
  const [newMatchTeamB, setNewMatchTeamB] = useState("");
  const [newMatchAddAnother, setNewMatchAddAnother] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [newMatchError, setNewMatchError] = useState<string | null>(null);
  const [newMatchIsSecondLeg, setNewMatchIsSecondLeg] = useState(false);

  // Elenco
  const [elencoModal, setElencoModal] = useState<{ editionTeamId: string; teamName: string } | null>(null);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);
  const [availableAthletes, setAvailableAthletes] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Nova edição
  const [showNewEdition, setShowNewEdition] = useState(false);
  const [newEditionSeasonId, setNewEditionSeasonId] = useState("");
  const [savingEdition, setSavingEdition] = useState(false);

  // Premiações
  const [awards, setAwards] = useState<any[]>([]);
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [awardType, setAwardType] = useState("");
  const [awardAthleteId, setAwardAthleteId] = useState("");
  const [awardTeamId, setAwardTeamId] = useState("");
  const [savingAward, setSavingAward] = useState(false);
  const [editionAthletes, setEditionAthletes] = useState<any[]>([]);

  const [phaseTeamIds, setPhaseTeamIds] = useState<string[]>([]);
  const [loadingPhaseTeams, setLoadingPhaseTeams] = useState(false);

  // Modal adicionar equipe
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);

  const [jobsSubTab, setJobsSubTab] = useState<"confrontos" | "partidas">("confrontos");
  const [editingMatchup, setEditingMatchup] = useState<any | null>(null);

  const [novoMatchPreselectedPhaseId, setNovoMatchPreselectedPhaseId] = useState("");

  const selectedEdition = editions.find(e => e.id === selectedEditionId);
  const selectedPhase = phases.find(p => p.id === selectedPhaseId);
  const isClassificatory = (type: string) => type === "round_robin" || type === "group_stage";
  const isEliminatoria = (type: string) => type === "knockout" || type === "conference";

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  async function getPhaseIds(supabase: any, editionId: string): Promise<string[]> {
    const { data } = await supabase.from("phases").select("id").eq("edition_id", editionId);
    return (data ?? []).map((p: any) => p.id);
  }

  const loadEditionData = useCallback(async (editionId: string) => {
    if (!editionId) return;
    const supabase = createClient();
    setLoadingMatches(true);
    const phaseIds = await getPhaseIds(supabase, editionId);
    const [
      { data: matchesData }, { data: phasesData }, { data: roundsData }, { data: teamsData },
      { data: standingsData }, { data: scorersData }, { data: matchupsData }, { data: venuesData },
      { data: groupsData },
    ] = await Promise.all([
      phaseIds.length > 0
      ? supabase.from("matches").select("id, match_date, match_time, status, score_a, score_b, matchup_id, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url), rounds(name, custom_label), phases(id, full_name, custom_label, phase_type)").in("phase_id", phaseIds).order("match_date", { ascending: true })
        : Promise.resolve({ data: [] }),
        supabase.from("phases").select("id, full_name, custom_label, phase_type, display_order, is_current, legs, aggregate_score").eq("edition_id", editionId).order("display_order"),
      phaseIds.length > 0
        ? supabase.from("rounds").select("id, name, custom_label, phase_id, display_order, is_current, legs, aggregate_score").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
        supabase.from("edition_teams").select("id, team_id, arrival_origin, is_free_agent_pool, teams(id, full_name, abbreviation, logo_url)").eq("edition_id", editionId).order("display_order"),
      supabase.from("team_edition_stats").select("*, teams(id, full_name, abbreviation, logo_url, primary_color)").eq("edition_id", editionId).order("points", { ascending: false }).order("goals_scored", { ascending: false }),
      supabase.from("athlete_edition_stats").select("*, athletes(id, full_name, surname, photo_url), team:teams(id, full_name, abbreviation)").eq("edition_id", editionId).order("goals", { ascending: false }).limit(30),
      phaseIds.length > 0
        ? supabase.from("matchups").select("id, round_label, display_order, is_completed, phase_id, team_a_id, team_b_id").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
      supabase.from("venues").select("id, full_name").eq("organization_id", orgId).order("full_name"),
      phaseIds.length > 0
        ? supabase.from("groups").select("id, name, custom_label, display_order, phase_id").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
    ]);

    const phasesResult = (phasesData as Phase[]) ?? [];
    const currentPhase = phasesResult.find(p => p.is_current) ?? phasesResult[0];
    if (currentPhase) setSelectedPhaseId(currentPhase.id);
    setMatches((matchesData as any) ?? []);
    setPhases(phasesResult);
    setRounds((roundsData as any) ?? []);
    setEditionTeams((teamsData as any) ?? []);
    setStandings(standingsData ?? []);
    setScorers(scorersData ?? []);

    // Enriquece matchups com dados dos times
    const rawMatchups = (matchupsData as any[]) ?? [];
    const allTeamIds = [...new Set(rawMatchups.flatMap((m: any) => [m.team_a_id, m.team_b_id].filter(Boolean)))];
    let teamsMap: Record<string, any> = {};
    if (allTeamIds.length > 0) {
      const { data: teamsData2 } = await supabase.from("teams").select("id, full_name, abbreviation, logo_url").in("id", allTeamIds);
      (teamsData2 ?? []).forEach((t: any) => { teamsMap[t.id] = t; });
    }
    const enrichedMatchups = rawMatchups.map((m: any) => ({
      ...m,
      teams_a: m.team_a_id ? teamsMap[m.team_a_id] ?? null : null,
      teams_b: m.team_b_id ? teamsMap[m.team_b_id] ?? null : null,
    }));

    setMatchups(enrichedMatchups);
    setVenues(venuesData ?? []);
    setGroups((groupsData as any) ?? []);

    const groupIds = (groupsData ?? []).map((g: any) => g.id);
    if (groupIds.length > 0) {
      const { data: gtData } = await supabase
        .from("group_teams").select("group_id, edition_team_id").in("group_id", groupIds);
      setGroupTeams(gtData ?? []);
    } else {
      setGroupTeams([]);
    }

    setLoadingMatches(false);
  }, [orgId]);

  async function loadAwards(editionId: string) {
    setLoadingAwards(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("edition_awards")
      .select("id, award_type, athlete_id, winning_team_id, athletes(id, full_name, surname, photo_url), teams:teams!edition_awards_winning_team_id_fkey(id, full_name, abbreviation, logo_url)")
      .eq("edition_id", editionId).order("award_type");
    setAwards(data ?? []);
    setLoadingAwards(false);
  }

  async function loadEditionAthletes(editionId: string) {
    const supabase = createClient();
    const { data: etData } = await supabase.from("edition_teams").select("id").eq("edition_id", editionId);
    const editionTeamIds = (etData ?? []).map((e: any) => e.id);
    if (editionTeamIds.length === 0) { setEditionAthletes([]); return; }
    const { data } = await supabase
      .from("edition_roster_entries")
      .select("athlete_id, edition_team_id, athletes(id, full_name, surname), edition_teams(team_id, teams(full_name))")
      .eq("member_type", "athlete").eq("status", "approved")
      .in("edition_team_id", editionTeamIds);
    setEditionAthletes(data ?? []);
  }

  useEffect(() => {
    if (selectedEditionId) {
      loadEditionData(selectedEditionId);
      loadAwards(selectedEditionId);
      loadEditionAthletes(selectedEditionId);
    }
  }, [selectedEditionId, loadEditionData]);

  const selectedNewMatchPhase = phases.find(p => p.id === newMatchPhaseId);
  const roundsForSelectedPhase = rounds.filter(r => r.phase_id === newMatchPhaseId);
  const teamsForEdition = editionTeams
    .filter(et => !et.is_free_agent_pool && et.teams != null)
    .map(et => et.teams) as Team[];

  const teamsForSelectedPhase = newMatchPhaseId && phaseTeamIds.length > 0
    ? editionTeams
        .filter(et => !et.is_free_agent_pool && et.teams != null && phaseTeamIds.includes(et.team_id))
        .map(et => et.teams) as Team[]
    : teamsForEdition;

  async function handleCreateMatch() {
    if (!newMatchPhaseId || !newMatchTeamA || !newMatchTeamB) { setNewMatchError("Fase e equipes são obrigatórias."); return; }
    setCreatingMatch(true); setNewMatchError(null);
    const fd = new FormData();
    fd.append("team_a_id", newMatchTeamA);
    fd.append("team_b_id", newMatchTeamB);
    fd.append("team_a_is_home", "true");
    if (newMatchDate) fd.append("match_date", newMatchDate);
    if (newMatchTime) fd.append("match_time", newMatchTime);
    if (newMatchVenueId) fd.append("venue_id", newMatchVenueId);
    if (newMatchRoundId) fd.append("round_id", newMatchRoundId);
    if (newMatchIsSecondLeg) fd.append("is_second_leg", "true");
    const result = await criarPartida(newMatchPhaseId, fd);
    setCreatingMatch(false);
    if ("error" in result) { setNewMatchError(result.error); return; }
    toast("success", "Partida criada.");
    if (newMatchAddAnother) {
      setNewMatchTeamA(""); setNewMatchTeamB("");
    } else {
      setShowNewMatch(false);
      setNewMatchPhaseId(""); setNewMatchRoundId("");
      setNewMatchDate(""); setNewMatchTime(""); setNewMatchVenueId("");
      setNewMatchTeamA(""); setNewMatchTeamB("");
    }
    await loadEditionData(selectedEditionId);
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm("Excluir esta partida?")) return;
    const result = await deletarPartida(matchId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Partida excluída.");
    setMatches(prev => prev.filter(m => m.id !== matchId));
  }

  async function loadPhaseTeams(phaseId: string) {
    if (!phaseId) { setPhaseTeamIds([]); return; }
    setLoadingPhaseTeams(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("phase_teams")
      .select("edition_team_id")
      .eq("phase_id", phaseId);
    const etIds = (data ?? []).map((r: any) => r.edition_team_id);
    // Mapeia edition_team_id → team_id
    const teamIds = editionTeams
      .filter(et => etIds.includes(et.id))
      .map(et => et.team_id);
    setPhaseTeamIds(teamIds);
    setLoadingPhaseTeams(false);
  }

  async function openElencoModal(editionTeamId: string, teamId: string, teamName: string) {
    setElencoModal({ editionTeamId, teamName }); setLoadingRoster(true);
    const supabase = createClient();
    const [{ data: entries }, { data: currentAthletes }] = await Promise.all([
      supabase.from("edition_roster_entries").select("id, athlete_id, status, athletes(id, full_name, surname, photo_url, position_id)").eq("edition_team_id", editionTeamId).eq("member_type", "athlete"),
      supabase.from("athlete_team_stints").select("athlete_id, athletes(id, full_name, surname, photo_url, position_id)").eq("team_id", teamId).eq("is_current", true),
    ]);
    const inscribedIds = new Set((entries ?? []).map((e: any) => e.athlete_id));
    const available = (currentAthletes ?? []).map((s: any) => s.athletes).filter(Boolean).filter((a: any) => !inscribedIds.has(a.id));
    setRosterEntries((entries as any) ?? []); setAvailableAthletes(available); setLoadingRoster(false);
  }

  async function handleInscrever(athleteId: string, positionId: string | null) {
    if (!elencoModal) return;
    const result = await inscreverAtleta(elencoModal.editionTeamId, athleteId, positionId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Atleta inscrito.");
    await openElencoModal(elencoModal.editionTeamId, "", elencoModal.teamName);
  }

  async function handleRemoverInscricao(entryId: string) {
    const result = await removerAtletaEdicao(entryId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Inscrição removida.");
    setRosterEntries(prev => prev.filter((e: any) => e.id !== entryId));
  }

  async function handleAdicionarEquipeHub(teamId: string) {
    setAddingTeamId(teamId);
    const result = await adicionarEquipeEdicao(selectedEditionId, teamId, "");
    setAddingTeamId(null);
    if ("error" in result) { toast("error", (result as any).error); return; }
    const team = allTeams.find(t => t.id === teamId);
    if (team) {
      setEditionTeams(prev => [...prev, {
        id: crypto.randomUUID(),
        team_id: teamId,
        arrival_origin: null,
        is_free_agent_pool: false,
        teams: team,
      }]);
    }
    setShowAddTeamModal(false);
    toast("success", "Equipe adicionada.");
  }

  async function handleRemoverEquipeHub(editionTeamId: string) {
    if (!confirm("Remover esta equipe da edição? Esta ação é irreversível.")) return;
    const result = await removerEquipeEdicao(editionTeamId);
    if ("error" in result) { toast("error", (result as any).error); return; }
    setEditionTeams(prev => prev.filter(et => et.id !== editionTeamId));
    toast("success", "Equipe removida.");
  }

  async function handleDesativarEquipeHub(editionTeamId: string) {
    if (!confirm("Desativar esta equipe? Ela ficará oculta na classificação, mas o histórico será preservado.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("edition_teams").update({ is_active: false }).eq("id", editionTeamId);
    if (error) { toast("error", error.message); return; }
    setEditionTeams(prev => prev.map(et => et.id === editionTeamId ? { ...et, is_active: false } as any : et));
    toast("success", "Equipe desativada.");
  }

  async function handleReativarEquipeHub(editionTeamId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("edition_teams").update({ is_active: true }).eq("id", editionTeamId);
    if (error) { toast("error", error.message); return; }
    setEditionTeams(prev => prev.map(et => et.id === editionTeamId ? { ...et, is_active: true } as any : et));
    toast("success", "Equipe reativada.");
  }

  async function handleCreateEdition() {
    if (!newEditionSeasonId) return;
    setSavingEdition(true);
    const fd = new FormData(); fd.append("season_id", newEditionSeasonId);
    const result = await criarEdicao(competition.id, fd);
    setSavingEdition(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Edição criada."); setShowNewEdition(false); setSelectedEditionId(result.id); router.refresh();
  }

  async function handleAtribuirPremiacao() {
    if (!awardType) { toast("error", "Selecione o tipo de premiação."); return; }
    const isColetiva = ["champion", "runner_up", "third_place"].includes(awardType);
    if (isColetiva && !awardTeamId) { toast("error", "Selecione a equipe."); return; }
    if (!isColetiva && !awardAthleteId) { toast("error", "Selecione o atleta."); return; }
    setSavingAward(true);
    const fd = new FormData();
    fd.append("award_type", awardType);
    if (isColetiva) fd.append("winning_team_id", awardTeamId);
    else fd.append("athlete_id", awardAthleteId);
    const result = await atribuirPremiacao(selectedEditionId, fd);
    setSavingAward(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Premiação atribuída.");
    setAwardType(""); setAwardAthleteId(""); setAwardTeamId("");
    await loadAwards(selectedEditionId);
  }

  async function handleRemoverPremiacao(awardId: string) {
    const result = await removerPremiacao(awardId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Premiação removida.");
    setAwards(prev => prev.filter((a: any) => a.id !== awardId));
  }


  const filteredMatches = matches.filter(m => {
    if (matchFilterPhaseId && m.phases?.id !== matchFilterPhaseId) return false;
    return true;
  });

  const filteredMatchesByRound: Record<string, { label: string; matches: Match[]; order: number }> = {};
  filteredMatches.forEach(m => {
    let key: string;
    let order = 0;
    if (m.rounds?.custom_label ?? m.rounds?.name) {
      key = m.rounds?.custom_label ?? m.rounds?.name ?? "Sem rodada";
    } else if (m.matchup_id) {
      const mu = matchups.find(mu => mu.id === m.matchup_id);
      key = mu?.round_label ?? m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
      order = mu?.display_order ?? 0;
    } else {
      key = m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
    }
    if (!filteredMatchesByRound[key]) filteredMatchesByRound[key] = { label: key, matches: [], order };
    filteredMatchesByRound[key].matches.push(m);
  });

  const topScorers = [...scorers].filter(s => (s.goals ?? 0) > 0).sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
  const topAssists = [...scorers].filter(s => (s.assists ?? 0) > 0).sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0));
  const topYellow = [...scorers].filter(s => (s.yellow_cards ?? 0) > 0).sort((a, b) => (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0));
  const topRed = [...scorers].filter(s => (s.red_cards ?? 0) > 0).sort((a, b) => (b.red_cards ?? 0) - (a.red_cards ?? 0));

  const sortedPhases = [...phases].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  // ── Renderização da classificação por tipo de fase ──
  function renderClassificacao() {
    if (!selectedPhase) {
      return <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma fase disponível.</p>;
    }

    const StandingsTable = ({ rows, highlightTop = 4 }: { rows: any[]; highlightTop?: number }) => (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["#", "Equipe", "J", "V", "E", "D", "GP", "GC", "SG", "PTS"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={row.team_id} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }} className="hover:bg-[rgba(255,255,255,0.02)]">
                <td className="px-4 py-3 font-mono text-xs" style={{ color: idx < highlightTop ? "var(--color-brand)" : "var(--color-text-secondary)" }}>{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.teams?.logo_url ? <img src={row.teams.logo_url} alt="" className="h-5 w-5 rounded object-contain" /> : <div className="h-5 w-5 rounded" style={{ backgroundColor: "var(--color-border)" }} />}
                    <span className="font-medium text-xs" style={{ color: "var(--color-text-primary)" }}>{row.teams?.abbreviation ?? row.teams?.full_name ?? "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.matches_played ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.wins ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.draws ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.losses ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.goals_scored ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.goals_conceded ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {((row.goals_scored ?? 0) - (row.goals_conceded ?? 0)) > 0 ? "+" : ""}
                  {(row.goals_scored ?? 0) - (row.goals_conceded ?? 0)}
                </td>
                <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: "var(--color-brand)" }}>{row.points ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    // Fase de grupos
    if (selectedPhase.phase_type === "group_stage") {
      const phaseGroups = groups.filter(g => g.phase_id === selectedPhaseId);
      if (phaseGroups.length === 0) {
        return <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum grupo cadastrado nesta fase.</p>;
      }
      return (
        <div className="space-y-6">
          {phaseGroups.map(group => {
            const teamIdsInGroup = groupTeams.filter(gt => gt.group_id === group.id).map(gt => gt.edition_team_id);
            const editionTeamIds = editionTeams.filter(et => teamIdsInGroup.includes(et.id)).map(et => et.team_id);
            const groupStandings = standings
              .filter(s => editionTeamIds.includes(s.team_id))
              .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.goals_scored ?? 0) - (a.goals_scored ?? 0));
            return (
              <div key={group.id}>
                <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>
                  {group.custom_label ?? group.name}
                </p>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  {groupStandings.length === 0 ? (
                    <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Sem dados de classificação.</p>
                  ) : (
                    <StandingsTable rows={groupStandings} highlightTop={2} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Pontos corridos
    if (selectedPhase.phase_type === "round_robin") {
      return (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          {standings.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum dado de classificação disponível.</p>
          ) : (
            <StandingsTable rows={standings} highlightTop={4} />
          )}
        </div>
      );
    }

    // Mata-mata / conferência
    const phaseMatchups = matchups.filter(m => m.phase_id === selectedPhaseId);
    const phaseRounds = (rounds as Round[]).filter(r => r.phase_id === selectedPhaseId);
    return (
      <BracketView
        phaseId={selectedPhaseId}
        matchups={phaseMatchups}
        phaseRounds={phaseRounds}
        phaseType={selectedPhase.phase_type as "knockout" | "conference"}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[{ label: "Competições", href: "/competicoes" }, { label: competition.full_name ?? "Competição" }]} />
          <div className="mb-4 flex items-center gap-4">
            {competition.logo_url ? (
              <img src={competition.logo_url} alt="" className="h-14 w-14 rounded-xl border object-contain shrink-0" style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {competition.full_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{competition.full_name}</h1>
              <div className="relative mt-1 inline-block">
                <button type="button" onClick={() => setShowEditionDropdown(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                  {selectedEdition?.season_name ?? "Selecionar edição"}<ChevronDown size={14} />
                </button>
                {showEditionDropdown && (
                  <div className="absolute left-0 top-9 z-50 min-w-[180px] rounded-xl border shadow-lg"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                    {editions.map(e => (
                      <button key={e.id} type="button" onClick={() => { setSelectedEditionId(e.id); setShowEditionDropdown(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                        style={{ color: e.id === selectedEditionId ? "var(--color-brand)" : "var(--color-text-primary)" }}>
                        {e.season_name}
                        {e.id === selectedEditionId && <span className="ml-auto text-xs" style={{ color: "var(--color-brand)" }}>✓</span>}
                      </button>
                    ))}
                    <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      <button type="button" onClick={() => { setShowEditionDropdown(false); setShowNewEdition(true); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm" style={{ color: "var(--color-brand)" }}>
                        <Plus size={13} /> Nova edição
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            {[
              { key: "jogos", label: "JOGOS" },
              { key: "classificacao", label: "CLASSIFICAÇÃO" },
              { key: "estatisticas", label: "ESTATÍSTICAS" },
              { key: "competicao", label: "COMPETIÇÃO" },
              { key: "configuracoes", label: "CONFIGURAÇÕES" },
            ].map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key as any)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors"
                style={{ borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent", color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal nova partida */}
      {showNewMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-xl border shadow-xl" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Nova partida</h2>
              <button type="button" onClick={() => setShowNewMatch(false)} style={{ color: "var(--color-text-secondary)" }}><X size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {phases.filter(p => isClassificatory(p.phase_type)).length > 1 ? (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Fase *</span>
                  <select value={newMatchPhaseId} onChange={e => { const pid = e.target.value; setNewMatchPhaseId(pid); setNewMatchRoundId(""); setNewMatchTeamA(""); setNewMatchTeamB(""); loadPhaseTeams(pid); }}
                    className={inputClass} style={inputStyle}>
                    <option value="">Selecione a fase…</option>
                    {phases.filter(p => isClassificatory(p.phase_type)).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.custom_label ?? p.full_name} — {PHASE_TYPE_LABEL[p.phase_type] ?? p.phase_type}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Fase *</span>
                  <p className="font-mono text-sm font-bold" style={{ color: "var(--color-brand)" }}>
                    {phases.find(p => p.id === newMatchPhaseId)?.custom_label ?? phases.find(p => p.id === newMatchPhaseId)?.full_name ?? "—"}
                  </p>
                </div>
              )}
              {newMatchPhaseId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data</span>
                      <input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} className={inputClass} style={inputStyle} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Horário</span>
                      <input type="time" value={newMatchTime} onChange={e => setNewMatchTime(e.target.value)} className={inputClass} style={inputStyle} />
                    </label>
                  </div>
                  {isClassificatory(selectedNewMatchPhase?.phase_type ?? "") && roundsForSelectedPhase.length > 0 && (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Rodada</span>
                      <select value={newMatchRoundId} onChange={e => setNewMatchRoundId(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Selecione…</option>
                        {roundsForSelectedPhase.map(r => <option key={r.id} value={r.id}>{r.custom_label ?? r.name}</option>)}
                      </select>
                    </label>
                  )}
                  {!isClassificatory(selectedNewMatchPhase?.phase_type ?? "") && roundsForSelectedPhase.length > 0 && (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Estágio *</span>
                      <select value={newMatchRoundId} onChange={e => setNewMatchRoundId(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Selecione o estágio…</option>
                        {roundsForSelectedPhase.map(r => <option key={r.id} value={r.id}>{r.custom_label ?? r.name}</option>)}
                      </select>
                    </label>
                  )}
                  {roundsForSelectedPhase.length === 0 && !isClassificatory(selectedNewMatchPhase?.phase_type ?? "") && (
                    <p className="text-sm rounded-lg border px-3 py-2" style={{ color: "#F2C005", borderColor: "#F2C00533", backgroundColor: "#F2C00511" }}>
                      Esta fase não tem rodadas cadastradas. Adicione rodadas no hub da fase antes de criar partidas.
                    </p>
                  )}
                  {(() => {
                    const selRound = rounds.find(r => r.id === newMatchRoundId);
                    if (!selRound?.legs) return null;
                    return (
                      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                        style={{ borderColor: "var(--color-border)" }}>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Jogo de volta</p>
                          <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                            {newMatchIsSecondLeg ? "Esta partida é a volta" : "Esta partida é a ida"}
                          </p>
                        </div>
                        <button type="button" onClick={() => setNewMatchIsSecondLeg(v => !v)}
                          style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                            backgroundColor: newMatchIsSecondLeg ? "var(--color-brand)" : "var(--color-border)",
                            transition: "background-color 0.15s", position: "relative" }}>
                          <div style={{ position: "absolute", top: 3, left: newMatchIsSecondLeg ? 21 : 3,
                            width: 16, height: 16, borderRadius: "50%",
                            backgroundColor: newMatchIsSecondLeg ? "var(--color-background)" : "#888",
                            transition: "left 0.15s" }} />
                        </button>
                      </div>
                    );
                  })()}
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Local</span>
                    <select value={newMatchVenueId} onChange={e => setNewMatchVenueId(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Nenhum</option>
                      {venues.map((v: any) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Equipe A (mandante) *</span>
                    <select value={newMatchTeamA} onChange={e => setNewMatchTeamA(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Selecione…</option>
                      {teamsForSelectedPhase.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Equipe B (visitante) *</span>
                    <select value={newMatchTeamB} onChange={e => setNewMatchTeamB(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Selecione…</option>
                      {teamsForSelectedPhase.filter(t => t.id !== newMatchTeamA).map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newMatchAddAnother} onChange={e => setNewMatchAddAnother(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Adicionar outra com mesma data e horário</span>
                  </label>
                </>
              )}
              {newMatchError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{newMatchError}</p>}
            </div>
            <div className="flex gap-3 border-t px-6 py-4 justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setShowNewMatch(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Cancelar</button>
              <button type="button" onClick={handleCreateMatch} disabled={creatingMatch || !newMatchPhaseId || !newMatchTeamA || !newMatchTeamB}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {creatingMatch ? "Criando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo confronto — fases eliminatórias */}
      {showNovoConfronto && (
        <NovoConfrontoModal
          phases={phases.filter(p => isEliminatoria(p.phase_type))}
          initialPhaseId={matchFilterPhaseId}
          rounds={rounds}
          editionTeams={editionTeams}
          venues={venues}
          onClose={() => setShowNovoConfronto(false)}
          onSuccess={() => {
            setShowNovoConfronto(false);
            loadEditionData(selectedEditionId);
          }}
          inputClass={inputClass}
          inputStyle={inputStyle}
        />
      )}

{editingMatchup && (
  <MatchupEditModal
    matchup={editingMatchup}
    rounds={rounds}
    editionTeams={editionTeams}
    venues={venues}
    phaseId={matchFilterPhaseId}
    onClose={() => setEditingMatchup(null)}
    onSuccess={() => { setEditingMatchup(null); loadEditionData(selectedEditionId); }}
    inputClass={inputClass}
    inputStyle={inputStyle}
  />
)}

      {/* Modal elenco */}
      {elencoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="w-full max-w-lg rounded-xl border shadow-xl flex flex-col max-h-[80vh]" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Elenco inscrito</h2>
                <p className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>{elencoModal.teamName}</p>
              </div>
              <button type="button" onClick={() => setElencoModal(null)} style={{ color: "var(--color-text-secondary)" }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {loadingRoster ? (
                <p className="font-mono text-sm text-center" style={{ color: "#A6A6A6" }}>Carregando…</p>
              ) : (
                <>
                  <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Inscritos ({rosterEntries.length})</p>
                    {rosterEntries.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum atleta inscrito.</p>
                    ) : (
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                        {rosterEntries.map((entry: any, idx: number) => (
                          <div key={entry.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                            {entry.athletes?.photo_url ? <img src={entry.athletes.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" /> : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                                {(entry.athletes?.surname ?? entry.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{entry.athletes?.surname ?? entry.athletes?.full_name ?? "—"}</p>
                              <p className="font-mono text-xs" style={{ color: entry.status === "approved" ? "var(--color-brand)" : "#A6A6A6" }}>{entry.status === "approved" ? "Aprovado" : "Pendente"}</p>
                            </div>
                            <button type="button" onClick={() => handleRemoverInscricao(entry.id)} className="shrink-0 rounded border px-2 py-1 font-mono text-xs hover:border-[var(--color-danger)]" style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>Remover</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {availableAthletes.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Disponíveis ({availableAthletes.length})</p>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                        {availableAthletes.map((athlete: any, idx: number) => (
                          <div key={athlete.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                            {athlete.photo_url ? <img src={athlete.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" /> : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                                {(athlete.surname ?? athlete.full_name ?? "?").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <p className="flex-1 text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{athlete.surname ?? athlete.full_name ?? "—"}</p>
                            <button type="button" onClick={() => handleInscrever(athlete.id, athlete.position_id)} className="shrink-0 flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs hover:border-[var(--color-brand)]" style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                              <Check size={12} /> Inscrever
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nova edição */}
      {showNewEdition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="w-full max-w-sm rounded-xl border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Nova edição</h2>
            <label className="flex flex-col gap-1 mb-4">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Temporada</span>
              <select value={newEditionSeasonId} onChange={e => setNewEditionSeasonId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewEdition(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Cancelar</button>
              <button type="button" onClick={handleCreateEdition} disabled={savingEdition || !newEditionSeasonId} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {savingEdition ? "Criando…" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6">

        {/* ABA JOGOS */}
        {activeTab === "jogos" && (
  <div>
    {/* Filtros de fase + botão de ação */}
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {phases.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {sortedPhases.map(p => (
            <button key={p.id} type="button"
              onClick={() => {
                setMatchFilterPhaseId(p.id);
                setJobsSubTab(isEliminatoria(p.phase_type) ? "confrontos" : "partidas");
              }}
              className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
              style={{
                borderColor: matchFilterPhaseId === p.id ? "var(--color-brand)" : "var(--color-border)",
                backgroundColor: matchFilterPhaseId === p.id ? "rgba(191,242,5,0.1)" : "transparent",
                color: matchFilterPhaseId === p.id ? "var(--color-brand)" : "#A6A6A6",
              }}>
              {p.custom_label ?? p.full_name}
              {p.is_current && (
                <span style={{ marginLeft: 5, fontSize: 8, opacity: 0.6 }}>●</span>
              )}
            </button>
          ))}
        </div>
      )}
 
      <div className="ml-auto flex items-center gap-3">
        {/* Contador — só para sub-aba partidas */}
        {(!isEliminatoria(phases.find(p => p.id === matchFilterPhaseId)?.phase_type ?? "") || jobsSubTab === "partidas") && (
          <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {filteredMatches.length} {filteredMatches.length === 1 ? "partida" : "partidas"}
          </p>
        )}
 
        {/* Botão contextual */}
        {isEliminatoria(phases.find(p => p.id === matchFilterPhaseId)?.phase_type ?? "") ? (
          jobsSubTab === "confrontos" ? (
            <button type="button" onClick={() => {
              setNovoMatchPreselectedPhaseId(matchFilterPhaseId);
              setShowNovoConfronto(true);
            }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              <Plus size={14} strokeWidth={2.5} /> Novo confronto
            </button>
          ) : null
        ) : (
          <button type="button" onClick={() => {
            setNovoMatchPreselectedPhaseId(matchFilterPhaseId);
            setShowNewMatch(true);
          }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            <Plus size={14} strokeWidth={2.5} /> Nova partida
          </button>
        )}
      </div>
    </div>
 
    {/* Sub-abas — só para fases eliminatórias */}
    {isEliminatoria(phases.find(p => p.id === matchFilterPhaseId)?.phase_type ?? "") && (
      <div className="mb-4 flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
        {[
          { key: "confrontos", label: "CONFRONTOS" },
          { key: "partidas", label: "PARTIDAS" },
        ].map(sub => (
          <button key={sub.key} type="button"
            onClick={() => setJobsSubTab(sub.key as "confrontos" | "partidas")}
            className="border-b-2 pb-3 font-mono text-xs transition-colors"
            style={{
              borderColor: jobsSubTab === sub.key ? "var(--color-brand)" : "transparent",
              color: jobsSubTab === sub.key ? "var(--color-brand)" : "#A6A6A6",
            }}>
            {sub.label}
          </button>
        ))}
      </div>
    )}
 
    {loadingMatches ? (
      <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>
    ) : (
      <>
        {/* ── SUB-ABA CONFRONTOS ── */}
        {isEliminatoria(phases.find(p => p.id === matchFilterPhaseId)?.phase_type ?? "") && jobsSubTab === "confrontos" && (() => {
          const phaseMatchups = matchups
            .filter(m => m.phase_id === matchFilterPhaseId)
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
 
          // Agrupa por round_label, ordenando pelo display_order da rodada correspondente
          const byRound: Record<string, { matchups: any[]; roundOrder: number }> = {};
          phaseMatchups.forEach(mu => {
            const rd = rounds.find(r =>
              r.phase_id === matchFilterPhaseId &&
              (r.custom_label ?? r.name) === mu.round_label
            );
            const order = rd?.display_order ?? 999;
            if (!byRound[mu.round_label]) byRound[mu.round_label] = { matchups: [], roundOrder: order };
            byRound[mu.round_label].matchups.push(mu);
          });
 
          const sortedGroups = Object.entries(byRound).sort((a, b) => a[1].roundOrder - b[1].roundOrder);
 
          if (sortedGroups.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem confrontos</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Clique em "Novo confronto" para começar.
                </p>
              </div>
            );
          }
 
          return (
            <div className="space-y-6">
              {sortedGroups.map(([label, group]) => (
                <div key={label}>
                  <p className="mb-3 font-mono text-xs uppercase tracking-widest"
                    style={{ color: "var(--color-text-secondary)" }}>
                    {label}
                  </p>
                  <div className="rounded-xl border overflow-hidden"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                    {group.matchups.map((mu, idx) => {
                      const tA = mu.teams_a?.abbreviation ?? mu.teams_a?.full_name ?? "A definir";
                      const tB = mu.teams_b?.abbreviation ?? mu.teams_b?.full_name ?? "A definir";
                      const logoA = mu.teams_a?.logo_url ?? null;
                      const logoB = mu.teams_b?.logo_url ?? null;
                      const matchCount = matches.filter(m => m.matchup_id === mu.id).length;
 
                      return (
                        <div key={mu.id}
                          className="flex items-center gap-4 px-5 py-3 group"
                          style={{
                            borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                            opacity: 0.8,
                            transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>
 
                          {/* Times */}
                          <div className="flex-1 flex items-center gap-3 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {logoA
                                ? <img src={logoA} alt="" style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 3 }} />
                                : <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: "var(--color-border)" }} />
                              }
                              <span className="font-mono text-sm font-bold"
                                style={{ color: mu.teams_a ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                                {tA}
                              </span>
                            </div>
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>×</span>
                            <div className="flex items-center gap-1.5">
                              {logoB
                                ? <img src={logoB} alt="" style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 3 }} />
                                : <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: "var(--color-border)" }} />
                              }
                              <span className="font-mono text-sm font-bold"
                                style={{ color: mu.teams_b ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                                {tB}
                              </span>
                            </div>
                          </div>
 
                          {/* Info de partidas */}
                          <span className="font-mono text-xs shrink-0"
                            style={{ color: "var(--color-text-secondary)" }}>
                            {matchCount} {matchCount === 1 ? "partida" : "partidas"}
                          </span>
 
                          {/* Ações */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button type="button"
                              onClick={() => setEditingMatchup(mu)}
                              className="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-brand)")}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}>
                              Editar
                            </button>
                            <button type="button"
                              onClick={async () => {
                                if (!confirm(`Remover confronto ${tA} × ${tB}? As partidas vinculadas também serão removidas.`)) return;
                                const supabase = createClient();
                                await supabase.from("matches").delete().eq("matchup_id", mu.id);
                                await supabase.from("matchups").delete().eq("id", mu.id);
                                await loadEditionData(selectedEditionId);
                                toast("success", "Confronto removido.");
                              }}
                              className="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-danger)")}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}>
                              Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
 
        {/* ── SUB-ABA PARTIDAS (ou fase classificatória) ── */}
        {(!isEliminatoria(phases.find(p => p.id === matchFilterPhaseId)?.phase_type ?? "") || jobsSubTab === "partidas") && (
          filteredMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem partidas</p>
              <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                {isEliminatoria(phases.find(p => p.id === matchFilterPhaseId)?.phase_type ?? "")
                  ? "Adicione partidas pelos confrontos na aba Confrontos."
                  : "Clique em \"Nova partida\" para começar."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(filteredMatchesByRound)
                .sort((a, b) => a.order - b.order)
                .map(group => (
                  <div key={group.label}>
                    <p className="mb-3 font-mono text-xs uppercase tracking-widest"
                      style={{ color: "var(--color-text-secondary)" }}>
                      {group.label}
                    </p>
                    <div className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      {group.matches.map((m, idx) => (
                        <MatchRow key={m.id} match={m} idx={idx} onDelete={() => handleDeleteMatch(m.id)} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )
        )}
      </>
    )}
  </div>
)}

        {/* ABA CLASSIFICAÇÃO */}
        {activeTab === "classificacao" && (
          <div>
            {phases.length > 1 && (
              <div className="mb-4 flex gap-2 flex-wrap">
                {sortedPhases.map(p => (
                  <button key={p.id} type="button" onClick={() => setSelectedPhaseId(p.id)}
                    className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                    style={{ borderColor: selectedPhaseId === p.id ? "var(--color-brand)" : "var(--color-border)", backgroundColor: selectedPhaseId === p.id ? "rgba(191,242,5,0.1)" : "transparent", color: selectedPhaseId === p.id ? "var(--color-brand)" : "#A6A6A6" }}>
                    {p.custom_label ?? p.full_name}
                  </button>
                ))}
              </div>
            )}
            {renderClassificacao()}
          </div>
        )}

        {/* ABA ESTATÍSTICAS */}
        {activeTab === "estatisticas" && (
          <div>
            <div className="mb-6 flex gap-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              {[{ key: "geral", label: "GERAL" }, { key: "semanal", label: "SEMANAL" }].map(sub => (
                <button key={sub.key} type="button" onClick={() => setActiveStatsTab(sub.key as any)}
                  className="border-b-2 pb-3 font-mono text-xs transition-colors"
                  style={{ borderColor: activeStatsTab === sub.key ? "var(--color-brand)" : "transparent", color: activeStatsTab === sub.key ? "var(--color-brand)" : "#A6A6A6" }}>
                  {sub.label}
                </button>
              ))}
            </div>
            {activeStatsTab === "geral" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <StatRanking title="Artilharia" data={topScorers} valueKey="goals" valueLabel="gols" emptyMessage="Nenhum gol registrado." />
                <StatRanking title="Assistências" data={topAssists} valueKey="assists" valueLabel="assist." emptyMessage="Nenhuma assistência registrada." />
                <StatRanking title="Cartões Amarelos" data={topYellow} valueKey="yellow_cards" valueLabel="amarelos" valueColor="#F2C005" emptyMessage="Nenhum cartão amarelo registrado." />
                <StatRanking title="Cartões Vermelhos" data={topRed} valueKey="red_cards" valueLabel="vermelhos" valueColor="var(--color-danger)" emptyMessage="Nenhum cartão vermelho registrado." />
              </div>
            )}
            {/* Sub-aba SEMANAL */}
            {activeStatsTab === "semanal" && (
              <SemanasTab
                selectedEditionId={selectedEditionId}
                rounds={rounds}
                editionTeams={editionTeams}
              />
            )}
          </div>
        )}

        {/* ABA COMPETIÇÃO */}
        {activeTab === "competicao" && (
          <div>
            <div className="mb-6 flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
              {[{ key: "fases", label: "FASES" }, { key: "equipes", label: "EQUIPES" }].map(sub => (
                <button key={sub.key} type="button" onClick={() => setActiveCompTab(sub.key as any)}
                  className="border-b-2 pb-3 font-mono text-xs transition-colors"
                  style={{ borderColor: activeCompTab === sub.key ? "var(--color-brand)" : "transparent", color: activeCompTab === sub.key ? "var(--color-brand)" : "#A6A6A6" }}>
                  {sub.label}
                </button>
              ))}
            </div>
            {activeCompTab === "fases" && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Fases ({phases.length})</h2>
                  <Link href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/fases/nova`}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                    <Plus size={12} /> Nova fase
                  </Link>
                </div>
                {phases.length === 0 ? (
                  <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma fase criada.</p>
                ) : (
                  phases.map((phase, idx) => (
                    <Link key={phase.id} href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/fases/${phase.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{phase.custom_label ?? phase.full_name}</p>
                        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{PHASE_TYPE_LABEL[phase.phase_type] ?? phase.phase_type}</p>
                      </div>
                      {phase.is_current && <span className="font-mono text-xs rounded px-2 py-0.5" style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>atual</span>}
                      <ChevronRight size={14} style={{ color: "#555" }} />
                    </Link>
                  ))
                )}
              </div>
            )}
            {activeCompTab === "equipes" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {editionTeams.filter(et => !et.is_free_agent_pool).length} equipes
                  </p>
                  <button type="button"
                    onClick={() => { setShowAddTeamModal(true); setTeamSearchQuery(""); }}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors hover:border-[var(--color-brand)]"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                    <Plus size={12} /> Adicionar equipe
                  </button>
                </div>

                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  {editionTeams.filter(et => !et.is_free_agent_pool).length === 0 ? (
                    <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe adicionada.</p>
                  ) : (
                    editionTeams.filter(et => !et.is_free_agent_pool).map((et, idx) => {
                      const isInactive = (et as any).is_active === false;
                      return (
                        <div key={et.id} className="flex items-center gap-4 px-5 py-3 group"
                          style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: isInactive ? 0.4 : 0.7, transition: "opacity 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = isInactive ? "0.4" : "0.7")}>
                          {et.teams?.logo_url ? (
                            <img src={et.teams.logo_url} alt="" className="h-9 w-9 rounded object-contain shrink-0" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border text-xs font-bold"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                              {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{et.teams?.abbreviation?.toUpperCase() ?? "—"}</p>
                              {isInactive && <span className="font-mono text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: "rgba(242,192,5,0.15)", color: "#F2C005" }}>Desativada</span>}
                            </div>
                            <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{et.teams?.full_name ?? "—"}</p>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Link href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/equipes/${et.team_id}`}
                              className="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs hover:border-[var(--color-brand)]"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                              <Users size={12} /> Elenco
                            </Link>
                            {isInactive ? (
                              <button type="button" onClick={() => handleReativarEquipeHub(et.id)}
                                className="rounded border px-2 py-1 font-mono text-xs"
                                style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
                                Reativar
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleDesativarEquipeHub(et.id)}
                                className="rounded border px-2 py-1 font-mono text-xs"
                                style={{ borderColor: "var(--color-border)", color: "#F2C005" }}>
                                Desativar
                              </button>
                            )}
                            <button type="button" onClick={() => handleRemoverEquipeHub(et.id)}
                              className="rounded border px-2 py-1 font-mono text-xs"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Modal adicionar equipe */}
                {showAddTeamModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
                    <div className="w-full max-w-md rounded-xl border shadow-xl flex flex-col"
                      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", maxHeight: "70vh" }}>
                      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0"
                        style={{ borderColor: "var(--color-border)" }}>
                        <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Adicionar equipe</h2>
                        <button type="button" onClick={() => setShowAddTeamModal(false)}
                          style={{ color: "var(--color-text-secondary)" }}><X size={18} /></button>
                      </div>
                      <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
                          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                          <Search size={14} style={{ color: "var(--color-text-secondary)" }} />
                          <input autoFocus type="text" placeholder="Buscar equipe…"
                            value={teamSearchQuery}
                            onChange={e => setTeamSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent font-mono text-sm outline-none"
                            style={{ color: "var(--color-text-primary)" }} />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {(() => {
                          const enrolledIds = new Set(editionTeams.map(et => et.team_id));
                          const q = teamSearchQuery.toLowerCase();
                          const available = allTeams.filter(t =>
                            !enrolledIds.has(t.id) &&
                            (!q || t.full_name.toLowerCase().includes(q) || (t.abbreviation ?? "").toLowerCase().includes(q))
                          );
                          if (available.length === 0) return (
                            <p className="px-6 py-8 text-center font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                              Nenhuma equipe disponível.
                            </p>
                          );
                          return available.map((team, idx) => (
                            <button key={team.id} type="button"
                              onClick={() => handleAdicionarEquipeHub(team.id)}
                              disabled={addingTeamId === team.id}
                              className="flex items-center gap-3 w-full px-6 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
                              style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                              {team.logo_url ? (
                                <img src={team.logo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 border"
                                  style={{ borderColor: "var(--color-border)" }} />
                              ) : (
                                <div className="h-8 w-8 rounded-full shrink-0 border flex items-center justify-center"
                                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                                  <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
                                    {(team.abbreviation ?? team.full_name).slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{team.full_name}</p>
                                {team.abbreviation && <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{team.abbreviation}</p>}
                              </div>
                              {addingTeamId === team.id && <span className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>Adicionando…</span>}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA CONFIGURAÇÕES */}
        {activeTab === "configuracoes" && (
          <div>
            <div className="mb-6 flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
              {[
                { key: "gerais", label: "GERAIS" },
                { key: "premiacoes", label: "PREMIAÇÕES" },
                { key: "inscricoes", label: "INSCRIÇÕES" },
                { key: "ranking", label: "RANKING" },
              ].map(sub => (
                <button key={sub.key} type="button" onClick={() => setActiveConfigTab(sub.key as any)}
                  className="border-b-2 pb-3 font-mono text-xs transition-colors"
                  style={{ borderColor: activeConfigTab === sub.key ? "var(--color-brand)" : "transparent", color: activeConfigTab === sub.key ? "var(--color-brand)" : "#A6A6A6" }}>
                  {sub.label}
                </button>
              ))}
            </div>
            {activeConfigTab === "gerais" && (
              <EdicaoConfigTab selectedEditionId={selectedEditionId} selectedEditionName={selectedEdition?.season_name ?? ""} inputClass={inputClass} inputStyle={inputStyle} />
            )}
            {activeConfigTab === "premiacoes" && (
              <PremiacoesTab
                awards={awards} loadingAwards={loadingAwards}
                awardType={awardType} setAwardType={setAwardType}
                awardAthleteId={awardAthleteId} setAwardAthleteId={setAwardAthleteId}
                awardTeamId={awardTeamId} setAwardTeamId={setAwardTeamId}
                savingAward={savingAward} editionTeams={editionTeams} editionAthletes={editionAthletes}
                onAtribuir={handleAtribuirPremiacao} onRemover={handleRemoverPremiacao}
                inputClass={inputClass} inputStyle={inputStyle}
              />
            )}
            {activeConfigTab === "inscricoes" && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Inscrições</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>Em construção — janelas de inscrição e configurações serão gerenciadas aqui.</p>
              </div>
            )}
            {activeConfigTab === "ranking" && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Ranking</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>Em construção — configuração de pontos do ranking por categoria serão definidos aqui.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SemanasTab ───────────────────────────────────────────────────────────────
// Drop-in replacement for the SemanasTab function in competicao-hub.tsx

function SemanasTab({ selectedEditionId, rounds, editionTeams }: {
  selectedEditionId: string;
  rounds: any[];
  editionTeams: any[];
}) {
  // Formations: col = horizontal zone (0=GK, 1=DEF, 2=MED, 3=ATK)
  // row = vertical position within the zone (0=top, 1=mid, 2=bottom)
  // The field is 700 wide x 420 tall (horizontal)
  // Zones: GK=col0, DEF=col1, MED=col2, ATK=col3
  const FORMATIONS: Record<string, { label: string; slots: { col: number; row: number; total: number; label: string }[] }> = {
    "2-3-1": {
      label: "2-3-1",
      slots: [
        { col: 0, row: 0, total: 1, label: "GK" },
        { col: 1, row: 0, total: 2, label: "DEF" }, { col: 1, row: 1, total: 2, label: "DEF" },
        { col: 2, row: 0, total: 3, label: "MED" }, { col: 2, row: 1, total: 3, label: "MED" }, { col: 2, row: 2, total: 3, label: "MED" },
        { col: 3, row: 0, total: 1, label: "ATK" },
      ],
    },
    "1-3-2": {
      label: "1-3-2",
      slots: [
        { col: 0, row: 0, total: 1, label: "GK" },
        { col: 1, row: 0, total: 1, label: "DEF" },
        { col: 2, row: 0, total: 3, label: "MED" }, { col: 2, row: 1, total: 3, label: "MED" }, { col: 2, row: 2, total: 3, label: "MED" },
        { col: 3, row: 0, total: 2, label: "ATK" }, { col: 3, row: 1, total: 2, label: "ATK" },
      ],
    },
    "2-2-2": {
      label: "2-2-2",
      slots: [
        { col: 0, row: 0, total: 1, label: "GK" },
        { col: 1, row: 0, total: 2, label: "DEF" }, { col: 1, row: 1, total: 2, label: "DEF" },
        { col: 2, row: 0, total: 2, label: "MED" }, { col: 2, row: 1, total: 2, label: "MED" },
        { col: 3, row: 0, total: 2, label: "ATK" }, { col: 3, row: 1, total: 2, label: "ATK" },
      ],
    },
    "3-3": {
      label: "3-3",
      slots: [
        { col: 0, row: 0, total: 1, label: "GK" },
        { col: 1, row: 0, total: 3, label: "DEF" }, { col: 1, row: 1, total: 3, label: "DEF" }, { col: 1, row: 2, total: 3, label: "DEF" },
        { col: 3, row: 0, total: 3, label: "ATK" }, { col: 3, row: 1, total: 3, label: "ATK" }, { col: 3, row: 2, total: 3, label: "ATK" },
      ],
    },
  };

  // Field dimensions (the SVG coordinate space)
  const FW = 700; // field width
  const FH = 380; // field height
  // Padding inside the field border
  const PAD_X = 50;
  const PAD_Y = 40;
  const INNER_W = FW - PAD_X * 2; // 600
  const INNER_H = FH - PAD_Y * 2; // 300

  // Zone x-centers (4 zones, evenly spaced inside field)
  // GK near left goal, DEF at ~25%, MED at ~55%, ATK near right penalty
  const ZONE_X: Record<number, number> = {
    0: PAD_X + INNER_W * 0.08,  // GK
    1: PAD_X + INNER_W * 0.30,  // DEF
    2: PAD_X + INNER_W * 0.58,  // MED
    3: PAD_X + INNER_W * 0.80,  // ATK
  };

  // Vertical center of field
  const CY = FH / 2;

  const AVATAR_R = 20; // reduced to prevent overlap

  // Given a slot (col, row, total), compute its cx/cy on the field
  function slotPosition(col: number, row: number, total: number): { cx: number; cy: number } {
    const cx = ZONE_X[col];
    // Minimum spacing: diameter + 20px gap
    const minSpacing = AVATAR_R * 2 + 20;
    const maxSpacing = INNER_H / (total + 0.5);
    const spacing = Math.max(minSpacing, Math.min(maxSpacing, 80));
    const startY = CY - spacing * (total - 1) / 2;
    const cy = startY + row * spacing;
    return { cx, cy };
  }

  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id ?? "");
  const [formation, setFormation] = useState<string>("2-3-1");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totwSquadId, setTotwSquadId] = useState<string | null>(null);
  const [motwSquadId, setMotwSquadId] = useState<string | null>(null);
  const [slots, setSlots] = useState<(any | null)[]>(Array(7).fill(null));
  const [motwIndex, setMotwIndex] = useState<number | null>(null);
  const [coach, setCoach] = useState<any | null>(null);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlotIndex, setSearchSlotIndex] = useState<number | null>(null);
  const [searchIsCoach, setSearchIsCoach] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"athlete" | "staff">("athlete");
  const [editionAthletes, setEditionAthletes] = useState<any[]>([]);
  const [editionStaff, setEditionStaff] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedEditionId) return;
    async function loadRoster() {
      const supabase = createClient();
      const { data: etData } = await supabase
        .from("edition_teams").select("id, team_id")
        .eq("edition_id", selectedEditionId).eq("is_free_agent_pool", false);
      const etIds = (etData ?? []).map((e: any) => e.id);
      if (etIds.length === 0) return;
      const [{ data: athletes }, { data: staff }] = await Promise.all([
        supabase.from("edition_roster_entries")
          .select("athlete_id, edition_team_id, athletes(id, full_name, surname, photo_url, player_positions(full_name, abbreviation)), edition_teams(team_id, teams(id, full_name, abbreviation, logo_url, primary_color))")
          .eq("member_type", "athlete").eq("status", "approved").in("edition_team_id", etIds),
        supabase.from("edition_roster_entries")
          .select("staff_member_id, edition_team_id, staff_members(id, full_name, surname, photo_url, staff_roles(full_name)), edition_teams(team_id, teams(id, full_name, abbreviation, logo_url, primary_color))")
          .eq("member_type", "staff").eq("status", "approved").in("edition_team_id", etIds),
      ]);
      setEditionAthletes(athletes ?? []);
      setEditionStaff(staff ?? []);
    }
    void loadRoster();
  }, [selectedEditionId]);

  useEffect(() => {
    if (!selectedRoundId || !selectedEditionId) return;
    async function loadSquads() {
      setLoading(true);
      const supabase = createClient();
      const { data: squads } = await supabase
        .from("selection_squads")
        .select("id, squad_type, selection_squad_members(id, athlete_id, staff_member_id, team_id, display_order, athletes(id, full_name, surname, photo_url, player_positions(full_name, abbreviation)), staff_members(id, full_name, surname, photo_url, staff_roles(full_name)), teams(id, full_name, abbreviation, logo_url, primary_color))")
        .eq("edition_id", selectedEditionId).eq("round_id", selectedRoundId);

      const totw = (squads ?? []).find((s: any) => s.squad_type === "totw");
      const motw = (squads ?? []).find((s: any) => s.squad_type === "motw");
      setTotwSquadId(totw?.id ?? null);
      setMotwSquadId(motw?.id ?? null);

      if (totw?.selection_squad_members) {
        const members = [...totw.selection_squad_members].sort((a: any, b: any) => a.display_order - b.display_order);
        const playerSlots = members.filter((m: any) => m.display_order <= 7);
        const coachSlot = members.find((m: any) => m.display_order === 8);
        const newSlots: (any | null)[] = Array(7).fill(null);
        playerSlots.forEach((m: any, i: number) => { if (i < 7) newSlots[i] = buildSlotData(m); });
        setSlots(newSlots);
        setCoach(coachSlot ? buildSlotData(coachSlot) : null);

        if (motw?.selection_squad_members?.[0]) {
          const motwAthleteId = motw.selection_squad_members[0].athlete_id;
          const idx = newSlots.findIndex((s: any) => s?.athleteId === motwAthleteId);
          setMotwIndex(idx >= 0 ? idx : null);
        } else {
          setMotwIndex(null);
        }
      } else {
        setSlots(Array(7).fill(null));
        setCoach(null);
        setMotwIndex(null);
      }
      setLoading(false);
    }
    void loadSquads();
  }, [selectedRoundId, selectedEditionId]);

  function buildSlotData(m: any) {
    const isAthlete = !!m.athlete_id;
    return {
      athleteId: m.athlete_id ?? null,
      staffMemberId: m.staff_member_id ?? null,
      teamId: m.team_id,
      name: isAthlete ? (m.athletes?.surname ?? m.athletes?.full_name ?? "—") : (m.staff_members?.surname ?? m.staff_members?.full_name ?? "—"),
      photo: isAthlete ? m.athletes?.photo_url : m.staff_members?.photo_url,
      role: isAthlete ? (m.athletes?.player_positions?.abbreviation ?? m.athletes?.player_positions?.full_name ?? "") : (m.staff_members?.staff_roles?.full_name ?? "Comissão"),
      teamName: m.teams?.abbreviation ?? m.teams?.full_name ?? "",
      teamLogo: m.teams?.logo_url ?? null,
      teamColor: m.teams?.primary_color ?? null,
      isStaff: !isAthlete,
    };
  }

  function buildFromEntry(entry: any, isAthlete: boolean): any {
    const et = entry.edition_teams as any;
    const person = isAthlete ? entry.athletes : entry.staff_members;
    return {
      athleteId: isAthlete ? entry.athlete_id : null,
      staffMemberId: isAthlete ? null : entry.staff_member_id,
      teamId: et?.team_id ?? "",
      name: person?.surname ?? person?.full_name ?? "—",
      photo: person?.photo_url ?? null,
      role: isAthlete ? (person?.player_positions?.abbreviation ?? person?.player_positions?.full_name ?? "") : (person?.staff_roles?.full_name ?? "Comissão"),
      teamName: et?.teams?.abbreviation ?? et?.teams?.full_name ?? "",
      teamLogo: et?.teams?.logo_url ?? null,
      teamColor: et?.teams?.primary_color ?? null,
      isStaff: !isAthlete,
    };
  }

  async function handleSave() {
    if (!selectedRoundId) return;
    setSaving(true);
    const allMembers: { athleteId?: string; staffMemberId?: string; teamId: string; displayOrder: number }[] = [];
    slots.forEach((s, i) => {
      if (s) allMembers.push({ athleteId: s.athleteId ?? undefined, staffMemberId: s.staffMemberId ?? undefined, teamId: s.teamId, displayOrder: i + 1 });
    });
    if (coach) allMembers.push({ staffMemberId: coach.staffMemberId ?? undefined, athleteId: coach.athleteId ?? undefined, teamId: coach.teamId, displayOrder: 8 });
    const totwResult = await criarOuAtualizarTOTW(selectedEditionId, selectedRoundId, allMembers);
    if ("error" in totwResult) { toast("error", totwResult.error); setSaving(false); return; }
    if (motwIndex !== null && slots[motwIndex]?.athleteId) {
      const m = slots[motwIndex]!;
      await criarOuAtualizarMOTW(selectedEditionId, selectedRoundId, m.athleteId, m.teamId);
    } else if (motwSquadId) {
      await deletarSquad(motwSquadId);
    }
    setSaving(false);
    toast("success", "Premiações semanais salvas.");
  }

  const formationSlots = FORMATIONS[formation].slots;

  // IDs already in slots or coach — prevent duplicates
  const usedAthleteIds = new Set(slots.filter(Boolean).map((s: any) => s.athleteId).filter(Boolean));
  const usedStaffIds = new Set([
    ...slots.filter(Boolean).map((s: any) => s.staffMemberId).filter(Boolean),
    ...(coach ? [coach.staffMemberId] : []),
  ]);

  const searchResults = (() => {
    const pool = searchType === "athlete" ? editionAthletes : editionStaff;
    // Filter out already-used members
    const available = pool.filter((e: any) => {
      if (searchType === "athlete") return !usedAthleteIds.has(e.athlete_id);
      return !usedStaffIds.has(e.staff_member_id);
    });
    if (searchQuery.trim().length === 0) return available.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return available.filter((e: any) => {
      const person = searchType === "athlete" ? e.athletes : e.staff_members;
      return (person?.surname ?? "").toLowerCase().includes(q) ||
             (person?.full_name ?? "").toLowerCase().includes(q) ||
             ((e.edition_teams as any)?.teams?.full_name ?? "").toLowerCase().includes(q);
    }).slice(0, 10);
  })();

  if (rounds.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text-primary)" }}>Sem rodadas</p>
        <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6" }}>Crie rodadas na fase para atribuir premiações semanais.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Search modal */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 460, borderRadius: 16, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--color-text-primary)", margin: 0 }}>
                {searchIsCoach ? "Selecionar técnico" : `Posição: ${formationSlots[searchSlotIndex ?? 0]?.label}`}
              </p>
              <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            {searchIsCoach && (
              <div style={{ padding: "10px 20px 0", display: "flex", gap: 8 }}>
                {[{ key: "staff", label: "Comissão" }, { key: "athlete", label: "Atleta" }].map(t => (
                  <button key={t.key} type="button" onClick={() => { setSearchType(t.key as any); setSearchQuery(""); }}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
                      borderColor: searchType === t.key ? "var(--color-brand)" : "var(--color-border)",
                      backgroundColor: searchType === t.key ? "rgba(191,242,5,0.1)" : "transparent",
                      color: searchType === t.key ? "var(--color-brand)" : "#A6A6A6" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <Search size={14} color="var(--color-text-secondary)" />
              <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou equipe…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }} />
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {searchResults.length === 0 ? (
                <p style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Nenhum resultado.</p>
              ) : searchResults.map((entry: any, idx: number) => {
                const isAth = searchType === "athlete";
                const person = isAth ? entry.athletes : entry.staff_members;
                const team = (entry.edition_teams as any)?.teams;
                const name = person?.surname ?? person?.full_name ?? "—";
                const role = isAth ? (person?.player_positions?.abbreviation ?? "") : (person?.staff_roles?.full_name ?? "");
                return (
                  <button key={idx} type="button"
                    onClick={() => {
                      const sd = buildFromEntry(entry, isAth);
                      if (searchIsCoach) { setCoach(sd); }
                      else if (searchSlotIndex !== null) {
                        setSlots(prev => { const n = [...prev]; n[searchSlotIndex] = sd; return n; });
                        if (motwIndex === searchSlotIndex) setMotwIndex(null);
                      }
                      setSearchOpen(false); setSearchQuery("");
                    }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", background: "none", border: "none", cursor: "pointer", borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    {person?.photo_url ? (
                      <img src={person.photo_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}{role && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--color-brand)", fontWeight: 400 }}>{role}</span>}
                      </p>
                      {team && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          {team.logo_url && <img src={team.logo_url} alt="" style={{ width: 13, height: 13, objectFit: "contain" }} />}
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{team.abbreviation ?? team.full_name}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>Rodada</span>
          <select value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none", cursor: "pointer" }}>
            {rounds.map((r: any) => <option key={r.id} value={r.id}>{r.custom_label ?? r.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>Formação</span>
          {Object.keys(FORMATIONS).map(f => (
            <button key={f} type="button"
              onClick={() => { setFormation(f); setSlots(Array(7).fill(null)); setMotwIndex(null); }}
              style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
                borderColor: formation === f ? "var(--color-brand)" : "var(--color-border)",
                backgroundColor: formation === f ? "rgba(191,242,5,0.1)" : "transparent",
                color: formation === f ? "var(--color-brand)" : "#A6A6A6" }}>
              {FORMATIONS[f].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6" }}>Carregando…</p>
      ) : (
        <>
          {/* Field SVG with player slots */}
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <svg
              viewBox={`0 0 ${FW} ${FH}`}
              style={{ width: "100%", display: "block" }}
              xmlns="http://www.w3.org/2000/svg">

              {/* Background */}
              <rect width={FW} height={FH} fill="var(--color-surface)" />

              {/* Field lines */}
              {/* Outer border */}
              <rect x={PAD_X} y={PAD_Y} width={INNER_W} height={INNER_H} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />

              {/* Center line */}
              <line x1={FW/2} y1={PAD_Y} x2={FW/2} y2={PAD_Y + INNER_H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

              {/* Center circle */}
              <circle cx={FW/2} cy={FH/2} r={Math.min(INNER_H, INNER_W) * 0.13} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <circle cx={FW/2} cy={FH/2} r="3" fill="rgba(255,255,255,0.2)" />

              {/* Left penalty area */}
              <rect x={PAD_X} y={PAD_Y + INNER_H * 0.22} width={INNER_W * 0.18} height={INNER_H * 0.56} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* Left goal area */}
              <rect x={PAD_X} y={PAD_Y + INNER_H * 0.35} width={INNER_W * 0.08} height={INNER_H * 0.30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* Left goal */}
              <rect x={PAD_X - 14} y={PAD_Y + INNER_H * 0.40} width={14} height={INNER_H * 0.20} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              {/* Left penalty spot */}
              <circle cx={PAD_X + INNER_W * 0.12} cy={FH/2} r="2.5" fill="rgba(255,255,255,0.2)" />

              {/* Right penalty area */}
              <rect x={PAD_X + INNER_W * 0.82} y={PAD_Y + INNER_H * 0.22} width={INNER_W * 0.18} height={INNER_H * 0.56} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* Right goal area */}
              <rect x={PAD_X + INNER_W * 0.92} y={PAD_Y + INNER_H * 0.35} width={INNER_W * 0.08} height={INNER_H * 0.30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* Right goal */}
              <rect x={PAD_X + INNER_W} y={PAD_Y + INNER_H * 0.40} width={14} height={INNER_H * 0.20} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              {/* Right penalty spot */}
              <circle cx={PAD_X + INNER_W * 0.88} cy={FH/2} r="2.5" fill="rgba(255,255,255,0.2)" />

              {/* Substitution marks */}
              <line x1={FW/2 - 20} y1={PAD_Y} x2={FW/2 - 20} y2={PAD_Y - 8} stroke="rgba(191,242,5,0.4)" strokeWidth="1.5" />
              <line x1={FW/2 + 20} y1={PAD_Y} x2={FW/2 + 20} y2={PAD_Y - 8} stroke="rgba(191,242,5,0.4)" strokeWidth="1.5" />

              {/* Player slots */}
              {formationSlots.map((slot, i) => {
                const { cx, cy } = slotPosition(slot.col, slot.row, slot.total);
                const data = slots[i];
                const isMotw = motwIndex === i;
                const teamColor = data?.teamColor ?? null;
                const foSize = AVATAR_R * 2;

                return (
                  <g key={i}>
                    {!data && (
                      <>
                        <circle cx={cx} cy={cy} r={AVATAR_R} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="4 3" />
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700" fill="rgba(255,255,255,0.25)">{slot.label}</text>
                        <circle cx={cx} cy={cy} r={AVATAR_R} fill="transparent" style={{ cursor: "pointer" }}
                          onClick={() => { setSearchSlotIndex(i); setSearchIsCoach(false); setSearchType("athlete"); setSearchQuery(""); setSearchOpen(true); }} />
                      </>
                    )}
                    {data && (
                      <foreignObject x={cx - foSize/2 - 8} y={cy - foSize/2 - 8} width={foSize + 16} height={foSize + 40}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 8px 0" }}>
                          <style>{`.sa${i}:hover .sg${i}{opacity:1}.sa${i}:hover .sr${i}{box-shadow:0 0 0 2px ${teamColor ?? "#BFF205"},0 0 12px 3px ${teamColor ? teamColor+"55" : "rgba(191,242,5,0.3)"}}`}</style>
                          <div className={`sa${i}`} style={{ position: "relative", width: foSize, height: foSize, cursor: "pointer", flexShrink: 0 }}
                            onClick={() => { setSearchSlotIndex(i); setSearchIsCoach(false); setSearchType("athlete"); setSearchQuery(""); setSearchOpen(true); }}>
                            <div className={`sg${i}`} style={{ position: "absolute", inset: -6, borderRadius: "50%", opacity: 0, pointerEvents: "none", transition: "opacity 0.2s",
                              background: teamColor ? `radial-gradient(circle,${teamColor}44 0%,transparent 70%)` : "radial-gradient(circle,rgba(191,242,5,0.25) 0%,transparent 70%)" }} />
                            <div className={`sr${i}`} style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                              border: `2px solid ${isMotw ? "#BFF205" : "rgba(255,255,255,0.3)"}`, backgroundColor: "rgba(0,0,0,0.5)", transition: "box-shadow 0.2s" }}>
                              {data.photo
                                ? <img src={data.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{data.name.slice(0,2).toUpperCase()}</div>
                              }
                            </div>
                            {!data.isStaff && (
                              <div onClick={e => { e.stopPropagation(); setMotwIndex(isMotw ? null : i); }}
                                style={{ position: "absolute", top: -3, right: -3, width: 15, height: 15, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, transition: "all 0.15s",
                                  backgroundColor: isMotw ? "#BFF205" : "rgba(0,0,0,0.85)", border: `1px solid ${isMotw ? "#BFF205" : "rgba(255,255,255,0.2)"}`, color: isMotw ? "#0D0D0D" : "rgba(255,255,255,0.4)" }}>★</div>
                            )}
                            <div onClick={e => { e.stopPropagation(); setSlots(prev => { const n = [...prev]; n[i] = null; return n; }); if (motwIndex === i) setMotwIndex(null); }}
                              style={{ position: "absolute", top: -3, left: -3, width: 15, height: 15, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, backgroundColor: "rgba(255,68,68,0.9)", color: "white", lineHeight: 1 }}>×</div>
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, color: isMotw ? "#BFF205" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap", maxWidth: foSize + 12, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{data.name}</p>
                          {data.teamName && <p style={{ margin: "1px 0 0", fontSize: 8, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>{data.teamName}</p>}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Coach row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", minWidth: 52 }}>Técnico</span>
            {coach ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                {coach.photo ? (
                  <img src={coach.photo} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    {coach.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{coach.name}</p>
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-brand)" }}>{coach.role} · {coach.teamName}</p>
                </div>
                <button type="button" onClick={() => setCoach(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}><X size={14} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => { setSearchIsCoach(true); setSearchType("staff"); setSearchQuery(""); setSearchOpen(true); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--color-border)", backgroundColor: "transparent", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-brand)" }}>
                <Plus size={12} /> Adicionar técnico
              </button>
            )}
          </div>

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)" }}>
            {rounds.find((r: any) => r.id === selectedRoundId)?.custom_label ?? rounds.find((r: any) => r.id === selectedRoundId)?.name}
              {motwIndex !== null && slots[motwIndex] && (
                <span style={{ marginLeft: 12, color: "#BFF205" }}>★ MOTW: {slots[motwIndex]!.name}</span>
              )}
            </p>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding: "9px 22px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando…" : "Salvar premiações"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── BracketView ──────────────────────────────────────────────────────────────
// Substitui todo o bloco anterior a partir deste comentário.
// Requer: useState, useEffect, useRef (já importados no topo do arquivo),
//         createClient (já importado), useRouter (já importado).

const KNOCKOUT_ORDER = [
  "Décimas de Final", "Oitavas de Final", "Quartas de Final",
  "Semifinal", "Final", "Disputa de Terceiro Lugar",
];

function sortRoundLabels(labels: string[]): string[] {
  const thirds = labels.filter(l => l === "Disputa de Terceiro Lugar");
  const rest = labels.filter(l => l !== "Disputa de Terceiro Lugar");
  const sorted = rest.sort((a, b) => {
    const ia = KNOCKOUT_ORDER.indexOf(a);
    const ib = KNOCKOUT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return -1;
    if (ib === -1) return 1;
    return ia - ib;
  });
  return [...sorted, ...thirds];
}

type MatchupData = {
  id: string;
  round_label: string;
  round_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  is_completed: boolean;
  display_order: number;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  matches?: MatchItemData[];
};

type MatchItemData = {
  id: string;
  score_a: number;
  score_b: number;
  status: string;
  match_date: string | null;
  pen_a?: number | null;
  pen_b?: number | null;
};

type MatchupResult = {
  scoreA: number | null;
  scoreB: number | null;
  penA: number | null;
  penB: number | null;
  winner: "a" | "b" | null;
  hasShootout: boolean;
};

function computeMatchupResult(
  matchup: MatchupData,
  legs: boolean,
  aggregateScore: boolean,
): MatchupResult {
  const finished = (matchup.matches ?? []).filter(m => m.status === "finished");
  if (!finished.length) return { scoreA: null, scoreB: null, penA: null, penB: null, winner: null, hasShootout: false };

  let scoreA: number | null = null;
  let scoreB: number | null = null;
  let penA: number | null = null;
  let penB: number | null = null;
  let hasShootout = false;

  if (!legs) {
    const m = finished[0];
    scoreA = m.score_a; scoreB = m.score_b;
    penA = m.pen_a ?? null; penB = m.pen_b ?? null;
    hasShootout = penA !== null;
  } else if (aggregateScore) {
    scoreA = finished.reduce((s, m) => s + m.score_a, 0);
    scoreB = finished.reduce((s, m) => s + m.score_b, 0);
    const last = finished[finished.length - 1];
    penA = last?.pen_a ?? null;
    penB = last?.pen_b ?? null;
    hasShootout = penA !== null;
  } else {
    // Sem agregado: conta vitórias na série
    let wA = 0, wB = 0;
    finished.forEach(m => {
      const pa = m.pen_a ?? null, pb = m.pen_b ?? null;
      if (pa !== null && pb !== null) {
        hasShootout = true;
        if (pa > pb) wA++; else if (pb > pa) wB++;
      } else {
        if (m.score_a > m.score_b) wA++; else if (m.score_b > m.score_a) wB++;
      }
    });
    scoreA = wA; scoreB = wB;
  }

  let winner: "a" | "b" | null = null;
  if (penA !== null && penB !== null) {
    winner = penA > penB ? "a" : penB > penA ? "b" : null;
  } else if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
    winner = scoreA > scoreB ? "a" : "b";
  }

  return { scoreA, scoreB, penA, penB, winner, hasShootout };
}

// ── Linha de time dentro do card ───────────────────────────────────────────
function BracketTeamRow({
  team, score, penScore, isWinner, isLoser, hasBorderTop,
}: {
  team: MatchupData["teams_a"];
  score: number | null;
  penScore: number | null;
  isWinner: boolean;
  isLoser: boolean;
  hasBorderTop: boolean;
}) {
  const nameColor = isWinner
    ? "var(--color-brand)"
    : isLoser
    ? "rgba(255,255,255,0.18)"
    : "var(--color-text-primary)";
  const scoreColor = isWinner
    ? "var(--color-brand)"
    : isLoser
    ? "rgba(255,255,255,0.12)"
    : "var(--color-text-primary)";
  const isTbd = !team;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", minHeight: 34,
      borderTop: hasBorderTop ? "1px solid var(--color-border)" : "none",
      backgroundColor: isWinner ? "rgba(191,242,5,0.04)" : "transparent",
    }}>
      {/* Logo */}
      {team?.logo_url ? (
        <img src={team.logo_url} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: "contain", flexShrink: 0, filter: isLoser ? "grayscale(1) opacity(0.25)" : "none" }} />
      ) : (
        <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: "var(--color-border)", flexShrink: 0 }} />
      )}

      {/* Nome */}
      <span style={{
        flex: 1, fontFamily: "var(--font-mono)", fontSize: 11,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        color: nameColor, fontWeight: isWinner ? 700 : 500,
        fontStyle: isTbd ? "italic" : "normal",
      }}>
        {isTbd ? "A definir" : (team?.abbreviation ?? team?.full_name ?? "A definir")}
      </span>

      {/* Placar */}
      {score !== null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          {penScore !== null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(191,242,5,0.65)", lineHeight: 1 }}>
              ({penScore})
            </span>
          )}
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1, minWidth: 14, textAlign: "right", color: scoreColor }}>
            {score}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Card de confronto ──────────────────────────────────────────────────────
function BracketMatchupCard({
  matchup, legs, aggregateScore, showOrder, onOpenModal,
}: {
  matchup: MatchupData;
  legs: boolean;
  aggregateScore: boolean;
  showOrder: boolean;
  onOpenModal: () => void;
}) {
  const finished = (matchup.matches ?? []).filter(m => m.status === "finished");
  const allMatches = matchup.matches ?? [];
  const hasMatches = allMatches.length > 0;
  const res = computeMatchupResult(matchup, legs, aggregateScore);

  // Barra de placar agregado (só se ida e volta com aggregate e 2+ jogos finalizados)
  const showAggBar = legs && aggregateScore && finished.length > 1;
  const aggA = showAggBar ? finished.reduce((s, m) => s + m.score_a, 0) : null;
  const aggB = showAggBar ? finished.reduce((s, m) => s + m.score_b, 0) : null;
  const lastGame = finished[finished.length - 1];
  const aggPenA = showAggBar ? (lastGame?.pen_a ?? null) : null;
  const aggPenB = showAggBar ? (lastGame?.pen_b ?? null) : null;
  const aggWinnerA = showAggBar && (
    aggPenA !== null ? aggPenA > (aggPenB ?? 0) : (aggA ?? 0) > (aggB ?? 0)
  );
  const aggWinnerB = showAggBar && (
    aggPenB !== null ? aggPenB > (aggPenA ?? 0) : (aggB ?? 0) > (aggA ?? 0)
  );

  const tA = matchup.teams_a?.abbreviation ?? matchup.teams_a?.full_name ?? "A def.";
  const tB = matchup.teams_b?.abbreviation ?? matchup.teams_b?.full_name ?? "A def.";

  return (
    <div
      onClick={hasMatches ? onOpenModal : undefined}
      style={{
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
        cursor: hasMatches ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => { if (hasMatches) (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.35)"; }}
      onMouseLeave={e => { if (hasMatches) (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
    >
      {/* Barra de agregado */}
      {showAggBar && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 9px", backgroundColor: "rgba(191,242,5,0.05)", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
            Agregado
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>
            <span style={{ color: aggWinnerA ? "var(--color-brand)" : "var(--color-text-secondary)", fontWeight: aggWinnerA ? 700 : 400 }}>{tA} {aggA}</span>
            <span style={{ margin: "0 3px", color: "var(--color-border)" }}>–</span>
            <span style={{ color: aggWinnerB ? "var(--color-brand)" : "var(--color-text-secondary)", fontWeight: aggWinnerB ? 700 : 400 }}>{aggB} {tB}</span>
            {aggPenA !== null && (
              <span style={{ marginLeft: 4, color: "rgba(191,242,5,0.6)", fontSize: 8 }}>
                pen {aggPenA}–{aggPenB}
              </span>
            )}
          </span>
        </div>
      )}

      <BracketTeamRow
        team={matchup.teams_a}
        score={res.scoreA}
        penScore={res.penA}
        isWinner={res.winner === "a"}
        isLoser={res.winner === "b" && hasMatches}
        hasBorderTop={false}
      />
      <BracketTeamRow
        team={matchup.teams_b}
        score={res.scoreB}
        penScore={res.penB}
        isWinner={res.winner === "b"}
        isLoser={res.winner === "a" && hasMatches}
        hasBorderTop
      />

      {/* Footer */}
      {hasMatches && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 9px", borderTop: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-brand)", letterSpacing: "0.04em" }}>
            VER JOGOS ›
          </span>
          {showOrder && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(191,242,5,0.4)", background: "rgba(191,242,5,0.07)", borderRadius: 3, padding: "2px 5px" }}>
              #{matchup.display_order}
            </span>
          )}
        </div>
      )}
      {!hasMatches && showOrder && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 9px", borderTop: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(191,242,5,0.4)", background: "rgba(191,242,5,0.07)", borderRadius: 3, padding: "2px 5px" }}>
            #{matchup.display_order}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Modal de detalhe dos jogos ────────────────────────────────────────────
function BracketSeriesModal({
  matchup, legs, aggregateScore, onClose,
}: {
  matchup: MatchupData;
  legs: boolean;
  aggregateScore: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const finished = (matchup.matches ?? []).filter(m => m.status === "finished");
  const isLegs = legs && finished.length > 1;
  const tA = matchup.teams_a?.abbreviation ?? matchup.teams_a?.full_name ?? "Time A";
  const tB = matchup.teams_b?.abbreviation ?? matchup.teams_b?.full_name ?? "Time B";

  // Linha de resumo no topo
  let summaryLabel = "";
  let summaryValue = "";
  if (isLegs && aggregateScore) {
    const totA = finished.reduce((s, m) => s + m.score_a, 0);
    const totB = finished.reduce((s, m) => s + m.score_b, 0);
    const last = finished[finished.length - 1];
    const pen = last?.pen_a != null ? ` · Pên: ${last.pen_a}–${last.pen_b}` : "";
    summaryLabel = "Placar agregado";
    summaryValue = `${tA} ${totA}–${totB} ${tB}${pen}`;
  } else if (isLegs && !aggregateScore) {
    let wA = 0, wB = 0;
    finished.forEach(m => {
      const pa = m.pen_a ?? null, pb = m.pen_b ?? null;
      if (pa !== null && pb !== null) { if (pa > pb) wA++; else if (pb > pa) wB++; }
      else { if (m.score_a > m.score_b) wA++; else if (m.score_b > m.score_a) wB++; }
    });
    summaryLabel = "Vitórias na série";
    summaryValue = `${tA} ${wA}–${wB} ${tB}`;
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 340, borderRadius: 12, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>

        {/* Cabeçalho */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--color-text-accent)", flex: 1 }}>
            {tA} × {tB}
          </span>
          <button
            onClick={onClose}
            style={{ width: 24, height: 24, borderRadius: 5, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-brand)"; (e.currentTarget as HTMLElement).style.color = "var(--color-brand)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
          >
            ×
          </button>
        </div>

        {/* Resumo agregado / série */}
        {summaryLabel && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", backgroundColor: "rgba(191,242,5,0.05)", borderBottom: "1px solid var(--color-border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
              {summaryLabel}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-brand)", fontWeight: 700 }}>
              {summaryValue}
            </span>
          </div>
        )}

        {/* Jogos */}
        {finished.map((m, i) => {
          const hasPen = (m.pen_a ?? null) !== null;
          const wA = hasPen ? (m.pen_a! > m.pen_b!) : m.score_a > m.score_b;
          const wB = hasPen ? (m.pen_b! > m.pen_a!) : m.score_b > m.score_a;
          const gameLabel = isLegs
            ? (i === 0 ? "Jogo de ida" : "Jogo de volta")
            : "Jogo único";

          return (
            <div key={m.id} style={{ borderBottom: i < finished.length - 1 ? "1px solid var(--color-border)" : "none" }}>
              {/* Label do jogo */}
              <div style={{ padding: "8px 14px 4px", fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-secondary)" }}>
                {gameLabel}
              </div>

              {/* Placar do Time A */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 14px" }}>
                <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, color: wA ? "var(--color-brand)" : wB ? "rgba(255,255,255,0.2)" : "var(--color-text-primary)" }}>
                  {tA}
                </span>
                {hasPen && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, background: "rgba(191,242,5,0.1)", color: "var(--color-brand)", padding: "2px 5px", borderRadius: 3 }}>
                    pen
                  </span>
                )}
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1, color: wA ? "var(--color-brand)" : wB ? "rgba(255,255,255,0.12)" : "var(--color-text-primary)" }}>
                  {m.score_a}
                </span>
              </div>

              {/* Placar do Time B */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 14px 6px" }}>
                <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, color: wB ? "var(--color-brand)" : wA ? "rgba(255,255,255,0.2)" : "var(--color-text-primary)" }}>
                  {tB}
                </span>
                {hasPen && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, background: "rgba(191,242,5,0.1)", color: "var(--color-brand)", padding: "2px 5px", borderRadius: 3 }}>
                    pen
                  </span>
                )}
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1, color: wB ? "var(--color-brand)" : wA ? "rgba(255,255,255,0.12)" : "var(--color-text-primary)" }}>
                  {m.score_b}
                </span>
              </div>

              {/* Bloco de pênaltis */}
              {hasPen && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px 8px", backgroundColor: "rgba(191,242,5,0.04)", borderTop: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: 10 }}>⚽</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-text-secondary)" }}>
                    Pênaltis:{" "}
                    <span style={{ color: "var(--color-brand)", fontWeight: 700 }}>
                      {tA} {m.pen_a} × {m.pen_b} {tB}
                    </span>
                  </span>
                </div>
              )}

              {/* Link para a partida */}
              <div style={{ padding: "6px 14px 8px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => router.push(`/partidas/${m.id}`)}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-text-secondary)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-brand)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.4)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
                >
                  Ver partida →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Connector SVG entre colunas ───────────────────────────────────────────
function drawBracketConnectors(
  svgEl: SVGSVGElement,
  canvasEl: HTMLElement,
  orderedLabels: string[],
  byRound: Record<string, MatchupData[]>,
  direction: "ltr" | "rtl" = "ltr",
) {
  const cr = canvasEl.getBoundingClientRect();
  svgEl.style.width = canvasEl.scrollWidth + "px";
  svgEl.style.height = canvasEl.scrollHeight + "px";
  // Limpa somente os paths desta direção para não apagar paths do lado oposto
  const color = direction === "ltr" ? "rgba(191,242,5,0.14)" : "rgba(191,242,5,0.14)";

  const mainLabels = orderedLabels.filter(l => l !== "Disputa de Terceiro Lugar");
  for (let ci = 0; ci < mainLabels.length - 1; ci++) {
    const fromMs = [...(byRound[mainLabels[ci]] ?? [])].sort((a, b) => a.display_order - b.display_order);
    const toMs = [...(byRound[mainLabels[ci + 1]] ?? [])].sort((a, b) => a.display_order - b.display_order);

    toMs.forEach((dst, ti) => {
      const srcA = fromMs[ti * 2];
      const srcB = fromMs[ti * 2 + 1];
      const dstEl = canvasEl.querySelector<HTMLElement>(`[data-matchup-id="${dst.id}"]`);
      if (!dstEl) return;
      const dr = dstEl.getBoundingClientRect();
      const dstMidY = dr.top - cr.top + dr.height / 2;
      const dstX = direction === "ltr" ? dr.left - cr.left : dr.right - cr.left;

      [srcA, srcB].forEach(src => {
        if (!src) return;
        const srcEl = canvasEl.querySelector<HTMLElement>(`[data-matchup-id="${src.id}"]`);
        if (!srcEl) return;
        const sr = srcEl.getBoundingClientRect();
        const srcMidY = sr.top - cr.top + sr.height / 2;
        const srcX = direction === "ltr" ? sr.right - cr.left : sr.left - cr.left;
        const midX = (srcX + dstX) / 2;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${srcX} ${srcMidY} L ${midX} ${srcMidY} L ${midX} ${dstMidY} L ${dstX} ${dstMidY}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("stroke-linecap", "round");
        svgEl.appendChild(path);
      });
    });
  }
}

// ── BracketView principal ─────────────────────────────────────────────────
function BracketView({
  phaseId,
  matchups,
  phaseRounds,
  phaseType,
}: {
  phaseId: string;
  matchups: MatchupData[];
  phaseRounds: Round[];
  phaseType: "knockout" | "conference";
}) {
  const [enriched, setEnriched] = useState<MatchupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMatchup, setModalMatchup] = useState<MatchupData | null>(null);
  const [modalRound, setModalRound] = useState<{ legs: boolean; aggregateScore: boolean }>({ legs: false, aggregateScore: false });
  const [reorderMode, setReorderMode] = useState(false);
  const [localMatchups, setLocalMatchups] = useState<MatchupData[]>([]);
  const dragId = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const matchupIdsKey = matchups.map(m => m.id).join(",");

  // Busca partidas e shootouts para cada matchup
  useEffect(() => {
    if (!phaseId) return;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const matchupIds = matchups.map(m => m.id);
      if (!matchupIds.length) { setEnriched([]); setLoading(false); return; }

      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, matchup_id, score_a, score_b, status, match_date, team_a_id")
        .in("matchup_id", matchupIds)
        .order("match_date", { ascending: true });

      const matchIds = (matchesData ?? []).map((m: any) => m.id);
      let shootouts: any[] = [];
      if (matchIds.length) {
        const { data: soData } = await supabase
          .from("match_penalty_shootout")
          .select("match_id, team_id, result")
          .in("match_id", matchIds);
        shootouts = soData ?? [];
      }

      // Monta pen_a / pen_b por partida
      const penByMatch: Record<string, { pen_a: number; pen_b: number }> = {};
      const matchTeamAMap: Record<string, string> = {};
      (matchesData ?? []).forEach((m: any) => { matchTeamAMap[m.id] = m.team_a_id; });

      shootouts.forEach((s: any) => {
        if (!penByMatch[s.match_id]) penByMatch[s.match_id] = { pen_a: 0, pen_b: 0 };
        const isTeamA = matchTeamAMap[s.match_id] === s.team_id;
        const goals = (s.result as string[]).filter(r => r === "goal").length;
        if (isTeamA) penByMatch[s.match_id].pen_a = goals;
        else penByMatch[s.match_id].pen_b = goals;
      });

      // Agrupa partidas por matchup
      const matchesByMatchup: Record<string, MatchItemData[]> = {};
      (matchesData ?? []).forEach((m: any) => {
        if (!matchesByMatchup[m.matchup_id]) matchesByMatchup[m.matchup_id] = [];
        matchesByMatchup[m.matchup_id].push({
          id: m.id,
          score_a: m.score_a ?? 0,
          score_b: m.score_b ?? 0,
          status: m.status,
          match_date: m.match_date,
          pen_a: penByMatch[m.id]?.pen_a ?? null,
          pen_b: penByMatch[m.id]?.pen_b ?? null,
        });
      });

      const result = matchups.map(mu => ({ ...mu, matches: matchesByMatchup[mu.id] ?? [] }));
      setEnriched(result);
      setLocalMatchups(result);
      setLoading(false);
    }
    load();
  }, [phaseId, matchupIdsKey]);

  // Sincroniza localMatchups quando enriched muda
  useEffect(() => { setLocalMatchups(enriched); }, [enriched]);

  // Redesenha conectores após render
  useEffect(() => {
    if (loading || !canvasRef.current || !svgRef.current) return;
    const timer = setTimeout(() => {
      if (!canvasRef.current || !svgRef.current) return;
      svgRef.current.innerHTML = "";
      const byRound: Record<string, MatchupData[]> = {};
      localMatchups.forEach(m => { if (!byRound[m.round_label]) byRound[m.round_label] = []; byRound[m.round_label].push(m); });

      if (phaseType === "knockout") {
        const labels = sortRoundLabels(Object.keys(byRound));
        drawBracketConnectors(svgRef.current, canvasRef.current, labels, byRound, "ltr");
      } else {
        // Conference: redesenha os dois lados
        // Os connectores são redesenhados pelo ConferenceBracket via seus próprios refs
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [localMatchups, loading, reorderMode, phaseType]);

  function handleDragStart(id: string) { dragId.current = id; }
  function handleDrop(targetId: string, round: string) {
    if (!dragId.current || dragId.current === targetId) return;
    const src = localMatchups.find(m => m.id === dragId.current);
    const tgt = localMatchups.find(m => m.id === targetId);
    if (!src || !tgt || src.round_label !== tgt.round_label) return;
    const updated = localMatchups.map(m => {
      if (m.id === src.id) return { ...m, display_order: tgt.display_order };
      if (m.id === tgt.id) return { ...m, display_order: src.display_order };
      return m;
    });
    setLocalMatchups(updated);
    dragId.current = null;
  }

  function openModal(mu: MatchupData) {
    const round = phaseRounds.find(r => (r.custom_label ?? r.name) === mu.round_label);
    setModalRound({ legs: round?.legs ?? false, aggregateScore: round?.aggregate_score ?? false });
    setModalMatchup(mu);
  }

  if (loading) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Carregando bracket…
        </p>
      </div>
    );
  }

  if (!localMatchups.length && !phaseRounds.length) {
    return (
      <p style={{ padding: "32px 0", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>
        Nenhuma rodada cadastrada nesta fase.
      </p>
    );
  }

  return (
    <>
      {phaseType === "knockout" ? (
        <KnockoutBracket
          matchups={localMatchups}
          phaseRounds={phaseRounds}
          reorderMode={reorderMode}
          onToggleReorder={() => setReorderMode(v => !v)}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onOpenModal={openModal}
          canvasRef={canvasRef}
          svgRef={svgRef}
        />
      ) : (
        <ConferenceBracket
          matchups={localMatchups}
          phaseRounds={phaseRounds}
          onOpenModal={openModal}
        />
      )}

      {modalMatchup && (
        <BracketSeriesModal
          matchup={modalMatchup}
          legs={modalRound.legs}
          aggregateScore={modalRound.aggregateScore}
          onClose={() => setModalMatchup(null)}
        />
      )}
    </>
  );
}

// ── Knockout (esquerda → direita) ─────────────────────────────────────────
function KnockoutBracket({
  matchups, phaseRounds, reorderMode, onToggleReorder,
  onDragStart, onDrop, onOpenModal, canvasRef, svgRef,
}: {
  matchups: MatchupData[];
  phaseRounds: Round[];
  reorderMode: boolean;
  onToggleReorder: () => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string, round: string) => void;
  onOpenModal: (mu: MatchupData) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
}) {
  const byRound: Record<string, MatchupData[]> = {};
  matchups.forEach(m => { if (!byRound[m.round_label]) byRound[m.round_label] = []; byRound[m.round_label].push(m); });

  // Garante que rodadas sem confrontos aparecem como colunas vazias
  phaseRounds.forEach(r => {
    const label = r.custom_label ?? r.name;
    if (!byRound[label]) byRound[label] = [];
  });

  // Ordena: primeiro pelo display_order da rodada, fallback para KNOCKOUT_ORDER
  const sortedLabels = Object.keys(byRound).filter(label => {
    // Remove "Disputa de Terceiro Lugar" se não existir rodada com esse nome
    if (label === "Disputa de Terceiro Lugar") {
      return phaseRounds.some(r => (r.custom_label ?? r.name) === "Disputa de Terceiro Lugar");
    }
    return true;
  }).sort((a, b) => {

    const ra = phaseRounds.find(r => (r.custom_label ?? r.name) === a);
    const rb = phaseRounds.find(r => (r.custom_label ?? r.name) === b);
    const isThirdA = a === "Disputa de Terceiro Lugar";
    const isThirdB = b === "Disputa de Terceiro Lugar";
    if (isThirdA && !isThirdB) return 1;
    if (!isThirdA && isThirdB) return -1;
    if (ra?.display_order && rb?.display_order) return ra.display_order - rb.display_order;
    const ia = KNOCKOUT_ORDER.indexOf(a);
    const ib = KNOCKOUT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return -1;
    if (ib === -1) return 1;
    return ia - ib;
  });

  return (
    <div>
      {/* Toolbar de reordenação */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          onClick={onToggleReorder}
          style={{
            padding: "5px 12px", borderRadius: 6,
            border: `1px solid ${reorderMode ? "rgba(191,242,5,0.5)" : "var(--color-border)"}`,
            background: reorderMode ? "rgba(191,242,5,0.08)" : "transparent",
            color: reorderMode ? "var(--color-brand)" : "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em",
            textTransform: "uppercase", cursor: "pointer",
          }}
        >
          {reorderMode ? "Sair da reordenação" : "Reordenar confrontos"}
        </button>
        {reorderMode && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>
            Arraste os cards dentro de cada fase para ajustar a ordem
          </span>
        )}
      </div>

      {/* Canvas do bracket */}
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div ref={canvasRef} style={{ position: "relative", display: "inline-flex", minWidth: "100%" }}>
          <svg
            ref={svgRef}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible", zIndex: 0 }}
          />
          <div style={{ display: "flex", alignItems: "stretch", position: "relative", zIndex: 1 }}>
            {sortedLabels.map(label => {
              const isThird = label === "Disputa de Terceiro Lugar";
              const round = phaseRounds.find(r => (r.custom_label ?? r.name) === label);
              const legs = round?.legs ?? false;
              const aggregateScore = round?.aggregate_score ?? false;
              const sorted = [...(byRound[label] ?? [])].sort((a, b) => a.display_order - b.display_order);

              return (
                <div key={label} style={{ display: "flex", flexDirection: "column", minWidth: 196, flexShrink: 0, borderRight: "1px solid var(--color-border)" }}>
                  <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid var(--color-border)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: isThird ? "var(--color-warning)" : "var(--color-brand)" }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "14px 10px", gap: 14 }}>
                    {sorted.map(mu => (
                      <div
                        key={mu.id}
                        data-matchup-id={mu.id}
                        draggable={reorderMode}
                        onDragStart={() => onDragStart(mu.id)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => onDrop(mu.id, mu.round_label)}
                        style={{ cursor: reorderMode ? "grab" : "default" }}
                      >
                        <BracketMatchupCard
                          matchup={mu}
                          legs={legs}
                          aggregateScore={aggregateScore}
                          showOrder={reorderMode}
                          onOpenModal={() => onOpenModal(mu)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Conference (Oeste → centro ← Leste) ──────────────────────────────────
function ConferenceBracket({
  matchups, phaseRounds, onOpenModal,
}: {
  matchups: MatchupData[];
  phaseRounds: Round[];
  onOpenModal: (mu: MatchupData) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Detecta o matchup da grande final (sem par / único na fase mais avançada)
  // Convenção: round_label que contém "Final" e display_order = 1 e único
  const allLabels = [...new Set(matchups.map(m => m.round_label))];
  const finalLabelFromRounds = phaseRounds.find(r => /grande\s*final|gf|grand\s*final/i.test(r.custom_label ?? r.name));
  const finalLabel = allLabels.find(l => /grande\s*final|gf|grand\s*final/i.test(l)) ?? null;
  const showFinalColumn = !!finalLabel || !!finalLabelFromRounds;
  const finalColumnLabel = finalLabel ?? (finalLabelFromRounds ? (finalLabelFromRounds.custom_label ?? finalLabelFromRounds.name) : null);
  const finalMatchup = finalLabel ? matchups.find(m => m.round_label === finalLabel) : null;

  // Separa os dois lados pela convenção: metade display_order par/ímpar, ou por campo "conference_side"
  // Como o banco não tem conference_side no matchup, usamos a convenção de split por display_order
  // Oeste: display_order ímpar, Leste: par — OU podemos detectar automaticamente pelo número de rounds
  // Abordagem mais robusta: divide os não-finais em dois grupos de mesmo tamanho (metade esquerda, metade direita)
  const nonFinal = matchups.filter(m => m.round_label !== finalLabel);
  
  // Inclui rodadas sem confrontos como colunas vazias
  const roundLabelsFromMatchups = nonFinal.map(m => m.round_label);
  const roundLabelsFromRounds = phaseRounds
    .filter(r => (r.custom_label ?? r.name) !== finalLabel)
    .map(r => r.custom_label ?? r.name);
  const roundLabels = [...new Set([...roundLabelsFromMatchups, ...roundLabelsFromRounds])];

  // Se houver um campo de conferência no futuro, usar aqui.
  // Por ora, lado Oeste = display_order ≤ metade dos matchups de cada rodada
  // Detectamos os dois lados por display_order em cada round
  function splitSide(roundLabel: string): { west: MatchupData[]; east: MatchupData[] } {
    const ms = nonFinal.filter(m => m.round_label === roundLabel).sort((a, b) => a.display_order - b.display_order);
    const half = Math.ceil(ms.length / 2);
    return { west: ms.slice(0, half), east: ms.slice(half) };
  }

  const westRounds = roundLabels.map(l => ({ label: l, matchups: splitSide(l).west }));
  const eastRounds = roundLabels.map(l => ({ label: l, matchups: splitSide(l).east })).reverse();

  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return;
    const timer = setTimeout(() => {
      if (!canvasRef.current || !svgRef.current) return;
      svgRef.current.innerHTML = "";
      const byRoundWest: Record<string, MatchupData[]> = {};
      const byRoundEast: Record<string, MatchupData[]> = {};
      westRounds.forEach(r => { byRoundWest[r.label] = r.matchups; });
      eastRounds.forEach(r => { byRoundEast[r.label] = r.matchups; });
      drawBracketConnectors(svgRef.current!, canvasRef.current!, westRounds.map(r => r.label), byRoundWest, "ltr");
      drawBracketConnectors(svgRef.current!, canvasRef.current!, eastRounds.map(r => r.label), byRoundEast, "rtl");
    }, 80);
    return () => clearTimeout(timer);
  }, [matchups]);

  function renderCol(label: string, ms: MatchupData[], side: "west" | "east") {
    const round = phaseRounds.find(r => (r.custom_label ?? r.name) === label);
    const legs = round?.legs ?? false;
    const aggregateScore = round?.aggregate_score ?? false;
    const sorted = [...ms].sort((a, b) => a.display_order - b.display_order);
    const labelColor = side === "west" ? "#60a5fa" : "#f472b6";
    return (
      <div key={`${side}-${label}`} style={{ display: "flex", flexDirection: "column", minWidth: 190, flexShrink: 0, borderRight: "1px solid var(--color-border)" }}>
        <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: labelColor }}>
            {label}
          </span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "14px 10px", gap: 14 }}>
          {sorted.map(mu => (
            <div key={mu.id} data-matchup-id={mu.id}>
              <BracketMatchupCard matchup={mu} legs={legs} aggregateScore={aggregateScore} showOrder={false} onOpenModal={() => onOpenModal(mu)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div ref={canvasRef} style={{ position: "relative", display: "inline-flex", minWidth: "100%" }}>
        <svg
          ref={svgRef}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible", zIndex: 0 }}
        />
        <div style={{ display: "flex", alignItems: "stretch", position: "relative", zIndex: 1 }}>
          {/* Tag Oeste */}
          <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 5px", color: "#60a5fa", borderRight: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Oeste
          </div>

          {/* Colunas Oeste */}
          {westRounds.map(r => renderCol(r.label, r.matchups, "west"))}

          {/* Grande Final (centro) — só aparece se existir rodada com esse nome */}
          {showFinalColumn && (
          <div style={{ display: "flex", flexDirection: "column", minWidth: 190, flexShrink: 0, borderRight: "1px solid var(--color-border)", borderLeft: "1px solid var(--color-border)" }}>
            <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--color-brand)" }}>
                {finalColumnLabel ?? "Grande Final"}
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "14px 10px" }}>
              {finalMatchup ? (
                <div data-matchup-id={finalMatchup.id}>
                  <BracketMatchupCard
                    matchup={finalMatchup}
                    legs={phaseRounds.find(r => (r.custom_label ?? r.name) === finalLabel)?.legs ?? false}
                    aggregateScore={phaseRounds.find(r => (r.custom_label ?? r.name) === finalLabel)?.aggregate_score ?? false}
                    showOrder={false}
                    onOpenModal={() => onOpenModal(finalMatchup)}
                  />
                </div>
              ) : (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)", textAlign: "center" }}>
                  A definir
                </p>
              )}
            </div>
          </div>
          )}

          {/* Colunas Leste (ordem invertida) */}
          {eastRounds.map(r => renderCol(r.label, r.matchups, "east"))}

          {/* Tag Leste */}
          <div style={{ writingMode: "vertical-lr", fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 5px", color: "#f472b6", borderLeft: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Leste
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── StatRanking ──────────────────────────────────────────────────────────────

function StatRanking({ title, data, valueKey, valueLabel, valueColor, emptyMessage }: {
  title: string; data: any[]; valueKey: string; valueLabel: string; valueColor?: string; emptyMessage: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 5;
  const visible = data.slice(0, LIMIT);
  const hasMore = data.length > LIMIT;

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{title}</h2>
        </div>
        {data.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>{emptyMessage}</p>
        ) : (
          <>
            {visible.map((row: any, idx: number) => (
              <div key={row.athlete_id} className="flex items-center gap-3 px-5 py-3"
                style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                <span className="w-4 font-mono text-xs text-right shrink-0" style={{ color: idx < 3 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
                  {idx + 1}
                </span>
                {row.athletes?.photo_url ? (
                  <img src={row.athletes.photo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    {(row.athletes?.surname ?? row.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                    {row.athletes?.surname ?? row.athletes?.full_name ?? "—"}
                  </p>
                  {row.team?.full_name && (
                    <p className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {row.team.abbreviation ?? row.team.full_name}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-display text-lg font-bold" style={{ color: valueColor ?? "var(--color-brand)" }}>
                  {row[valueKey] ?? 0}
                </span>
              </div>
            ))}
            {hasMore && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-3 font-mono text-xs transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                style={{ color: "var(--color-brand)", borderTop: "1px solid var(--color-border)" }}>
                Ver todos ({data.length})
              </button>
            )}
          </>
        )}
      </div>
      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-xl border shadow-xl flex flex-col max-h-[80vh]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{title}</h2>
              <button type="button" onClick={() => setShowAll(false)} style={{ color: "var(--color-text-secondary)" }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {data.map((row: any, idx: number) => (
                <div key={row.athlete_id} className="flex items-center gap-3 px-6 py-3"
                  style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                  <span className="w-6 font-mono text-xs text-right shrink-0" style={{ color: idx < 3 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
                    {idx + 1}
                  </span>
                  {row.athletes?.photo_url ? (
                    <img src={row.athletes.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {(row.athletes?.surname ?? row.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                      {row.athletes?.surname ?? row.athletes?.full_name ?? "—"}
                    </p>
                    {row.team?.full_name && (
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {row.team.abbreviation ?? row.team.full_name}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-display text-xl font-bold" style={{ color: valueColor ?? "var(--color-brand)" }}>
                    {row[valueKey] ?? 0}
                  </span>
                  <span className="font-mono text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>{valueLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── MatchRow ─────────────────────────────────────────────────────────────────

function MatchRow({ match, idx, onDelete }: { match: Match; idx: number; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const statusColor = STATUS_COLOR[match.status] ?? "#A6A6A6";
  const isScheduled = match.status === "scheduled";

  return (
    <div className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: hovered ? 1 : 0.75, transition: "opacity 0.15s ease" }}>
      <Link href={`/partidas/${match.id}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
        <div className="shrink-0 w-12 text-center">
          <span className="font-mono text-xs font-bold" style={{ color: statusColor }}>{STATUS_LABEL[match.status] ?? match.status.toUpperCase()}</span>
          {match.match_date && <p className="font-mono text-xs mt-0.5" style={{ color: "#444" }}>{new Date(match.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>}
          {match.match_time && <p className="font-mono text-xs" style={{ color: "#444" }}>{match.match_time.slice(0, 5)}</p>}
        </div>
        <div className="flex flex-1 items-center gap-2 min-w-0 justify-end">
          <span className="font-mono text-sm font-bold truncate text-right" style={{ color: "var(--color-text-primary)" }}>
            {match.teams_a?.abbreviation?.toUpperCase() ?? match.teams_a?.full_name ?? "—"}
          </span>
          {match.teams_a?.logo_url ? <img src={match.teams_a.logo_url} alt="" className="h-5 w-5 shrink-0 object-contain" /> : <div className="h-5 w-5 shrink-0 rounded border" style={{ borderColor: "var(--color-border)" }} />}
        </div>
        <div className="shrink-0 flex items-center gap-2 px-3">
          <span className="font-display text-lg font-bold w-6 text-center" style={{ color: isScheduled ? "#333" : "var(--color-brand)" }}>{isScheduled ? "–" : match.score_a}</span>
          <span className="font-mono text-xs" style={{ color: "#333" }}>:</span>
          <span className="font-display text-lg font-bold w-6 text-center" style={{ color: isScheduled ? "#333" : "var(--color-brand)" }}>{isScheduled ? "–" : match.score_b}</span>
        </div>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {match.teams_b?.logo_url ? <img src={match.teams_b.logo_url} alt="" className="h-5 w-5 shrink-0 object-contain" /> : <div className="h-5 w-5 shrink-0 rounded border" style={{ borderColor: "var(--color-border)" }} />}
          <span className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
            {match.teams_b?.abbreviation?.toUpperCase() ?? match.teams_b?.full_name ?? "—"}
          </span>
        </div>
        <div className="shrink-0 hidden lg:block w-28 text-right">
          <p className="font-mono text-xs truncate" style={{ color: "#444" }}>{match.phases?.custom_label ?? match.phases?.full_name ?? ""}</p>
        </div>
      </Link>
      {hovered && (
        <button type="button" onClick={e => { e.preventDefault(); onDelete(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-lg border transition-colors hover:border-[var(--color-danger)]"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
          <Trash2 size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// ─── EdicaoConfigTab ─────────────────────────────────────────────────────────

function EdicaoConfigTab({ selectedEditionId, selectedEditionName, inputClass, inputStyle }: {
  selectedEditionId: string; selectedEditionName: string; inputClass: string; inputStyle: any;
}) {
  const [editionStatus, setEditionStatus] = useState("planned");
  const [isPublic, setIsPublic] = useState(false);
  const [maxAthletes, setMaxAthletes] = useState("");
  const [yellowThreshold, setYellowThreshold] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedEditionId) return;
    async function load() {
      const supabase = createClient();
      const [{ data: ed }, { data: settings }] = await Promise.all([
        supabase.from("competition_editions").select("status").eq("id", selectedEditionId).maybeSingle(),
        supabase.from("edition_settings").select("*").eq("edition_id", selectedEditionId).maybeSingle(),
      ]);
      setEditionStatus(ed?.status ?? "planned");
      setIsPublic(settings?.is_public ?? false);
      setMaxAthletes(String(settings?.max_athletes ?? ""));
      setYellowThreshold(String(settings?.yellow_card_suspension_threshold ?? ""));
      setLoaded(true);
    }
    void load();
  }, [selectedEditionId]);

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("status", editionStatus);
    fd.append("is_public", String(isPublic));
    fd.append("max_athletes", maxAthletes);
    fd.append("yellow_card_threshold", yellowThreshold);
    const result = await editarEdicao(selectedEditionId, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Configurações salvas.");
  }

  if (!loaded) return <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-1 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações gerais</h2>
        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-brand)" }}>{selectedEditionName}</p>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Status</span>
            <select value={editionStatus} onChange={e => setEditionStatus(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="planned">Planejada</option>
              <option value="ongoing">Em andamento</option>
              <option value="finished">Finalizada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Visível no 06.score</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Máx. atletas por equipe</span>
            <input type="number" value={maxAthletes} onChange={e => setMaxAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Limite de amarelos para suspensão</span>
            <input type="number" value={yellowThreshold} onChange={e => setYellowThreshold(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="mt-4 rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}



// ─── PremiacoesTab ────────────────────────────────────────────────────────────

function PremiacoesTab({
  awards, loadingAwards, awardType, setAwardType, awardAthleteId, setAwardAthleteId,
  awardTeamId, setAwardTeamId, savingAward, editionTeams, editionAthletes,
  onAtribuir, onRemover, inputClass, inputStyle,
}: {
  awards: any[]; loadingAwards: boolean;
  awardType: string; setAwardType: (v: string) => void;
  awardAthleteId: string; setAwardAthleteId: (v: string) => void;
  awardTeamId: string; setAwardTeamId: (v: string) => void;
  savingAward: boolean; editionTeams: any[]; editionAthletes: any[];
  onAtribuir: () => void; onRemover: (id: string) => void;
  inputClass: string; inputStyle: any;
}) {
  const [activeSub, setActiveSub] = useState<"individuais" | "coletivas">("individuais");

  const AWARD_LABELS: Record<string, string> = {
    top_scorer: "Artilheiro", top_assists: "Garçom", mvp: "MVP",
    best_goalkeeper: "Melhor Goleiro", revelation: "Revelação",
    best_defense: "Melhor Defesa", best_performance: "Melhor Desempenho",
    champion: "Campeão", runner_up: "Vice-campeão", third_place: "Terceiro Lugar",
  };
  const INDIVIDUAL_TYPES = ["top_scorer", "top_assists", "mvp", "best_goalkeeper", "revelation", "best_defense", "best_performance"];
  const COLLECTIVE_TYPES = ["champion", "runner_up", "third_place"];
  const isColetiva = COLLECTIVE_TYPES.includes(awardType);
  const filteredAwards = awards.filter(a =>
    activeSub === "individuais" ? INDIVIDUAL_TYPES.includes(a.award_type) : COLLECTIVE_TYPES.includes(a.award_type)
  );

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
        {[{ key: "individuais", label: "INDIVIDUAIS" }, { key: "coletivas", label: "COLETIVAS" }].map(sub => (
          <button key={sub.key} type="button"
            onClick={() => { setActiveSub(sub.key as any); setAwardType(""); setAwardAthleteId(""); setAwardTeamId(""); }}
            className="border-b-2 pb-3 font-mono text-xs transition-colors"
            style={{ borderColor: activeSub === sub.key ? "var(--color-brand)" : "transparent", color: activeSub === sub.key ? "var(--color-brand)" : "#A6A6A6" }}>
            {sub.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Atribuir premiação {activeSub === "individuais" ? "individual" : "coletiva"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo</span>
            <select value={awardType} onChange={e => { setAwardType(e.target.value); setAwardAthleteId(""); setAwardTeamId(""); }} className={inputClass} style={inputStyle}>
              <option value="">Selecione…</option>
              {activeSub === "individuais" ? (
                <>
                  <option value="top_scorer">Artilheiro</option>
                  <option value="top_assists">Garçom</option>
                  <option value="mvp">MVP</option>
                  <option value="best_goalkeeper">Melhor Goleiro</option>
                  <option value="revelation">Revelação</option>
                  <option value="best_defense">Melhor Defesa</option>
                  <option value="best_performance">Melhor Desempenho</option>
                </>
              ) : (
                <>
                  <option value="champion">Campeão</option>
                  <option value="runner_up">Vice-campeão</option>
                  <option value="third_place">Terceiro Lugar</option>
                </>
              )}
            </select>
          </label>
          {awardType && !isColetiva && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Atleta</span>
              <select value={awardAthleteId} onChange={e => setAwardAthleteId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                {editionTeams.map((et: any) => {
                  const athletes = editionAthletes.filter((a: any) => a.edition_teams?.team_id === et.team_id);
                  if (athletes.length === 0) return null;
                  return (
                    <optgroup key={et.id} label={et.teams?.full_name ?? "Equipe"}>
                      {athletes.map((a: any) => (
                        <option key={a.athlete_id} value={a.athlete_id}>{a.athletes?.surname ?? a.athletes?.full_name ?? "—"}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
          )}
          {awardType && isColetiva && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Equipe</span>
              <select value={awardTeamId} onChange={e => setAwardTeamId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                {editionTeams.map((et: any) => <option key={et.team_id} value={et.team_id}>{et.teams?.full_name ?? "—"}</option>)}
              </select>
            </label>
          )}
          <div className="flex items-end">
            <button type="button" onClick={onAtribuir} disabled={savingAward || !awardType}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {savingAward ? "Salvando…" : "Atribuir"}
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            {activeSub === "individuais" ? "Premiações individuais" : "Premiações coletivas"} ({filteredAwards.length})
          </h2>
        </div>
        {loadingAwards ? (
          <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Carregando…</p>
        ) : filteredAwards.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma premiação atribuída.</p>
        ) : (
          filteredAwards.map((award: any, idx: number) => {
            const col = COLLECTIVE_TYPES.includes(award.award_type);
            const name = col ? (award.teams?.full_name ?? "—") : (award.athletes?.surname ?? award.athletes?.full_name ?? "—");
            const photo = col ? award.teams?.logo_url : award.athletes?.photo_url;
            return (
              <div key={award.id} className="flex items-center gap-4 px-5 py-3" style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(191,242,5,0.1)" }}>
                  {photo ? <img src={photo} alt="" className="h-8 w-8 rounded object-contain" /> : <span>🏆</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs uppercase" style={{ color: "var(--color-brand)" }}>{AWARD_LABELS[award.award_type] ?? award.award_type}</p>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{name}</p>
                </div>
                <button type="button" onClick={() => onRemover(award.id)}
                  className="shrink-0 rounded border px-2 py-1 font-mono text-xs hover:border-[var(--color-danger)]"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                  Remover
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


// ─── NovoConfrontoModal ───────────────────────────────────────────────────────
type MatchupStep = {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  teamA: Team | null;
  teamB: Team | null;
  legs: boolean;
  aggregateScore: boolean;
  phaseId: string;
  roundLabel: string;
};

export function NovoConfrontoModal({
  phases,
  initialPhaseId,
  rounds,
  editionTeams,
  venues,
  onClose,
  onSuccess,
  inputClass,
  inputStyle,
}: {
  phases: Phase[];
  initialPhaseId?: string;
  rounds: Round[];
  editionTeams: EditionTeam[];
  venues: { id: string; full_name: string }[];
  onClose: () => void;
  onSuccess: () => void;
  inputClass: string;
  inputStyle: React.CSSProperties;
}) {
  // ── Step 1: Definir confronto ──────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [phaseId, setPhaseId] = useState(initialPhaseId || (phases[0]?.id ?? ""));
  const [roundId, setRoundId] = useState("");
  const [teamAId, setTeamAId] = useState<string>("tbd");
  const [teamBId, setTeamBId] = useState<string>("tbd");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 2: Adicionar partidas ─────────────────────────────────────────────
  const [matchup, setMatchup] = useState<MatchupStep | null>(null);
  const [idaDate, setIdaDate] = useState("");
  const [idaTime, setIdaTime] = useState("");
  const [idaVenue, setIdaVenue] = useState("");
  const [voltaDate, setVoltaDate] = useState("");
  const [voltaTime, setVoltaTime] = useState("");
  const [voltaVenue, setVoltaVenue] = useState("");
  const [addingIda, setAddingIda] = useState(false);
  const [addingVolta, setAddingVolta] = useState(false);
  const [idaAdded, setIdaAdded] = useState(false);
  const [voltaAdded, setVoltaAdded] = useState(false);

  // ── Times da fase selecionada ──────────────────────────────────────────────
  const [phaseTeamIds, setPhaseTeamIds] = useState<string[]>([]);
  const [loadingPhaseTeams, setLoadingPhaseTeams] = useState(false);

  const roundsForPhase = rounds.filter(r => r.phase_id === phaseId);
  const selectedRound = rounds.find(r => r.id === roundId);
  const isLegs = selectedRound?.legs ?? false;

  // Carrega teams da fase ao mudar a fase
  useEffect(() => {
    if (!phaseId) return;
    async function load() {
      setLoadingPhaseTeams(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("phase_teams")
        .select("edition_team_id")
        .eq("phase_id", phaseId);
      const etIds = (data ?? []).map((r: any) => r.edition_team_id);
      const teamIds = editionTeams
        .filter(et => etIds.includes(et.id) && !et.is_free_agent_pool)
        .map(et => et.team_id);
      setPhaseTeamIds(teamIds);
      setLoadingPhaseTeams(false);
    }
    load();
  }, [phaseId, editionTeams]);

  // Reset round ao mudar fase
  useEffect(() => {
    setRoundId("");
    setTeamAId("tbd");
    setTeamBId("tbd");
    setError(null);
  }, [phaseId]);

  const teamsForPhase: (Team & { _tbd?: boolean })[] = [
    { id: "tbd", full_name: "A definir", abbreviation: "TBD", logo_url: null, _tbd: true },
    ...editionTeams
      .filter(et => !et.is_free_agent_pool && et.teams && phaseTeamIds.includes(et.team_id))
      .map(et => et.teams as Team),
  ];

  // ── Criar confronto ────────────────────────────────────────────────────────
  async function handleCriarConfronto() {
    if (!phaseId || !roundId) { setError("Selecione a fase e o estágio."); return; }
    if (teamAId === teamBId && teamAId !== "tbd") { setError("Os dois times não podem ser iguais."); return; }
    setCreating(true); setError(null);

    const aId = teamAId === "tbd" ? null : teamAId;
    const bId = teamBId === "tbd" ? null : teamBId;
    const result = await criarConfronto(phaseId, roundId, aId, bId);

    setCreating(false);
    if ("error" in result) { setError(result.error); return; }

    const teamA = teamsForPhase.find(t => t.id === teamAId) ?? null;
    const teamB = teamsForPhase.find(t => t.id === teamBId) ?? null;
    const round = rounds.find(r => r.id === roundId)!;

    setMatchup({
      id: result.id,
      teamAId: aId,
      teamBId: bId,
      teamA: teamA?._tbd ? null : teamA,
      teamB: teamB?._tbd ? null : teamB,
      legs: round.legs,
      aggregateScore: round.aggregate_score,
      phaseId,
      roundLabel: round.custom_label ?? round.name,
    });
    setStep(2);
  }

  // ── Adicionar partida de ida ───────────────────────────────────────────────
  async function handleAddIda() {
    if (!matchup) return;
    if (!matchup.teamAId || !matchup.teamBId) {
      toast("error", "Defina os dois times antes de adicionar partidas.");
      return;
    }
    setAddingIda(true);
    const fd = new FormData();
    fd.append("is_second_leg", "false");
    if (idaDate) fd.append("match_date", idaDate);
    if (idaTime) fd.append("match_time", idaTime);
    if (idaVenue) fd.append("venue_id", idaVenue);
    const result = await criarPartidaNoConfronto(matchup.phaseId, matchup.id, fd);
    setAddingIda(false);
    if ("error" in result) { toast("error", result.error); return; }
    setIdaAdded(true);
    toast("success", isLegs ? "Jogo de ida criado." : "Partida criada.");
  }

  // ── Adicionar partida de volta ─────────────────────────────────────────────
  async function handleAddVolta() {
    if (!matchup) return;
    setAddingVolta(true);
    const fd = new FormData();
    fd.append("is_second_leg", "true");
    if (voltaDate) fd.append("match_date", voltaDate);
    if (voltaTime) fd.append("match_time", voltaTime);
    if (voltaVenue) fd.append("venue_id", voltaVenue);
    const result = await criarPartidaNoConfronto(matchup.phaseId, matchup.id, fd);
    setAddingVolta(false);
    if ("error" in result) { toast("error", result.error); return; }
    setVoltaAdded(true);
    toast("success", "Jogo de volta criado.");
  }

  const tA = matchup?.teamA?.abbreviation ?? matchup?.teamA?.full_name ?? "A definir";
  const tB = matchup?.teamB?.abbreviation ?? matchup?.teamB?.full_name ?? "A definir";
  const hasBothTeams = !!matchup?.teamAId && !!matchup?.teamBId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-xl border shadow-xl"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>
              {step === 1 ? "Novo confronto" : "Adicionar partidas"}
            </h2>
            {step === 2 && matchup && (
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--color-brand)" }}>
                {tA} × {tB} · {matchup.roundLabel}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ color: "var(--color-text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* ── STEP 1: Definir confronto ── */}
        {step === 1 && (
          <div className="px-6 py-4 space-y-4">

            {/* Fase */}
            {phases.length > 1 && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Fase *</span>
                <select value={phaseId} onChange={e => setPhaseId(e.target.value)}
                  className={inputClass} style={inputStyle}>
                  {phases.map(p => (
                    <option key={p.id} value={p.id}>{p.custom_label ?? p.full_name}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Estágio (rodada) */}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Estágio *</span>
              {roundsForPhase.length === 0 ? (
                <p className="rounded-lg border px-3 py-2 text-sm"
                  style={{ color: "var(--color-warning)", borderColor: "rgba(242,167,5,0.3)", backgroundColor: "rgba(242,167,5,0.08)" }}>
                  Esta fase não tem rodadas. Crie rodadas na página da fase antes de adicionar confrontos.
                </p>
              ) : (
                <select value={roundId} onChange={e => setRoundId(e.target.value)}
                  className={inputClass} style={inputStyle}>
                  <option value="">Selecione o estágio…</option>
                  {roundsForPhase.map(r => (
                    <option key={r.id} value={r.id}>{r.custom_label ?? r.name}</option>
                  ))}
                </select>
              )}
            </label>

            {/* Times */}
            {roundId && (
              <>
                {loadingPhaseTeams ? (
                  <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    Carregando equipes…
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Time A *</span>
                      <select value={teamAId} onChange={e => setTeamAId(e.target.value)}
                        className={inputClass} style={inputStyle}>
                        {teamsForPhase.map(t => (
                          <option key={t.id} value={t.id} disabled={t.id === teamBId && t.id !== "tbd"}>
                           {t._tbd ? "A definir" : `${t.abbreviation ?? ""} — ${t.full_name}`}
                           </option>
                          ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Time B *</span>
                      <select value={teamBId} onChange={e => setTeamBId(e.target.value)}
                        className={inputClass} style={inputStyle}>
                        {teamsForPhase.map(t => (
                          <option key={t.id} value={t.id} disabled={t.id === teamBId && t.id !== "tbd"}>
                           {t._tbd ? "A definir" : `${t.abbreviation ?? ""} — ${t.full_name}`}
                           </option>
                          ))}
                      </select>
                    </label>
                  </div>
                )}

                {/* Info sobre o estágio selecionado */}
                {selectedRound && (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--color-border)" }}>
                    <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {isLegs
                        ? `Jogo de ida e volta${selectedRound.aggregate_score ? " · placar agregado" : " · contagem de vitórias"}`
                        : "Jogo único"}
                    </span>
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleCriarConfronto}
                disabled={creating || !phaseId || !roundId}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {creating ? "Criando…" : "Criar confronto"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Adicionar partidas ── */}
        {step === 2 && matchup && (
          <div className="px-6 py-4 space-y-5">

            {/* Aviso se times não definidos */}
            {!hasBothTeams && (
              <div className="rounded-lg border px-3 py-2.5"
                style={{ borderColor: "rgba(242,167,5,0.3)", backgroundColor: "rgba(242,167,5,0.06)" }}>
                <p className="font-mono text-xs" style={{ color: "var(--color-warning)" }}>
                  Um ou mais times estão "A definir". Defina os times para poder adicionar partidas.
                </p>
              </div>
            )}

            {/* Jogo de ida (ou jogo único) */}
            <div className="rounded-xl border overflow-hidden"
              style={{ borderColor: idaAdded ? "rgba(191,242,5,0.3)" : "var(--color-border)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--color-border)", backgroundColor: idaAdded ? "rgba(191,242,5,0.05)" : "transparent" }}>
                <span className="font-mono text-xs font-bold" style={{ color: "var(--color-brand)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  {isLegs ? "Jogo de ida" : "Jogo único"}
                </span>
                {idaAdded && (
                  <span className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>✓ Criado</span>
                )}
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Data</span>
                    <input type="date" value={idaDate} onChange={e => setIdaDate(e.target.value)}
                      className={inputClass} style={inputStyle} disabled={idaAdded} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Horário</span>
                    <input type="time" value={idaTime} onChange={e => setIdaTime(e.target.value)}
                      className={inputClass} style={inputStyle} disabled={idaAdded} />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Local</span>
                  <select value={idaVenue} onChange={e => setIdaVenue(e.target.value)}
                    className={inputClass} style={inputStyle} disabled={idaAdded}>
                    <option value="">Nenhum</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                  </select>
                </label>
                {!idaAdded && (
                  <button type="button" onClick={handleAddIda}
                    disabled={addingIda || !hasBothTeams}
                    className="w-full rounded-lg border py-2 text-sm font-medium disabled:opacity-40"
                    style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)", backgroundColor: "rgba(191,242,5,0.06)" }}>
                    {addingIda ? "Criando…" : `+ ${isLegs ? "Criar jogo de ida" : "Criar partida"}`}
                  </button>
                )}
              </div>
            </div>

            {/* Jogo de volta (só se legs = true) */}
            {isLegs && (
              <div className="rounded-xl border overflow-hidden"
                style={{ borderColor: voltaAdded ? "rgba(191,242,5,0.3)" : "var(--color-border)" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: "var(--color-border)", backgroundColor: voltaAdded ? "rgba(191,242,5,0.05)" : "transparent" }}>
                  <span className="font-mono text-xs font-bold" style={{ color: "var(--color-brand)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    Jogo de volta
                  </span>
                  {voltaAdded && (
                    <span className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>✓ Criado</span>
                  )}
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Data</span>
                      <input type="date" value={voltaDate} onChange={e => setVoltaDate(e.target.value)}
                        className={inputClass} style={inputStyle} disabled={voltaAdded} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Horário</span>
                      <input type="time" value={voltaTime} onChange={e => setVoltaTime(e.target.value)}
                        className={inputClass} style={inputStyle} disabled={voltaAdded} />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Local</span>
                    <select value={voltaVenue} onChange={e => setVoltaVenue(e.target.value)}
                      className={inputClass} style={inputStyle} disabled={voltaAdded}>
                      <option value="">Nenhum</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                    </select>
                  </label>
                  {!voltaAdded && (
                    <button type="button" onClick={handleAddVolta}
                      disabled={addingVolta || !hasBothTeams || !idaAdded}
                      className="w-full rounded-lg border py-2 text-sm font-medium disabled:opacity-40"
                      style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)", backgroundColor: "rgba(191,242,5,0.06)" }}>
                      {addingVolta ? "Criando…" : "+ Criar jogo de volta"}
                    </button>
                  )}
                  {!idaAdded && (
                    <p className="font-mono text-xs text-center" style={{ color: "var(--color-text-secondary)" }}>
                      Crie o jogo de ida primeiro.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-between pt-1">
              <button type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                ← Novo confronto
              </button>
              <button type="button" onClick={onSuccess}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function MatchupEditModal({
  matchup,
  rounds,
  editionTeams,
  venues,
  phaseId,
  onClose,
  onSuccess,
  inputClass,
  inputStyle,
}: {
  matchup: any;
  rounds: Round[];
  editionTeams: EditionTeam[];
  venues: { id: string; full_name: string }[];
  phaseId: string;
  onClose: () => void;
  onSuccess: () => void;
  inputClass: string;
  inputStyle: React.CSSProperties;
}) {
  const [teamAId, setTeamAId] = useState<string>(matchup.team_a_id ?? "tbd");
  const [teamBId, setTeamBId] = useState<string>(matchup.team_b_id ?? "tbd");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  // Partidas do confronto
  const [matchesLocal, setMatchesLocal] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
 
  // Times da fase
  const [phaseTeamIds, setPhaseTeamIds] = useState<string[]>([]);
 
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: ptData }, { data: mData }] = await Promise.all([
        supabase.from("phase_teams").select("edition_team_id").eq("phase_id", phaseId),
        supabase.from("matches").select("id, match_date, match_time, venue_id, status, is_second_leg, score_a, score_b").eq("matchup_id", matchup.id).order("match_date", { ascending: true }),
      ]);
      const etIds = (ptData ?? []).map((r: any) => r.edition_team_id);
      const teamIds = editionTeams.filter(et => etIds.includes(et.id) && !et.is_free_agent_pool).map(et => et.team_id);
      setPhaseTeamIds(teamIds);
      setMatchesLocal(mData ?? []);
      setLoadingMatches(false);
    }
    load();
  }, [matchup.id, phaseId, editionTeams]);
 
  const teamsForPhase: (Team & { _tbd?: boolean })[] = [
    { id: "tbd", full_name: "A definir", abbreviation: "TBD", logo_url: null, _tbd: true },
    ...editionTeams
      .filter(et => !et.is_free_agent_pool && et.teams && phaseTeamIds.includes(et.team_id))
      .map(et => et.teams as Team),
  ];
 
  async function handleSaveTeams() {
    setSaving(true); setError(null);
    const result = await editarTimesConfronto(
      matchup.id,
      teamAId === "tbd" ? null : teamAId,
      teamBId === "tbd" ? null : teamBId,
    );
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    toast("success", "Times atualizados.");
    onSuccess();
  }
 
  async function handleUpdateMatch(matchId: string, field: string, value: string) {
    const supabase = createClient();
    await supabase.from("matches").update({ [field]: value || null }).eq("id", matchId);
    setMatchesLocal(prev => prev.map(m => m.id === matchId ? { ...m, [field]: value } : m));
  }
 
  async function handleAddMatch(isSecondLeg: boolean) {
    const fd = new FormData();
    fd.append("is_second_leg", String(isSecondLeg));
    const result = await criarPartidaNoConfronto(phaseId, matchup.id, fd);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", isSecondLeg ? "Jogo de volta criado." : "Jogo de ida criado.");
    // Recarrega partidas
    const supabase = createClient();
    const { data } = await supabase.from("matches").select("id, match_date, match_time, venue_id, status, is_second_leg, score_a, score_b").eq("matchup_id", matchup.id).order("match_date", { ascending: true });
    setMatchesLocal(data ?? []);
  }
 
  async function handleDeleteMatch(matchId: string) {
    if (!confirm("Remover esta partida?")) return;
    const { deletarPartida } = await import("@/app/(lab)/partidas/[matchId]/actions");
    const result = await deletarPartida(matchId);
    if ("error" in result) { toast("error", result.error); return; }
    setMatchesLocal(prev => prev.filter(m => m.id !== matchId));
    toast("success", "Partida removida.");
  }
 
  const round = rounds.find(r => r.phase_id === phaseId && (r.custom_label ?? r.name) === matchup.round_label);
  const isLegs = round?.legs ?? false;
  const hasTeams = matchup.team_a_id && matchup.team_b_id;
  const tA = matchup.teams_a?.abbreviation ?? matchup.teams_a?.full_name ?? "A definir";
  const tB = matchup.teams_b?.abbreviation ?? matchup.teams_b?.full_name ?? "A definir";
 
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, borderRadius: 14, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
 
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--color-text-primary)", margin: 0 }}>
              Editar confronto
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)", margin: 0, letterSpacing: "0.06em" }}>
              {matchup.round_label}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
 
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
 
          {/* Seção times */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 10 }}>Times</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Time A</span>
                <select value={teamAId} onChange={e => setTeamAId(e.target.value)} className={inputClass} style={inputStyle as any}>
                  {teamsForPhase.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id === teamBId && t.id !== "tbd"}>
                      {t._tbd ? "A definir" : `${t.abbreviation ?? ""} — ${t.full_name}`}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Time B</span>
                <select value={teamBId} onChange={e => setTeamBId(e.target.value)} className={inputClass} style={inputStyle as any}>
                  {teamsForPhase.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id === teamAId && t.id !== "tbd"}>
                      {t._tbd ? "A definir" : `${t.abbreviation ?? ""} — ${t.full_name}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && <p style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: 8 }}>{error}</p>}
            <button onClick={handleSaveTeams} disabled={saving}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando…" : "Salvar times"}
            </button>
          </div>
 
          {/* Seção partidas */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 10 }}>
              Partidas {isLegs ? "(Ida e Volta)" : "(Jogo único)"}
            </p>
 
            {loadingMatches ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>Carregando…</p>
            ) : matchesLocal.length === 0 ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>
                {hasTeams ? "Nenhuma partida adicionada." : "Defina os times para adicionar partidas."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matchesLocal.map((m, i) => (
                  <div key={m.id} style={{ borderRadius: 10, border: "1px solid var(--color-border)", overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        {isLegs ? (m.is_second_leg ? "Volta" : "Ida") : "Jogo único"}
                      </span>
                      <button onClick={() => handleDeleteMatch(m.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                        Remover
                      </button>
                    </div>
                    <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Data</span>
                        <input type="date" defaultValue={m.match_date ?? ""} onBlur={e => handleUpdateMatch(m.id, "match_date", e.target.value)}
                          className={inputClass} style={{ ...inputStyle as any, fontSize: 11 }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Horário</span>
                        <input type="time" defaultValue={m.match_time?.slice(0,5) ?? ""} onBlur={e => handleUpdateMatch(m.id, "match_time", e.target.value)}
                          className={inputClass} style={{ ...inputStyle as any, fontSize: 11 }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Local</span>
                        <select defaultValue={m.venue_id ?? ""} onChange={e => handleUpdateMatch(m.id, "venue_id", e.target.value)}
                          className={inputClass} style={{ ...inputStyle as any, fontSize: 11 }}>
                          <option value="">—</option>
                          {venues.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            {/* Botões de adicionar partida */}
            {hasTeams && !loadingMatches && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!isLegs && matchesLocal.length === 0 && (
                  <button onClick={() => handleAddMatch(false)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--color-brand)", backgroundColor: "rgba(191,242,5,0.06)", color: "var(--color-brand)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}>
                    + Adicionar partida
                  </button>
                )}
                {isLegs && !matchesLocal.find(m => !m.is_second_leg) && (
                  <button onClick={() => handleAddMatch(false)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--color-brand)", backgroundColor: "rgba(191,242,5,0.06)", color: "var(--color-brand)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}>
                    + Jogo de ida
                  </button>
                )}
                {isLegs && matchesLocal.find(m => !m.is_second_leg) && !matchesLocal.find(m => m.is_second_leg) && (
                  <button onClick={() => handleAddMatch(true)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--color-brand)", backgroundColor: "rgba(191,242,5,0.06)", color: "var(--color-brand)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}>
                    + Jogo de volta
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
 
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onSuccess}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>
            Concluir
          </button>
        </div>
      </div>
    </div>
);
}