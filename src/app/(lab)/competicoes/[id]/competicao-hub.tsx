"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "@/app/(lab)/components/toast";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import Link from "next/link";
import { ChevronDown, Plus, ChevronRight, Users, X, Check, Trash2 } from "lucide-react";
import { criarEdicao, editarEdicao, inscreverAtleta, removerAtletaEdicao, atribuirPremiacao, removerPremiacao } from "./edicoes/actions";
import { criarPartida, deletarPartida } from "@/app/(lab)/partidas/[matchId]/actions";
import { criarOuAtualizarTOTW, criarOuAtualizarMOTW, deletarSquad } from "./edicoes/actions";
import { Star, Search } from "lucide-react";

type Competition = any;
type Edition = { id: string; season_id: string; status: string; season_name: string; year_value: number };
type Season = { id: string; name: string; year_value: number };
type Team = { id: string; full_name: string; abbreviation: string | null; logo_url: string | null };
type Match = {
  id: string; match_date: string | null; match_time: string | null; status: string;
  score_a: number; score_b: number;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  rounds: { name: string; custom_label: string | null } | null;
  phases: { id: string; full_name: string; custom_label: string | null; phase_type: string } | null;
};
type Phase = { id: string; full_name: string; custom_label: string | null; phase_type: string; display_order: number; is_current: boolean };
type Round = { id: string; name: string; custom_label: string | null; phase_id: string; display_order: number; is_current: boolean; legs: boolean; aggregate_score: boolean };
type EditionTeam = { id: string; team_id: string; arrival_origin: string | null; teams: Team | null };
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
  const [matchFilterRoundId, setMatchFilterRoundId] = useState<string>("");
  const [venues, setVenues] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

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

  const [newMatchIsSecondLeg, setNewMatchIsSecondLeg] = useState(false);

  const selectedEdition = editions.find(e => e.id === selectedEditionId);
  const selectedPhase = phases.find(p => p.id === selectedPhaseId);
  const isClassificatory = (type: string) => type === "round_robin" || type === "group_stage";

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
        ? supabase.from("matches").select("id, match_date, match_time, status, score_a, score_b, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url), rounds(name, custom_label), phases(id, full_name, custom_label, phase_type)").in("phase_id", phaseIds).order("match_date", { ascending: false })
        : Promise.resolve({ data: [] }),
        supabase.from("phases").select("id, full_name, custom_label, phase_type, display_order, is_current, legs, aggregate_score").eq("edition_id", editionId).order("display_order"),
      phaseIds.length > 0
        ? supabase.from("rounds").select("id, name, custom_label, phase_id, display_order, is_current, legs, aggregate_score").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
      supabase.from("edition_teams").select("id, team_id, arrival_origin, teams(id, full_name, abbreviation, logo_url)").eq("edition_id", editionId).order("display_order"),
      supabase.from("team_edition_stats").select("*, teams(id, full_name, abbreviation, logo_url, primary_color)").eq("edition_id", editionId).order("points", { ascending: false }).order("goals_scored", { ascending: false }),
      supabase.from("athlete_edition_stats").select("*, athletes(id, full_name, surname, photo_url), team:teams(id, full_name, abbreviation)").eq("edition_id", editionId).order("goals", { ascending: false }).limit(30),
      phaseIds.length > 0
        ? supabase.from("matchups").select("id, round_label, display_order, is_completed, phase_id, team_a_id, team_b_id, teams_a:teams!matchups_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matchups_team_b_id_fkey(full_name, abbreviation, logo_url)").in("phase_id", phaseIds).order("display_order")
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
    setMatchups((matchupsData as any) ?? []);
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
  const teamsForEdition = editionTeams.filter(et => et.teams?.full_name && et.teams.full_name !== "Sem clube").map(et => et.teams).filter(Boolean) as Team[];

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

  const matchesByRound: Record<string, { label: string; matches: Match[] }> = {};
  matches.forEach(m => {
    const key = m.rounds?.custom_label ?? m.rounds?.name ?? m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
    if (!matchesByRound[key]) matchesByRound[key] = { label: key, matches: [] };
    matchesByRound[key].matches.push(m);
  });

  {(() => {
    const selRound = (rounds as any[]).find((r: any) => r.id === newMatchRoundId);
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

  const filteredMatches = matches.filter(m => {
    if (matchFilterPhaseId && m.phases?.id !== matchFilterPhaseId) return false;
    if (matchFilterRoundId) {
      const roundName = rounds.find(r => r.id === matchFilterRoundId);
      const matchRoundLabel = m.rounds?.custom_label ?? m.rounds?.name ?? "";
      if (matchRoundLabel !== (roundName?.custom_label ?? roundName?.name ?? "")) return false;
    }
    return true;
  });

  const filteredMatchesByRound: Record<string, { label: string; matches: Match[] }> = {};
  filteredMatches.forEach(m => {
    const key = m.rounds?.custom_label ?? m.rounds?.name ?? m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
    if (!filteredMatchesByRound[key]) filteredMatchesByRound[key] = { label: key, matches: [] };
    filteredMatchesByRound[key].matches.push(m);
  });

  const topScorers = [...scorers].filter(s => (s.goals ?? 0) > 0).sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
  const topAssists = [...scorers].filter(s => (s.assists ?? 0) > 0).sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0));
  const topYellow = [...scorers].filter(s => (s.yellow_cards ?? 0) > 0).sort((a, b) => (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0));
  const topRed = [...scorers].filter(s => (s.red_cards ?? 0) > 0).sort((a, b) => (b.red_cards ?? 0) - (a.red_cards ?? 0));

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
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Fase *</span>
                <select value={newMatchPhaseId} onChange={e => { setNewMatchPhaseId(e.target.value); setNewMatchRoundId(""); setNewMatchTeamA(""); setNewMatchTeamB(""); }}
                  className={inputClass} style={inputStyle}>
                  <option value="">Selecione a fase…</option>
                  {phases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.custom_label ?? p.full_name} — {PHASE_TYPE_LABEL[p.phase_type] ?? p.phase_type}
                    </option>
                  ))}
                </select>
              </label>
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
                      {teamsForEdition.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Equipe B (visitante) *</span>
                    <select value={newMatchTeamB} onChange={e => setNewMatchTeamB(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Selecione…</option>
                      {teamsForEdition.filter(t => t.id !== newMatchTeamA).map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
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
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {phases.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => setMatchFilterPhaseId("")}
                    className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                    style={{ borderColor: matchFilterPhaseId === "" ? "var(--color-brand)" : "var(--color-border)", backgroundColor: matchFilterPhaseId === "" ? "rgba(191,242,5,0.1)" : "transparent", color: matchFilterPhaseId === "" ? "var(--color-brand)" : "#A6A6A6" }}>
                    Todas
                  </button>
                  {phases.map(p => (
                    <button key={p.id} type="button" onClick={() => { setMatchFilterPhaseId(p.id); setMatchFilterRoundId(""); }}
                      className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                      style={{ borderColor: matchFilterPhaseId === p.id ? "var(--color-brand)" : "var(--color-border)", backgroundColor: matchFilterPhaseId === p.id ? "rgba(191,242,5,0.1)" : "transparent", color: matchFilterPhaseId === p.id ? "var(--color-brand)" : "#A6A6A6" }}>
                      {p.custom_label ?? p.full_name}
                    </button>
                  ))}
                </div>
              )}
              {matchFilterPhaseId && rounds.filter(r => r.phase_id === matchFilterPhaseId).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Rodada:</span>
                  <button type="button" onClick={() => setMatchFilterRoundId("")}
                    className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                    style={{ borderColor: matchFilterRoundId === "" ? "var(--color-brand)" : "var(--color-border)", backgroundColor: matchFilterRoundId === "" ? "rgba(191,242,5,0.1)" : "transparent", color: matchFilterRoundId === "" ? "var(--color-brand)" : "#A6A6A6" }}>
                    Todas
                  </button>
                  {rounds.filter(r => r.phase_id === matchFilterPhaseId).map(r => (
                    <button key={r.id} type="button" onClick={() => setMatchFilterRoundId(r.id)}
                      className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                      style={{ borderColor: matchFilterRoundId === r.id ? "var(--color-brand)" : "var(--color-border)", backgroundColor: matchFilterRoundId === r.id ? "rgba(191,242,5,0.1)" : "transparent", color: matchFilterRoundId === r.id ? "var(--color-brand)" : "#A6A6A6" }}>
                      {r.custom_label ?? r.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="ml-auto flex items-center gap-3">
                <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {filteredMatches.length} {filteredMatches.length === 1 ? "partida" : "partidas"}
                </p>
                <button type="button" onClick={() => setShowNewMatch(true)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                  <Plus size={14} strokeWidth={2.5} /> Nova partida
                </button>
              </div>
            </div>
            {loadingMatches ? (
              <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>
            ) : filteredMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem partidas</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  {matches.length > 0 ? "Nenhuma partida neste filtro." : "Clique em \"Nova partida\" para começar."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.values(filteredMatchesByRound).map(group => (
                  <div key={group.label}>
                    <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{group.label}</p>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      {group.matches.map((m, idx) => <MatchRow key={m.id} match={m} idx={idx} onDelete={() => handleDeleteMatch(m.id)} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA CLASSIFICAÇÃO */}
        {activeTab === "classificacao" && (
          <div>
            {phases.length > 1 && (
              <div className="mb-4 flex gap-2 flex-wrap">
                {phases.map(p => (
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
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Equipes ({editionTeams.length})</h2>
                </div>
                {editionTeams.length === 0 ? (
                  <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe adicionada.</p>
                ) : (
                  editionTeams.map((et, idx) => (
                    <div key={et.id} className="flex items-center gap-4 px-5 py-3 group"
                      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: 0.55, transition: "opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}>
                      {et.teams?.logo_url ? (
                        <img src={et.teams.logo_url} alt="" className="h-9 w-9 rounded object-contain shrink-0" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border text-xs font-bold"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                          {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{et.teams?.abbreviation?.toUpperCase() ?? "—"}</p>
                        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{et.teams?.full_name ?? "—"}</p>
                      </div>
                      {et.arrival_origin && (
                        <span className="font-mono text-xs rounded px-2 py-0.5" style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                          {et.arrival_origin}
                        </span>
                      )}
                      <Link href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/equipes/${et.team_id}`}
                        className="shrink-0 flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:border-[var(--color-brand)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                        <Users size={12} /> Elenco
                      </Link>
                    </div>
                  ))
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
              {selectedRound?.custom_label ?? selectedRound?.name}
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

const KNOCKOUT_ORDER = [
  "Décimas de Final", "Oitavas de Final", "Quartas de Final",
  "Semifinal", "Final", "Disputa de Terceiro Lugar",
];

function sortRoundLabels(labels: string[]): string[] {
  const thirds = labels.filter(l => l === "Disputa de Terceiro Lugar");
  const rest = labels.filter(l => l !== "Disputa de Terceiro Lugar");
  const sorted = rest.sort((a, b) => {
    const ia = KNOCKOUT_ORDER.indexOf(a); const ib = KNOCKOUT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return -1; if (ib === -1) return 1;
    return ia - ib;
  });
  return [...sorted, ...thirds];
}

type MatchupData = {
  id: string; round_label: string; round_id: string | null;
  team_a_id: string | null; team_b_id: string | null;
  is_completed: boolean; display_order: number;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  matches?: MatchItemData[];
};
type MatchItemData = {
  id: string; score_a: number; score_b: number; status: string;
  match_date: string | null; pen_a?: number; pen_b?: number;
};

function BracketView({ phaseId, matchups, phaseRounds }: {
  phaseId: string; matchups: MatchupData[]; phaseRounds: Round[];
}) {
  const [enriched, setEnriched] = useState<MatchupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMatchup, setModalMatchup] = useState<MatchupData | null>(null);
  const [modalLegs, setModalLegs] = useState({ legs: false, aggregateScore: false });

  useEffect(() => {
    if (!phaseId) return;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const matchupIds = matchups.map(m => m.id);
      if (matchupIds.length === 0) { setEnriched([]); setLoading(false); return; }
      const { data: matchesData } = await supabase
        .from("matches").select("id, matchup_id, score_a, score_b, status, match_date, team_a_id")
        .in("matchup_id", matchupIds).order("match_date", { ascending: true });
      const matchIds = (matchesData ?? []).map((m: any) => m.id);
      let shootouts: any[] = [];
      if (matchIds.length > 0) {
        const { data: soData } = await supabase
          .from("match_penalty_shootout").select("match_id, team_id, result").in("match_id", matchIds);
        shootouts = soData ?? [];
      }
      const matchTeamAMap: Record<string, string> = {};
      (matchesData ?? []).forEach((m: any) => { matchTeamAMap[m.id] = m.team_a_id; });
      const shootoutMap: Record<string, { team_a: number; team_b: number }> = {};
      shootouts.forEach((s: any) => {
        if (!shootoutMap[s.match_id]) shootoutMap[s.match_id] = { team_a: 0, team_b: 0 };
        if (s.result === "scored") {
          if (s.team_id === matchTeamAMap[s.match_id]) shootoutMap[s.match_id].team_a++;
          else shootoutMap[s.match_id].team_b++;
        }
      });
      const matchesByMatchup: Record<string, MatchItemData[]> = {};
      (matchesData ?? []).forEach((m: any) => {
        if (!m.matchup_id) return;
        if (!matchesByMatchup[m.matchup_id]) matchesByMatchup[m.matchup_id] = [];
        const so = shootoutMap[m.id];
        matchesByMatchup[m.matchup_id].push({
          id: m.id, score_a: m.score_a, score_b: m.score_b,
          status: m.status, match_date: m.match_date,
          pen_a: so?.team_a, pen_b: so?.team_b,
        });
      });
      setEnriched(matchups.map(m => ({ ...m, matches: matchesByMatchup[m.id] ?? [] })));
      setLoading(false);
    }
    void load();
  }, [phaseId, matchups]);

  if (loading) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6" }}>Carregando bracket…</p>;
  if (enriched.length === 0) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum confronto ainda. Crie partidas na aba Jogos.</p>;

  const byLabel: Record<string, MatchupData[]> = {};
  enriched.forEach(m => {
    const key = m.round_label ?? "—";
    if (!byLabel[key]) byLabel[key] = [];
    byLabel[key].push(m);
  });
  const sortedLabels = sortRoundLabels(Object.keys(byLabel));

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      {modalMatchup && (
        <BracketSeriesModal matchup={modalMatchup} legs={modalLegs.legs} aggregateScore={modalLegs.aggregateScore} onClose={() => setModalMatchup(null)} />
      )}
      <div style={{ display: "flex", gap: 0, alignItems: "stretch", minWidth: sortedLabels.length * 220 }}>
        {sortedLabels.map((label, colIdx) => {
          const colMatchups = [...(byLabel[label] ?? [])].sort((a, b) => a.display_order - b.display_order);
          const isThird = label === "Disputa de Terceiro Lugar";
          const isLast = colIdx === sortedLabels.length - 1 || isThird;
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 200 }}>
              <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid var(--color-border)" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isThird ? "var(--color-warning)" : "var(--color-brand)" }}>{label}</p>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "16px 12px", gap: 12 }}>
                {colMatchups.map(matchup => {
                  const round = phaseRounds.find(r => r.id === matchup.round_id);
                  const rLegs = round?.legs ?? false;
                  const rAggregate = round?.aggregate_score ?? false;
                  return (
                    <BracketMatchupCard
                      key={matchup.id} matchup={matchup} legs={rLegs} aggregateScore={rAggregate}
                      showConnector={!isLast && !isThird}
                      onOpenModal={() => { if (rLegs && (matchup.matches?.length ?? 0) > 0) { setModalLegs({ legs: rLegs, aggregateScore: rAggregate }); setModalMatchup(matchup); } }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatchupCard({ matchup, legs, aggregateScore, showConnector, onOpenModal }: {
  matchup: MatchupData; legs: boolean; aggregateScore: boolean; showConnector: boolean; onOpenModal: () => void;
}) {
  const matches = matchup.matches ?? [];
  const finished = matches.filter(m => m.status === "finished");
  const hasMatches = finished.length > 0;
  let scoreA: number | null = null, scoreB: number | null = null;
  let penA: number | null = null, penB: number | null = null;
  let winnerSide: "a" | "b" | null = null;
  if (hasMatches) {
    if (!legs) {
      const m = finished[0];
      if (m) { scoreA = m.score_a; scoreB = m.score_b; penA = m.pen_a ?? null; penB = m.pen_b ?? null; }
    } else if (aggregateScore) {
      scoreA = finished.reduce((s, m) => s + m.score_a, 0);
      scoreB = finished.reduce((s, m) => s + m.score_b, 0);
      const last = finished[finished.length - 1];
      penA = last?.pen_a ?? null; penB = last?.pen_b ?? null;
    } else {
      let wA = 0, wB = 0;
      finished.forEach(m => {
        const pa = m.pen_a ?? null, pb = m.pen_b ?? null;
        if (pa !== null && pb !== null) { if (pa > pb) wA++; else if (pb > pa) wB++; }
        else { if (m.score_a > m.score_b) wA++; else if (m.score_b > m.score_a) wB++; }
      });
      scoreA = wA; scoreB = wB;
    }
    if (penA !== null && penB !== null) winnerSide = penA > penB ? "a" : penB > penA ? "b" : null;
    else if (scoreA !== null && scoreB !== null) winnerSide = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null;
  }
  const isClickable = legs && finished.length > 0;
  return (
    <div style={{ position: "relative" }}>
      <div onClick={isClickable ? onOpenModal : undefined}
        style={{ borderRadius: 10, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)",
          overflow: "hidden", cursor: isClickable ? "pointer" : "default", transition: "border-color 0.15s" }}
        onMouseEnter={e => { if (isClickable) (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.4)"; }}
        onMouseLeave={e => { if (isClickable) (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}>
        <BracketTeamRow team={matchup.teams_a} score={scoreA} penScore={penA} isWinner={winnerSide === "a"} isLoser={winnerSide === "b" && hasMatches} hasBorderTop={false} />
        <BracketTeamRow team={matchup.teams_b} score={scoreB} penScore={penB} isWinner={winnerSide === "b"} isLoser={winnerSide === "a" && hasMatches} hasBorderTop />
        {isClickable && <div style={{ padding: "3px 10px", borderTop: "1px solid var(--color-border)" }}><p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-brand)" }}>VER JOGOS ›</p></div>}
      </div>
      {showConnector && <div style={{ position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)", width: 12, height: 1, backgroundColor: "var(--color-border)" }} />}
    </div>
  );
}

function BracketTeamRow({ team, score, penScore, isWinner, isLoser, hasBorderTop }: {
  team: MatchupData["teams_a"]; score: number | null; penScore: number | null;
  isWinner: boolean; isLoser: boolean; hasBorderTop: boolean;
}) {
  const textColor = isWinner ? "#BFF205" : isLoser ? "rgba(255,255,255,0.3)" : "var(--color-text-primary)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
      borderTop: hasBorderTop ? "1px solid var(--color-border)" : "none",
      backgroundColor: isWinner ? "rgba(191,242,5,0.04)" : "transparent" }}>
      {team?.logo_url
        ? <img src={team.logo_url} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0, filter: isLoser ? "grayscale(1) opacity(0.35)" : "none" }} />
        : <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: "var(--color-border)", flexShrink: 0 }} />}
      <p style={{ margin: 0, flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: isWinner ? 700 : 500,
        color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {team ? (team.abbreviation ?? team.full_name) : <span style={{ opacity: 0.4 }}>A definir</span>}
      </p>
      {score !== null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          {penScore != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)", opacity: 0.8 }}>({penScore})</span>}
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: isWinner ? "#BFF205" : isLoser ? "rgba(255,255,255,0.25)" : "var(--color-text-primary)", minWidth: 16, textAlign: "right" }}>{score}</span>
        </div>
      )}
    </div>
  );
}

function BracketSeriesModal({ matchup, legs, aggregateScore, onClose }: {
  matchup: MatchupData; legs: boolean; aggregateScore: boolean; onClose: () => void;
}) {
  const matches = (matchup.matches ?? []).filter(m => m.status === "finished");
  const teamA = matchup.teams_a; const teamB = matchup.teams_b;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, borderRadius: 14, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {teamA?.logo_url && <img src={teamA.logo_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{teamA?.abbreviation ?? teamA?.full_name ?? "—"}</p>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>vs</span>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{teamB?.abbreviation ?? teamB?.full_name ?? "—"}</p>
            {teamB?.logo_url && <img src={teamB.logo_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18 }}>×</button>
        </div>
        <div>
          {matches.length === 0
            ? <p style={{ padding: "20px 18px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Nenhuma partida finalizada.</p>
            : matches.map((m, idx) => {
                const date = m.match_date ? new Date(m.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null;
                const hasPen = m.pen_a != null && m.pen_b != null;
                const winSide = hasPen ? ((m.pen_a ?? 0) > (m.pen_b ?? 0) ? "a" : (m.pen_b ?? 0) > (m.pen_a ?? 0) ? "b" : null) : (m.score_a > m.score_b ? "a" : m.score_b > m.score_a ? "b" : null);
                const gameLabel = matches.length > 1 ? ({ 0: "Ida", 1: "Volta" }[idx] ?? `Jogo ${idx + 1}`) : "Jogo único";
                return (
                  <div key={m.id} style={{ padding: "12px 18px", borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)", textTransform: "uppercase" }}>{gameLabel}</span>
                      {date && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>{date}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                        {teamA?.logo_url && <img src={teamA.logo_url} alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: winSide === "b" ? "grayscale(1) opacity(0.4)" : "none" }} />}
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: winSide === "a" ? 700 : 400, color: winSide === "a" ? "#BFF205" : winSide === "b" ? "rgba(255,255,255,0.4)" : "var(--color-text-primary)" }}>{teamA?.abbreviation ?? "—"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: winSide === "a" ? "#BFF205" : "var(--color-text-primary)" }}>{hasPen ? `${m.score_a}(${m.pen_a})` : m.score_a}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>×</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: winSide === "b" ? "#BFF205" : "var(--color-text-primary)" }}>{hasPen ? `${m.score_b}(${m.pen_b})` : m.score_b}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: winSide === "b" ? 700 : 400, color: winSide === "b" ? "#BFF205" : winSide === "a" ? "rgba(255,255,255,0.4)" : "var(--color-text-primary)" }}>{teamB?.abbreviation ?? "—"}</span>
                        {teamB?.logo_url && <img src={teamB.logo_url} alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: winSide === "a" ? "grayscale(1) opacity(0.4)" : "none" }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--color-border)", textAlign: "right" }}>
          <button type="button" onClick={onClose} style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer" }}>FECHAR</button>
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

// ─── BracketView ──────────────────────────────────────────────────────────────
// Renders a knockout/conference bracket for the classification tab
// Usage: <BracketView phaseId={id} phases={phases} matchups={matchups} rounds={rounds} supabase={supabase} legs={phase.legs} aggregateScore={phase.aggregate_score} />

const KNOCKOUT_ORDER = [
  "Décimas de Final",
  "Oitavas de Final",
  "Quartas de Final",
  "Semifinal",
  "Final",
  "Disputa de Terceiro Lugar",
];

function sortRounds(labels: string[]): string[] {
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
  teams_a: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
  teams_b: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
  matches?: MatchData[];
};

type MatchData = {
  id: string;
  score_a: number;
  score_b: number;
  status: string;
  match_date: string | null;
  pen_a?: number;
  pen_b?: number;
};

function BracketView({
  phaseId,
  matchups,
  legs,
  aggregateScore,
}: {
  phaseId: string;
  matchups: MatchupData[];
  legs: boolean;
  aggregateScore: boolean;
}) {
  const [enriched, setEnriched] = useState<MatchupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMatchup, setModalMatchup] = useState<MatchupData | null>(null);

  useEffect(() => {
    if (!phaseId) return;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const phaseMatchups = matchups.filter(m => m.id); // all passed in
      const matchupIds = phaseMatchups.map(m => m.id);
      if (matchupIds.length === 0) { setEnriched([]); setLoading(false); return; }

      // Fetch matches for all matchups
      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, matchup_id, score_a, score_b, status, match_date, team_a_id")
        .in("matchup_id", matchupIds)
        .order("match_date", { ascending: true });

      const matchIds = (matchesData ?? []).map((m: any) => m.id);

      // Fetch shootout results
      let shootouts: any[] = [];
      if (matchIds.length > 0) {
        const { data: soData } = await supabase
          .from("match_penalty_shootout")
          .select("match_id, team_id, result")
          .in("match_id", matchIds);
        shootouts = soData ?? [];
      }

      // Group shootout scores per match per team
      const shootoutMap: Record<string, { team_a: number; team_b: number }> = {};
      const matchTeamAMap: Record<string, string> = {};
      (matchesData ?? []).forEach((m: any) => { matchTeamAMap[m.id] = m.team_a_id; });

      shootouts.forEach((s: any) => {
        if (!shootoutMap[s.match_id]) shootoutMap[s.match_id] = { team_a: 0, team_b: 0 };
        if (s.result === "scored") {
          if (s.team_id === matchTeamAMap[s.match_id]) shootoutMap[s.match_id].team_a++;
          else shootoutMap[s.match_id].team_b++;
        }
      });

      // Group matches by matchup
      const matchesByMatchup: Record<string, MatchData[]> = {};
      (matchesData ?? []).forEach((m: any) => {
        if (!m.matchup_id) return;
        if (!matchesByMatchup[m.matchup_id]) matchesByMatchup[m.matchup_id] = [];
        const so = shootoutMap[m.id];
        matchesByMatchup[m.matchup_id].push({
          id: m.id, score_a: m.score_a, score_b: m.score_b,
          status: m.status, match_date: m.match_date,
          pen_a: so?.team_a, pen_b: so?.team_b,
        });
      });

      setEnriched(phaseMatchups.map(m => ({ ...m, matches: matchesByMatchup[m.id] ?? [] })));
      setLoading(false);
    }
    void load();
  }, [phaseId, matchups]);

  if (loading) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6" }}>Carregando bracket…</p>;
  if (enriched.length === 0) return <p style={{ fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Nenhum confronto cadastrado.</p>;

  // Group by round_label
  const byLabel: Record<string, MatchupData[]> = {};
  enriched.forEach(m => {
    const key = m.round_label ?? "—";
    if (!byLabel[key]) byLabel[key] = [];
    byLabel[key].push(m);
  });
  const sortedLabels = sortRounds(Object.keys(byLabel));

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      {modalMatchup && (
        <SeriesModal matchup={modalMatchup} legs={legs} aggregateScore={aggregateScore} onClose={() => setModalMatchup(null)} />
      )}
      <div style={{ display: "flex", gap: 0, alignItems: "stretch", minWidth: sortedLabels.length * 220 }}>
        {sortedLabels.map((label, colIdx) => {
          const colMatchups = [...(byLabel[label] ?? [])].sort((a, b) => a.display_order - b.display_order);
          const isLast = colIdx === sortedLabels.length - 1 || (sortedLabels.length > 1 && label === "Disputa de Terceiro Lugar");
          const isThird = label === "Disputa de Terceiro Lugar";
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 200 }}>
              {/* Column header */}
              <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid var(--color-border)" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: isThird ? "var(--color-warning)" : "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {label}
                </p>
              </div>

              {/* Matchup cards */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "16px 12px", gap: 12 }}>
                {colMatchups.map((matchup, mIdx) => (
                  <MatchupCard
                    key={matchup.id}
                    matchup={matchup}
                    legs={legs}
                    aggregateScore={aggregateScore}
                    showConnector={!isLast && !isThird}
                    onOpenModal={() => legs && setModalMatchup(matchup)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MatchupCard ──────────────────────────────────────────────────────────────

function MatchupCard({ matchup, legs, aggregateScore, showConnector, onOpenModal }: {
  matchup: MatchupData;
  legs: boolean;
  aggregateScore: boolean;
  showConnector: boolean;
  onOpenModal: () => void;
}) {
  const matches = matchup.matches ?? [];
  const hasMatches = matches.some(m => m.status === "finished");
  const isClickable = legs && matches.length > 0;

  // Compute display scores
  let scoreA: number | null = null;
  let scoreB: number | null = null;
  let penA: number | null = null;
  let penB: number | null = null;
  let winnerSide: "a" | "b" | null = null;

  if (hasMatches) {
    const finished = matches.filter(m => m.status === "finished");
    if (!legs) {
      // Single match
      const m = finished[0];
      if (m) {
        scoreA = m.score_a; scoreB = m.score_b;
        penA = m.pen_a ?? null; penB = m.pen_b ?? null;
        if (penA !== null && penB !== null) {
          winnerSide = penA > penB ? "a" : penB > penA ? "b" : null;
        } else {
          winnerSide = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null;
        }
      }
    } else if (aggregateScore) {
      // Sum goals
      scoreA = finished.reduce((s, m) => s + m.score_a, 0);
      scoreB = finished.reduce((s, m) => s + m.score_b, 0);
      // Check last match for penalties
      const last = finished[finished.length - 1];
      if (last?.pen_a !== undefined && last?.pen_b !== undefined) {
        penA = last.pen_a ?? null; penB = last.pen_b ?? null;
      }
      if (penA !== null && penB !== null) {
        winnerSide = penA > penB ? "a" : penB > penA ? "b" : null;
      } else {
        winnerSide = (scoreA ?? 0) > (scoreB ?? 0) ? "a" : (scoreB ?? 0) > (scoreA ?? 0) ? "b" : null;
      }
    } else {
      // Ida e volta sem agregado — count wins
      let winsA = 0, winsB = 0;
      finished.forEach(m => {
        if (m.pen_a !== undefined && m.pen_b !== undefined && m.pen_a !== null && m.pen_b !== null) {
          if (m.pen_a > m.pen_b) winsA++; else if (m.pen_b > m.pen_a) winsB++;
        } else {
          if (m.score_a > m.score_b) winsA++; else if (m.score_b > m.score_a) winsB++;
        }
      });
      scoreA = winsA; scoreB = winsB;
      winnerSide = winsA > winsB ? "a" : winsB > winsA ? "b" : null;
    }
  }

  const teamA = matchup.teams_a;
  const teamB = matchup.teams_b;
  const aWins = winnerSide === "a";
  const bWins = winnerSide === "b";

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={isClickable ? onOpenModal : undefined}
        style={{
          borderRadius: 10, border: `1px solid ${matchup.is_completed ? "var(--color-border)" : "var(--color-border)"}`,
          backgroundColor: "var(--color-surface)", overflow: "hidden",
          cursor: isClickable ? "pointer" : "default",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => { if (isClickable) (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.4)"; }}
        onMouseLeave={e => { if (isClickable) (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
      >
        <TeamRow team={teamA} score={scoreA} penScore={penA} isWinner={aWins} isLoser={!aWins && bWins && hasMatches} hasBorder />
        <TeamRow team={teamB} score={scoreB} penScore={penB} isWinner={bWins} isLoser={!bWins && aWins && hasMatches} hasBorder={false} />
        {isClickable && (
          <div style={{ padding: "4px 10px", borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 4 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-brand)", letterSpacing: "0.04em" }}>
              VER JOGOS ›
            </p>
          </div>
        )}
      </div>

      {/* Connector line to next round */}
      {showConnector && (
        <div style={{
          position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)",
          width: 12, height: 1, backgroundColor: "var(--color-border)",
        }} />
      )}
    </div>
  );
}

// ─── TeamRow ──────────────────────────────────────────────────────────────────

function TeamRow({ team, score, penScore, isWinner, isLoser, hasBorder }: {
  team: MatchupData["teams_a"];
  score: number | null;
  penScore: number | null;
  isWinner: boolean;
  isLoser: boolean;
  hasBorder: boolean;
}) {
  const name = team?.full_name ?? team?.abbreviation ?? "A definir";
  const textColor = isWinner ? "#BFF205" : isLoser ? "rgba(255,255,255,0.35)" : "var(--color-text-primary)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
      borderTop: hasBorder ? "none" : "1px solid var(--color-border)",
      backgroundColor: isWinner ? "rgba(191,242,5,0.04)" : "transparent",
    }}>
      {/* Logo */}
      {team?.logo_url ? (
        <img src={team.logo_url} alt="" style={{
          width: 20, height: 20, objectFit: "contain", flexShrink: 0,
          filter: isLoser ? "grayscale(1) opacity(0.4)" : isWinner ? "drop-shadow(0 0 4px rgba(191,242,5,0.5))" : "none",
          transition: "filter 0.15s",
        }} />
      ) : (
        <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: "var(--color-border)", flexShrink: 0 }} />
      )}

      {/* Name */}
      <p style={{ margin: 0, flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: isWinner ? 700 : 500,
        color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {team ? name : <span style={{ opacity: 0.4 }}>A definir</span>}
      </p>

      {/* Score */}
      {score !== null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          {penScore !== null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)", opacity: 0.8 }}>
              ({penScore})
            </span>
          )}
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: isWinner ? "#BFF205" : isLoser ? "rgba(255,255,255,0.3)" : "var(--color-text-primary)", minWidth: 16, textAlign: "right" }}>
            {score}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── SeriesModal ──────────────────────────────────────────────────────────────

function SeriesModal({ matchup, legs, aggregateScore, onClose }: {
  matchup: MatchupData;
  legs: boolean;
  aggregateScore: boolean;
  onClose: () => void;
}) {
  const matches = (matchup.matches ?? []).filter(m => m.status === "finished");
  const teamA = matchup.teams_a;
  const teamB = matchup.teams_b;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, borderRadius: 14, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {teamA?.logo_url && <img src={teamA.logo_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {teamA?.abbreviation ?? teamA?.full_name ?? "—"}
            </p>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>vs</span>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {teamB?.abbreviation ?? teamB?.full_name ?? "—"}
            </p>
            {teamB?.logo_url && <img src={teamB.logo_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Match list */}
        <div>
          {matches.length === 0 ? (
            <p style={{ padding: "20px 18px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
              Nenhuma partida finalizada.
            </p>
          ) : matches.map((m, idx) => {
            const date = m.match_date ? new Date(m.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null;
            const hasPen = m.pen_a !== undefined && m.pen_b !== undefined && m.pen_a !== null && m.pen_b !== null;
            let winSide: "a" | "b" | null = null;
            if (hasPen) winSide = (m.pen_a ?? 0) > (m.pen_b ?? 0) ? "a" : (m.pen_b ?? 0) > (m.pen_a ?? 0) ? "b" : null;
            else winSide = m.score_a > m.score_b ? "a" : m.score_b > m.score_a ? "b" : null;

            const labelMap: Record<number, string> = { 0: "Ida", 1: "Volta" };
            const gameLabel = matches.length > 1 ? (labelMap[idx] ?? `Jogo ${idx + 1}`) : "Jogo único";

            return (
              <div key={m.id} style={{ padding: "12px 18px", borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{gameLabel}</span>
                  {date && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>{date}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Team A */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    {teamA?.logo_url && <img src={teamA.logo_url} alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: winSide === "b" ? "grayscale(1) opacity(0.4)" : "none" }} />}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: winSide === "a" ? 700 : 400, color: winSide === "a" ? "#BFF205" : winSide === "b" ? "rgba(255,255,255,0.4)" : "var(--color-text-primary)" }}>
                      {teamA?.abbreviation ?? "—"}
                    </span>
                  </div>
                  {/* Score */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, minWidth: 18, textAlign: "right", color: winSide === "a" ? "#BFF205" : "var(--color-text-primary)" }}>
                      {hasPen ? `${m.score_a}(${m.pen_a})` : m.score_a}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>×</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, minWidth: 18, textAlign: "left", color: winSide === "b" ? "#BFF205" : "var(--color-text-primary)" }}>
                      {hasPen ? `${m.score_b}(${m.pen_b})` : m.score_b}
                    </span>
                  </div>
                  {/* Team B */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: winSide === "b" ? 700 : 400, color: winSide === "b" ? "#BFF205" : winSide === "a" ? "rgba(255,255,255,0.4)" : "var(--color-text-primary)" }}>
                      {teamB?.abbreviation ?? "—"}
                    </span>
                    {teamB?.logo_url && <img src={teamB.logo_url} alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: winSide === "a" ? "grayscale(1) opacity(0.4)" : "none" }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--color-border)", textAlign: "right" }}>
          <button type="button" onClick={onClose}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}>
            FECHAR
          </button>
        </div>
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