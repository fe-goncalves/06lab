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
type Round = { id: string; name: string; custom_label: string | null; phase_id: string };
type EditionTeam = { id: string; team_id: string; arrival_origin: string | null; teams: Team | null };
type Standing = any;
type Scorer = any;

const STATUS_LABEL: Record<string, string> = { scheduled: "AG", ongoing: "AO VIVO", finished: "FT", postponed: "AD" };
const STATUS_COLOR: Record<string, string> = { scheduled: "#A6A6A6", ongoing: "#BFF205", finished: "#A6A6A6", postponed: "#FF4444" };
const PHASE_TYPE_LABEL: Record<string, string> = { round_robin: "Pontos Corridos", group_stage: "Fase de Grupos", knockout: "Mata-mata", conference: "Conferência" };
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

  const [activeTab, setActiveTab] = useState<"jogos" | "competicao" | "classificacao" | "artilharia" | "premiacoes" | "configuracoes">("jogos");
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
    ] = await Promise.all([
      phaseIds.length > 0
        ? supabase.from("matches").select("id, match_date, match_time, status, score_a, score_b, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url), rounds(name, custom_label), phases(id, full_name, custom_label, phase_type)").in("phase_id", phaseIds).order("match_date", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("phases").select("id, full_name, custom_label, phase_type, display_order, is_current").eq("edition_id", editionId).order("display_order"),
      phaseIds.length > 0
        ? supabase.from("rounds").select("id, name, custom_label, phase_id").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
      supabase.from("edition_teams").select("id, team_id, arrival_origin, teams(id, full_name, abbreviation, logo_url)").eq("edition_id", editionId).order("display_order"),
      supabase.from("team_edition_stats").select("*, teams(id, full_name, abbreviation, logo_url, primary_color)").eq("edition_id", editionId).order("points", { ascending: false }).order("goals_scored", { ascending: false }),
      supabase.from("athlete_edition_stats").select("*, athletes(id, full_name, surname, photo_url), team:teams(id, full_name, abbreviation)").eq("edition_id", editionId).gt("goals", 0).order("goals", { ascending: false }).limit(15),
      phaseIds.length > 0
        ? supabase.from("matchups").select("id, round_label, display_order, is_completed, phase_id, team_a_id, team_b_id, teams_a:teams!matchups_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matchups_team_b_id_fkey(full_name, abbreviation, logo_url)").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
      supabase.from("venues").select("id, full_name").eq("organization_id", orgId).order("full_name"),
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
  const teamsForEdition = editionTeams.map(et => et.teams).filter(Boolean) as Team[];

  async function handleCreateMatch() {
    if (!newMatchPhaseId || !newMatchTeamA || !newMatchTeamB) { setNewMatchError("Fase e equipes são obrigatórias."); return; }
    setCreatingMatch(true); setNewMatchError(null);
    const fd = new FormData();
    fd.append("team_a_id", newMatchTeamA); fd.append("team_b_id", newMatchTeamB); fd.append("team_a_is_home", "true");
    if (newMatchDate) fd.append("match_date", newMatchDate);
    if (newMatchTime) fd.append("match_time", newMatchTime);
    if (newMatchVenueId) fd.append("venue_id", newMatchVenueId);
    if (newMatchRoundId) fd.append("round_id", newMatchRoundId);
    const result = await criarPartida(newMatchPhaseId, fd);
    setCreatingMatch(false);
    if ("error" in result) { setNewMatchError(result.error); return; }
    toast("success", "Partida criada.");
    if (newMatchAddAnother) { setNewMatchTeamA(""); setNewMatchTeamB(""); }
    else { setShowNewMatch(false); setNewMatchPhaseId(""); setNewMatchRoundId(""); setNewMatchDate(""); setNewMatchTime(""); setNewMatchVenueId(""); setNewMatchTeamA(""); setNewMatchTeamB(""); }
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
              { key: "jogos", label: "JOGOS" }, { key: "competicao", label: "COMPETIÇÃO" },
              { key: "classificacao", label: "CLASSIFICAÇÃO" }, { key: "artilharia", label: "ARTILHARIA" },
              { key: "premiacoes", label: "PREMIAÇÕES" }, { key: "configuracoes", label: "CONFIGURAÇÕES" },
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
                <select value={newMatchPhaseId} onChange={e => { setNewMatchPhaseId(e.target.value); setNewMatchRoundId(""); }} className={inputClass} style={inputStyle}>
                  <option value="">Selecione a fase…</option>
                  {phases.map(p => <option key={p.id} value={p.id}>{p.custom_label ?? p.full_name}</option>)}
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
                    <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Adicionar outra com mesma data, horário e rodada</span>
                  </label>
                </>
              )}
              {newMatchError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{newMatchError}</p>}
            </div>
            <div className="flex gap-3 border-t px-6 py-4 justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setShowNewMatch(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Cancelar</button>
              <button type="button" onClick={handleCreateMatch} disabled={creatingMatch || !newMatchPhaseId} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
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
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{matches.length} {matches.length === 1 ? "partida" : "partidas"}</p>
              <button type="button" onClick={() => setShowNewMatch(true)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                <Plus size={14} strokeWidth={2.5} /> Nova partida
              </button>
            </div>
            {loadingMatches ? (
              <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem partidas</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>Clique em "Nova partida" para começar.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.values(matchesByRound).map(group => (
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

        {/* ABA COMPETIÇÃO */}
        {activeTab === "competicao" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Equipes ({editionTeams.length})</h2>
              </div>
              {editionTeams.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe adicionada.</p>
              ) : (
                editionTeams.map((et, idx) => (
                  <div key={et.id} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {et.teams?.logo_url ? <img src={et.teams.logo_url} alt="" className="h-8 w-8 rounded object-contain shrink-0" /> : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-bold" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>{et.teams?.abbreviation?.slice(0, 2) ?? "?"}</div>
                    )}
                    <span className="flex-1 text-sm" style={{ color: "var(--color-text-primary)" }}>{et.teams?.full_name ?? "—"}</span>
                    {et.arrival_origin && <span className="font-mono text-xs rounded px-2 py-0.5" style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>{et.arrival_origin}</span>}
                    <button type="button" onClick={() => openElencoModal(et.id, et.team_id, et.teams?.full_name ?? "Equipe")} className="shrink-0 flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs hover:border-[var(--color-brand)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      <Users size={12} /> Elenco
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Fases ({phases.length})</h2>
                <Link href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/fases/nova`} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
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
            {!selectedPhase ? (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma fase disponível.</p>
            ) : isClassificatory(selectedPhase.phase_type) ? (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                {standings.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum dado de classificação disponível.</p>
                ) : (
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
                        {standings.map((row: any, idx: number) => (
                          <tr key={row.team_id} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }} className="hover:bg-[rgba(255,255,255,0.02)]">
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: idx < 4 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>{idx + 1}</td>
                            <td className="px-4 py-3"><div className="flex items-center gap-2">{row.teams?.logo_url ? <img src={row.teams.logo_url} alt="" className="h-5 w-5 rounded object-contain" /> : <div className="h-5 w-5 rounded" style={{ backgroundColor: "var(--color-border)" }} />}<span className="font-medium text-xs" style={{ color: "var(--color-text-primary)" }}>{row.teams?.abbreviation ?? row.teams?.full_name ?? "—"}</span></div></td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.matches_played ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.wins ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.draws ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.losses ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.goals_scored ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.goals_conceded ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{((row.goals_scored ?? 0) - (row.goals_conceded ?? 0)) > 0 ? "+" : ""}{(row.goals_scored ?? 0) - (row.goals_conceded ?? 0)}</td>
                            <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: "var(--color-brand)" }}>{row.points ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              (() => {
                const phaseMatchups = matchups.filter(m => m.phase_id === selectedPhaseId);
                const byLabel: Record<string, any[]> = {};
                phaseMatchups.forEach(m => { if (!byLabel[m.round_label]) byLabel[m.round_label] = []; byLabel[m.round_label].push(m); });
                return Object.keys(byLabel).length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum confronto cadastrado nesta fase.</p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(byLabel).map(([label, items]) => (
                      <div key={label}>
                        <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>{label}</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {items.map((m: any) => (
                            <div key={m.id} className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                              <div className="flex items-center gap-3 mb-2">
                                {m.teams_a?.logo_url ? <img src={m.teams_a.logo_url} alt="" className="h-6 w-6 rounded object-contain shrink-0" /> : <div className="h-6 w-6 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />}
                                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{m.teams_a?.full_name ?? "A definir"}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {m.teams_b?.logo_url ? <img src={m.teams_b.logo_url} alt="" className="h-6 w-6 rounded object-contain shrink-0" /> : <div className="h-6 w-6 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />}
                                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{m.teams_b?.full_name ?? "A definir"}</span>
                              </div>
                              {m.is_completed && <span className="mt-2 inline-block font-mono text-xs rounded px-2 py-0.5" style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>Concluído</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ABA ARTILHARIA */}
        {activeTab === "artilharia" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            {scorers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum gol registrado nesta edição.</p>
            ) : (
              scorers.map((scorer: any, idx: number) => (
                <div key={scorer.athlete_id} className="flex items-center gap-4 px-5 py-3 hover:bg-[rgba(255,255,255,0.02)]" style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                  <span className="w-6 font-mono text-xs text-right shrink-0" style={{ color: idx < 3 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>{idx + 1}</span>
                  {scorer.athletes?.photo_url ? <img src={scorer.athletes.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" /> : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {(scorer.athletes?.surname ?? scorer.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>{scorer.athletes?.surname ?? scorer.athletes?.full_name ?? "—"}</p>
                    {scorer.team?.full_name && <p className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{scorer.team.abbreviation ?? scorer.team.full_name}</p>}
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="font-display text-xl font-bold" style={{ color: "var(--color-brand)" }}>{scorer.goals ?? 0}</p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>gols</p>
                    </div>
                    {(scorer.assists ?? 0) > 0 && (
                      <div className="text-center">
                        <p className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{scorer.assists}</p>
                        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>assist.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA PREMIAÇÕES */}
        {activeTab === "premiacoes" && (
          <div className="space-y-6">
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Atribuir premiação</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo</span>
                  <select value={awardType} onChange={e => { setAwardType(e.target.value); setAwardAthleteId(""); setAwardTeamId(""); }} className={inputClass} style={inputStyle}>
                    <option value="">Selecione…</option>
                    <optgroup label="Individual">
                      <option value="top_scorer">Artilheiro</option>
                      <option value="top_assists">Garçom</option>
                      <option value="mvp">MVP</option>
                      <option value="best_goalkeeper">Melhor Goleiro</option>
                      <option value="revelation">Revelação</option>
                      <option value="best_defense">Melhor Defesa</option>
                      <option value="best_performance">Melhor Desempenho</option>
                    </optgroup>
                    <optgroup label="Coletiva">
                      <option value="champion">Campeão</option>
                      <option value="runner_up">Vice-campeão</option>
                      <option value="third_place">Terceiro Lugar</option>
                    </optgroup>
                  </select>
                </label>
                {awardType && !["champion", "runner_up", "third_place"].includes(awardType) && (
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
                {awardType && ["champion", "runner_up", "third_place"].includes(awardType) && (
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Equipe</span>
                    <select value={awardTeamId} onChange={e => setAwardTeamId(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Selecione…</option>
                      {editionTeams.map((et: any) => <option key={et.team_id} value={et.team_id}>{et.teams?.full_name ?? "—"}</option>)}
                    </select>
                  </label>
                )}
                <div className="flex items-end">
                  <button type="button" onClick={handleAtribuirPremiacao} disabled={savingAward || !awardType} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                    {savingAward ? "Salvando…" : "Atribuir"}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Premiações atribuídas ({awards.length})</h2>
              </div>
              {loadingAwards ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Carregando…</p>
              ) : awards.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma premiação atribuída.</p>
              ) : (
                awards.map((award: any, idx: number) => {
                  const isColetiva = ["champion", "runner_up", "third_place"].includes(award.award_type);
                  const name = isColetiva ? (award.teams?.full_name ?? "—") : (award.athletes?.surname ?? award.athletes?.full_name ?? "—");
                  const photo = isColetiva ? award.teams?.logo_url : award.athletes?.photo_url;
                  return (
                    <div key={award.id} className="flex items-center gap-4 px-5 py-3" style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(191,242,5,0.1)" }}>
                        {photo ? <img src={photo} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="text-base">🏆</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs uppercase" style={{ color: "var(--color-brand)" }}>{AWARD_LABELS[award.award_type] ?? award.award_type}</p>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{name}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoverPremiacao(award.id)} className="shrink-0 rounded border px-2 py-1 font-mono text-xs transition-colors hover:border-[var(--color-danger)]" style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>Remover</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ABA CONFIGURAÇÕES */}
        {activeTab === "configuracoes" && (
          <EdicaoConfigTab selectedEditionId={selectedEditionId} selectedEditionName={selectedEdition?.season_name ?? ""} />
        )}
      </div>
    </div>
  );
}

function MatchRow({ match, idx, onDelete }: { match: Match; idx: number; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
      <Link href={`/partidas/${match.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]">
        <div className="w-14 shrink-0 text-center">
          <p className="font-mono text-xs font-bold" style={{ color: STATUS_COLOR[match.status] ?? "#A6A6A6" }}>{STATUS_LABEL[match.status] ?? match.status.toUpperCase()}</p>
          {match.match_date && <p className="font-mono text-xs" style={{ color: "#555" }}>{new Date(match.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {match.teams_a?.logo_url ? <img src={match.teams_a.logo_url} alt="" className="h-5 w-5 rounded object-contain shrink-0" /> : <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />}
              <span className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{match.teams_a?.full_name ?? "A definir"}</span>
            </div>
            <span className="font-display text-lg font-bold shrink-0" style={{ color: match.status === "scheduled" ? "#555" : "var(--color-text-primary)" }}>{match.status === "scheduled" ? "-" : match.score_a}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {match.teams_b?.logo_url ? <img src={match.teams_b.logo_url} alt="" className="h-5 w-5 rounded object-contain shrink-0" /> : <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />}
              <span className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{match.teams_b?.full_name ?? "A definir"}</span>
            </div>
            <span className="font-display text-lg font-bold shrink-0" style={{ color: match.status === "scheduled" ? "#555" : "var(--color-text-primary)" }}>{match.status === "scheduled" ? "-" : match.score_b}</span>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "#555" }} />
      </Link>
      {hovered && (
        <button type="button" onClick={e => { e.preventDefault(); onDelete(); }} className="absolute right-12 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-[var(--color-danger)]" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function EdicaoConfigTab({ selectedEditionId, selectedEditionName }: { selectedEditionId: string; selectedEditionName: string }) {
  const [editionStatus, setEditionStatus] = useState("planned");
  const [isPublic, setIsPublic] = useState(false);
  const [minAthletes, setMinAthletes] = useState("");
  const [maxAthletes, setMaxAthletes] = useState("");
  const [yellowThreshold, setYellowThreshold] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

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
      setMinAthletes(String(settings?.min_athletes ?? ""));
      setMaxAthletes(String(settings?.max_athletes ?? ""));
      setYellowThreshold(String(settings?.yellow_card_suspension_threshold ?? ""));
      setLoaded(true);
    }
    void load();
  }, [selectedEditionId]);

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("status", editionStatus); fd.append("is_public", String(isPublic));
    fd.append("min_athletes", minAthletes); fd.append("max_athletes", maxAthletes);
    fd.append("yellow_card_threshold", yellowThreshold);
    const result = await editarEdicao(selectedEditionId, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Configurações salvas.");
  }

  if (!loaded) return <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-1 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações da edição</h2>
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
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Mínimo de atletas por equipe</span>
            <input type="number" value={minAthletes} onChange={e => setMinAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Máximo de atletas por equipe</span>
            <input type="number" value={maxAthletes} onChange={e => setMaxAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Limite de amarelos para suspensão</span>
            <input type="number" value={yellowThreshold} onChange={e => setYellowThreshold(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
        </div>
      </div>
      <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
    </div>
  );
}