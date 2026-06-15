// COMPETICAO-HUB

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "@/app/(lab)/components/toast";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import Link from "next/link";
import { ChevronDown, Plus, ChevronRight, Users, X, Check, Trash2, Ban, RotateCcw } from "lucide-react";
import { criarEdicao, editarEdicao, atualizarVisibilidadeHome, inscreverAtleta, removerAtletaEdicao, atribuirPremiacao, removerPremiacao, salvarRankingConfig, criarConfronto, criarPartidaNoConfronto, editarTimesConfronto, adicionarEquipeEdicao, removerEquipeEdicao } from "./edicoes/actions";
import { criarPartida, deletarPartida } from "@/app/(lab)/partidas/[matchId]/actions";
import { criarOuAtualizarTOTW, criarOuAtualizarMOTW, buscarTOTS, criarOuAtualizarTOTS, deletarSquad, recalcularEstatisticasEdicao, salvarAjustesPontosClassificacao } from "./edicoes/actions";
import { Star, Search, AlertTriangle } from "lucide-react";
import { criarSuspensao, editarSuspensao, desativarSuspensao } from "@/app/(lab)/suspensoes/actions";

type Competition = any;
type Edition = {
  id: string; season_id: string; status: string;
  season_name: string; year_value: number; custom_name: string | null;
  start_date: string | null; end_date: string | null; created_at: string;
};
type Season = { id: string; name: string; year_value: number };
type Team = { id: string; full_name: string; abbreviation: string | null; logo_url: string | null; is_virtual?: boolean };
type Match = {
  id: string; match_date: string | null; match_time: string | null; status: string;
  score_a: number; score_b: number; matchup_id: string | null;
  teams_a: { full_name: string; short_name: string | null; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
  teams_b: { full_name: string; short_name: string | null; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
  rounds: { name: string; custom_label: string | null } | null;
  phases: { id: string; full_name: string; custom_label: string | null; phase_type: string } | null;
};
type Phase = { id: string; full_name: string; custom_label: string | null; phase_type: string; display_order: number; is_current: boolean };
type Round = { id: string; name: string; custom_label: string | null; phase_id: string; display_order: number; is_current: boolean; legs: boolean; aggregate_score: boolean };
type EditionTeam = { id: string; team_id: string; arrival_origin: string | null; is_free_agent_pool: boolean; teams: Team | null };
type Standing = any;
type Scorer = any;
type TableMarker = {
  id: string;
  phase_id?: string;
  description: string;
  color_hex: string;
  show_background: boolean;
  position_from: number;
  position_to: number;
  display_order: number;
};

function hexToRgba(hex: string, alpha: number): string {
  const h = (hex ?? "").replace("#", "");
  if (h.length !== 6) return `rgba(191,242,5,${alpha})`;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(191,242,5,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function editionLabel(edition: Edition): string {
  return edition.custom_name ?? edition.season_name ?? "Edição sem nome";
}

function getMarkerForRank(markers: TableMarker[], rank: number): TableMarker | undefined {
  return markers.find(m => rank >= m.position_from && rank <= m.position_to);
}

function TableMarkerRow({
  marker,
  onUpdate,
  onRemove,
}: {
  marker: TableMarker;
  onUpdate: (updated: TableMarker) => void;
  onRemove: () => void;
}) {
  const [localDescription, setLocalDescription] = useState(marker.description);
  const [localColorHex, setLocalColorHex] = useState(marker.color_hex ?? "");
  const [localFrom, setLocalFrom] = useState(String(marker.position_from));
  const [localTo, setLocalTo] = useState(String(marker.position_to));

  useEffect(() => {
    setLocalDescription(marker.description);
    setLocalColorHex(marker.color_hex ?? "");
    setLocalFrom(String(marker.position_from));
    setLocalTo(String(marker.position_to));
  }, [marker.id]);

  const inputStyle = { padding: "7px 10px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)", outline: "none" } as const;
  const inputStyleSm = { ...inputStyle, fontSize: 10, padding: "7px 8px" } as const;
  const inputStyleNum = { ...inputStyle, textAlign: "center" as const };

  function commitField(partial: Partial<TableMarker>) {
    onUpdate({ ...marker, ...partial });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 72px 72px 32px", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        placeholder="Título (ex: Classificados)"
        value={localDescription}
        onChange={e => setLocalDescription(e.target.value)}
        onBlur={() => commitField({ description: localDescription })}
        style={inputStyle}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="color"
          value={localColorHex?.startsWith("#") ? localColorHex : "#BFF205"}
          onChange={e => {
            setLocalColorHex(e.target.value);
            commitField({ color_hex: e.target.value });
          }}
          style={{ width: 32, height: 32, padding: 0, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }}
        />
        <input
          type="text"
          value={localColorHex}
          onChange={e => setLocalColorHex(e.target.value)}
          onBlur={() => commitField({ color_hex: localColorHex })}
          style={{ ...inputStyleSm, flex: 1 }}
        />
      </div>
      <input
        type="number" min={1} title="Posição inicial"
        value={localFrom}
        onChange={e => setLocalFrom(e.target.value)}
        onBlur={() => commitField({ position_from: Number(localFrom) || 1 })}
        style={inputStyleNum}
      />
      <input
        type="number" min={1} title="Posição final"
        value={localTo}
        onChange={e => setLocalTo(e.target.value)}
        onBlur={() => commitField({ position_to: Number(localTo) || 1 })}
        style={inputStyleNum}
      />
      <button
        type="button"
        title="Remover marcação"
        onClick={onRemove}
        style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "var(--color-danger)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

function StandingsMarkersEditor({
  visible,
  markers,
  onChange,
}: {
  visible: boolean;
  markers: TableMarker[];
  onChange: React.Dispatch<React.SetStateAction<TableMarker[]>>;
}) {
  if (!visible) return null;
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", backgroundColor: "rgba(255,255,255,0.02)" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.45)", margin: "0 0 12px" }}>
        Marcações na tabela
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 72px 72px 32px", gap: 8, marginBottom: 6, paddingRight: 0 }}>
        {["Título", "Cor", "Do º", "Até º", ""].map((label, i) => (
          <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>{label}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {markers.map((m, idx) => (
          <TableMarkerRow
            key={m.id}
            marker={m}
            onUpdate={updated => onChange(prev => prev.map((x, i) => i === idx ? updated : x))}
            onRemove={() => onChange(prev => prev.filter((_, i) => i !== idx))}
          />
        ))}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.35)", margin: "10px 0 0", lineHeight: 1.5 }}>
        Defina faixas de posição (ex.: 1º–4º classificados, 5º–8º repescagem). As cores aparecem na tabela e na legenda abaixo.
      </p>
      <button
        type="button"
        onClick={() => onChange(prev => [...prev, {
          id: `new-${Date.now()}-${prev.length}`,
          description: "",
          color_hex: "#A6A6A6",
          show_background: true,
          position_from: prev.length > 0 ? (Math.max(...prev.map(p => p.position_to)) + 1) : 1,
          position_to: prev.length > 0 ? (Math.max(...prev.map(p => p.position_to)) + 2) : 2,
          display_order: prev.length,
        }])}
        style={{ marginTop: 10, padding: "6px 12px", borderRadius: 7, border: "1px dashed rgba(255,255,255,0.15)", background: "none", color: "var(--color-brand)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
      >
        + Adicionar marcação
      </button>
    </div>
  );
}

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

export default function CompeticaoHub({ competition, editions, seasons, allTeams, orgId, initialEditionId }: {
  competition: Competition; editions: Edition[]; seasons: Season[]; allTeams: Team[]; orgId: string;
  initialEditionId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const abaParam = searchParams.get("aba");
  const configParam = searchParams.get("config");

  const [activeTab, setActiveTab] = useState<"jogos" | "classificacao" | "estatisticas" | "competicao" | "configuracoes">(
    abaParam === "suspensoes" ? "configuracoes" : ((abaParam as any) ?? "jogos")
  );

  // Suspensões
  const [suspensions, setSuspensions] = useState<any[]>([]);
  const [loadingSuspensions, setLoadingSuspensions] = useState(false);
  const [suspActiveFilter, setSuspActiveFilter] = useState<"active" | "all">("active");
  const [showSuspModal, setShowSuspModal] = useState(false);
  const [suspTeamId, setSuspTeamId] = useState("");
  const [suspMemberType, setSuspMemberType] = useState<"athlete" | "staff">("athlete");
  const [suspAthleteId, setSuspAthleteId] = useState("");
  const [suspStaffId, setSuspStaffId] = useState("");
  const [suspOriginMatchId, setSuspOriginMatchId] = useState("");
  const [suspGamesTotal, setSuspGamesTotal] = useState("1");
  const [suspStartsAt, setSuspStartsAt] = useState("");
  const [suspReason, setSuspReason] = useState("");
  const [suspCreating, setSuspCreating] = useState(false);
  const [suspEditingId, setSuspEditingId] = useState<string | null>(null);
  const [suspEditGamesTotal, setSuspEditGamesTotal] = useState("1");
  const [suspEditGamesRemaining, setSuspEditGamesRemaining] = useState("1");
  const [suspEditStartsAt, setSuspEditStartsAt] = useState("");
  const [suspEditReason, setSuspEditReason] = useState("");
  const [suspSaving, setSuspSaving] = useState(false);
  const [suspProcessing, setSuspProcessing] = useState<string | null>(null);
  const [editionStaff, setEditionStaff] = useState<any[]>([]);
  const [activeStatsTab, setActiveStatsTab] = useState<"geral" | "semanal">(
    (searchParams.get("stats") as any) ?? "geral"
  );
  const [activeCompTab, setActiveCompTab] = useState<"equipes" | "fases">(
    (searchParams.get("comp") as any) ?? "equipes"
  );
  const [activeConfigTab, setActiveConfigTab] = useState<"gerais" | "premiacoes" | "inscricoes" | "ranking" | "suspensoes" | "detalhes">(
    abaParam === "suspensoes" ? "suspensoes" : ((configParam as any) ?? "gerais")
  );
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    searchParams.get("edicao") ?? initialEditionId ?? editions[0]?.id ?? "",
  );
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


  const [standingsMode, setStandingsMode] = useState<"view" | "edit_points" | "edit_markers">("view");
  const [markers, setMarkers] = useState<TableMarker[]>([]);
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const [savingMarkers, setSavingMarkers] = useState(false);
  const [editingMarkers, setEditingMarkers] = useState<TableMarker[]>([]);
  const [standingsMenuOpen, setStandingsMenuOpen] = useState(false);
  const [standingsConfirmRecalc, setStandingsConfirmRecalc] = useState(false);
  const [editedPoints, setEditedPoints] = useState<Record<string, { awarded: number; deducted: number }>>({});
  const [reorderedTeams, setReorderedTeams] = useState<string[]>([]); // team_ids em nova ordem
  const [savingStandings, setSavingStandings] = useState(false);
  const dragTeamRef = useRef<string | null>(null);
  
  

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

  const [jobsSubTab, setJobsSubTab] = useState<"confrontos" | "partidas">("partidas");
  const [editingMatchup, setEditingMatchup] = useState<any | null>(null);

  const [novoMatchPreselectedPhaseId, setNovoMatchPreselectedPhaseId] = useState("");

  function updateTab(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const sortedEditionsForDropdown = [...editions].sort((a, b) => {
    if (a.status === "ongoing" && b.status !== "ongoing") return -1;
    if (b.status === "ongoing" && a.status !== "ongoing") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
      ? supabase.from("matches").select("id, match_date, match_time, status, score_a, score_b, matchup_id, teams_a:teams!matches_team_a_id_fkey(full_name, short_name, abbreviation, logo_url, primary_color), teams_b:teams!matches_team_b_id_fkey(full_name, short_name, abbreviation, logo_url, primary_color), rounds(name, custom_label), phases(id, full_name, custom_label, phase_type)").in("phase_id", phaseIds).order("match_date", { ascending: true })
        : Promise.resolve({ data: [] }),
        supabase.from("phases").select("id, full_name, custom_label, phase_type, display_order, is_current, legs, aggregate_score").eq("edition_id", editionId).order("display_order"),
      phaseIds.length > 0
        ? supabase.from("rounds").select("id, name, custom_label, phase_id, display_order, is_current, legs, aggregate_score").in("phase_id", phaseIds).order("display_order")
        : Promise.resolve({ data: [] }),
        supabase.from("edition_teams").select("id, team_id, arrival_origin, is_free_agent_pool, teams(id, full_name, short_name, abbreviation, logo_url)").eq("edition_id", editionId).order("display_order"),
      supabase.from("team_edition_stats").select("*, teams(id, full_name, abbreviation, logo_url, primary_color)").eq("edition_id", editionId).order("points", { ascending: false }).order("goals_scored", { ascending: false }),
      supabase.from("athlete_edition_stats").select("*, athletes(id, full_name, surname, photo_url), team:teams(id, full_name, abbreviation, logo_url)").eq("edition_id", editionId).not("athlete_id", "is", null).order("goals", { ascending: false }),
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

  const [yellowAlerts, setYellowAlerts] = useState<{ athleteId: string; athleteName: string; teamName: string; count: number; threshold: number }[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  async function loadYellowAlerts(editionId: string) {
    if (!editionId) return;
    setLoadingAlerts(true);
    const supabase = createClient();

    // Buscar threshold configurado para a edição
    const { data: settings } = await supabase
      .from("edition_settings")
      .select("yellow_card_suspension_threshold")
      .eq("edition_id", editionId)
      .maybeSingle();

    const threshold = settings?.yellow_card_suspension_threshold;
    if (!threshold || threshold < 1) { setYellowAlerts([]); setLoadingAlerts(false); return; }

    // Buscar todas as fases da edição
    const { data: phases } = await supabase
      .from("phases")
      .select("id")
      .eq("edition_id", editionId);

    const phaseIds = (phases ?? []).map((p: any) => p.id);
    if (phaseIds.length === 0) { setYellowAlerts([]); setLoadingAlerts(false); return; }

    // Buscar partidas dessas fases
    const { data: matchRows } = await supabase
      .from("matches")
      .select("id")
      .in("phase_id", phaseIds);

    const matchIds = (matchRows ?? []).map((m: any) => m.id);
    if (matchIds.length === 0) { setYellowAlerts([]); setLoadingAlerts(false); return; }

    // Contar cartões amarelos por atleta nessas partidas (yellow_card + red_yellow_card)
    const { data: actions } = await supabase
      .from("match_actions")
      .select("primary_athlete_id, match_id")
      .in("action_type", ["yellow_card", "red_yellow_card"])
      .in("match_id", matchIds)
      .not("primary_athlete_id", "is", null);

    if (!actions || actions.length === 0) { setYellowAlerts([]); setLoadingAlerts(false); return; }

    // Agrupar contagem por atleta
    const countMap: Record<string, number> = {};
    for (const a of actions) {
      countMap[a.primary_athlete_id] = (countMap[a.primary_athlete_id] ?? 0) + 1;
    }

    // Filtrar apenas quem atingiu ou passou o threshold
    const alertIds = Object.entries(countMap)
      .filter(([, count]) => count >= threshold)
      .map(([id]) => id);

    if (alertIds.length === 0) { setYellowAlerts([]); setLoadingAlerts(false); return; }

    // Buscar nomes dos atletas e equipes via edition_roster_entries
    const { data: roster } = await supabase
      .from("edition_roster_entries")
      .select("athlete_id, athletes(id, full_name, surname), edition_teams(team_id, teams(full_name, abbreviation))")
      .eq("member_type", "athlete")
      .eq("status", "approved")
      .in("athlete_id", alertIds);

    const alerts = alertIds.map(athleteId => {
      const entry = (roster ?? []).find((r: any) => r.athlete_id === athleteId);
      return {
        athleteId,
        athleteName: entry?.athletes?.surname ?? entry?.athletes?.full_name ?? "Atleta desconhecido",
        teamName: entry?.edition_teams?.teams?.abbreviation ?? entry?.edition_teams?.teams?.full_name ?? "—",
        count: countMap[athleteId],
        threshold,
      };
    }).sort((a, b) => b.count - a.count);

    setYellowAlerts(alerts);
    setLoadingAlerts(false);
  }

  async function loadSuspensions(editionId: string) {
    if (!editionId) return;
    setLoadingSuspensions(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("suspensions")
      .select("id, athlete_id, staff_member_id, origin_match_id, starts_at, games_total, games_remaining, is_active, reason, athletes(full_name, surname), staff_members(full_name, surname)")
      .eq("scope_edition_id", editionId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    setSuspensions(data ?? []);
    setLoadingSuspensions(false);
  }

  async function loadAwards(editionId: string) {
    setLoadingAwards(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("edition_awards")
      .select("id, award_type, athlete_id, staff_member_id, winning_team_id, athletes(id, full_name, surname, photo_url), staff_members(id, full_name, surname), teams:teams!edition_awards_winning_team_id_fkey(id, full_name, abbreviation, logo_url)")
      .eq("edition_id", editionId).order("award_type");
    setAwards(data ?? []);
    setLoadingAwards(false);
  }

  async function loadMarkers(phaseId: string) {
    if (!phaseId) return;
    setLoadingMarkers(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("table_markers")
      .select("*")
      .eq("phase_id", phaseId)
      .order("display_order");
    setMarkers((data ?? []) as TableMarker[]);
    setLoadingMarkers(false);
  }

  async function loadEditionAthletes(editionId: string) {
    const supabase = createClient();
    const { data: etData } = await supabase.from("edition_teams").select("id").eq("edition_id", editionId);
    const editionTeamIds = (etData ?? []).map((e: any) => e.id);
    if (editionTeamIds.length === 0) { setEditionAthletes([]); setEditionStaff([]); return; }
    const [{ data: athleteData }, { data: staffData }] = await Promise.all([
      supabase.from("edition_roster_entries")
        .select("athlete_id, edition_team_id, athletes(id, full_name, surname), edition_teams(team_id, teams(full_name))")
        .eq("member_type", "athlete").eq("status", "approved")
        .in("edition_team_id", editionTeamIds),
      supabase.from("edition_roster_entries")
        .select("staff_member_id, edition_team_id, staff_members(id, full_name, surname), edition_teams(team_id, teams(full_name))")
        .eq("member_type", "staff").eq("status", "approved")
        .in("edition_team_id", editionTeamIds),
    ]);
    setEditionAthletes(athleteData ?? []);
    setEditionStaff(staffData ?? []);
  }

  useEffect(() => {
    if (selectedEditionId) {
      loadEditionData(selectedEditionId);
      loadAwards(selectedEditionId);
      loadEditionAthletes(selectedEditionId);
      loadSuspensions(selectedEditionId);
      loadYellowAlerts(selectedEditionId);
    }
  }, [selectedEditionId, loadEditionData]);

  useEffect(() => {
    if (selectedPhaseId) void loadMarkers(selectedPhaseId);
    else setMarkers([]);
  }, [selectedPhaseId]);

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
        id: "id" in result ? result.id : crypto.randomUUID(),
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
    if ("deactivated" in result && result.deactivated) {
      toast("success", "Equipe desativada. Ela possui atletas ou partidas vinculadas e não pôde ser removida completamente.");
      setEditionTeams(prev => prev.map(et => et.id === editionTeamId ? { ...et, is_active: false } as any : et));
      return;
    }
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
      // Fase classificatória: usa display_order da rodada
      key = m.rounds?.custom_label ?? m.rounds?.name ?? "Sem rodada";
      const roundObj = rounds.find(r => (r.custom_label ?? r.name) === key && r.phase_id === m.phases?.id);
      order = roundObj?.display_order ?? 0;
    } else if (m.matchup_id) {
      // Fase eliminatória: usa display_order da rodada pelo round_label
      const mu = matchups.find(mu => mu.id === m.matchup_id);
      key = mu?.round_label ?? m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
      const roundObj = rounds.find(r => (r.custom_label ?? r.name) === key && r.phase_id === m.phases?.id);
      order = roundObj?.display_order ?? mu?.display_order ?? 0;
    } else {
      key = m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
    }
    if (!filteredMatchesByRound[key]) filteredMatchesByRound[key] = { label: key, matches: [], order };
    filteredMatchesByRound[key].matches.push(m);
  });

  const athleteScorers = scorers.filter((s: Scorer) => s.athlete_id && s.athletes);
  const topScorers = [...athleteScorers].filter(s => (s.goals ?? 0) > 0).sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
  const topAssists = [...athleteScorers].filter(s => (s.assists ?? 0) > 0).sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0));
  const topYellow = [...athleteScorers].filter(s => (s.yellow_cards ?? 0) > 0).sort((a, b) => (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0));
  const topRed = [...athleteScorers].filter(s => (s.red_cards ?? 0) > 0).sort((a, b) => (b.red_cards ?? 0) - (a.red_cards ?? 0));

  // Para a aba Jogos: fases em ordem decrescente de display_order (maior número = mais recente = primeiro)
  const sortedPhases = [...phases].sort((a, b) => (b.display_order ?? 0) - (a.display_order ?? 0));

  // ── Renderização da classificação por tipo de fase ──
  function renderClassificacao() {
    if (!selectedPhase) {
      return <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma fase disponível.</p>;
    }
  
    const isClassif = selectedPhase.phase_type === "round_robin" || selectedPhase.phase_type === "group_stage";
    const activeMarkers: TableMarker[] = (
      standingsMode === "edit_markers"
        ? editingMarkers.filter(m => m.description?.trim() && m.color_hex)
        : markers
    ).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    function startEditMarkers() {
      setStandingsMode("edit_markers");
      setStandingsMenuOpen(false);
      setEditingMarkers(
        markers.length > 0
          ? markers.map(m => ({ ...m }))
          : [{
            id: `new-${Date.now()}`,
            description: "",
            color_hex: "#BFF205",
            show_background: true,
            position_from: 1,
            position_to: 2,
            display_order: 0,
          }],
      );
    }

    async function handleSaveMarkers() {
      if (!selectedPhaseId) return;
      const valid = editingMarkers
        .map((m, i) => ({
          ...m,
          description: m.description?.trim() ?? "",
          position_from: Math.max(1, Number(m.position_from) || 1),
          position_to: Math.max(1, Number(m.position_to) || 1),
          display_order: i,
        }))
        .filter(m => m.description && m.color_hex);

      for (const m of valid) {
        if (m.position_to < m.position_from) {
          toast("error", `Em "${m.description}", a posição final deve ser maior ou igual à inicial.`);
          return;
        }
      }

      setSavingMarkers(true);
      const supabase = createClient();
      const { error: delError } = await supabase.from("table_markers").delete().eq("phase_id", selectedPhaseId);
      if (delError) {
        setSavingMarkers(false);
        toast("error", delError.message);
        return;
      }
      if (valid.length > 0) {
        const { error: insError } = await supabase.from("table_markers").insert(
          valid.map(m => ({
            phase_id: selectedPhaseId,
            description: m.description,
            color_hex: m.color_hex.startsWith("#") ? m.color_hex : `#${m.color_hex}`,
            show_background: m.show_background ?? true,
            position_from: m.position_from,
            position_to: m.position_to,
            display_order: m.display_order,
          })),
        );
        if (insError) {
          setSavingMarkers(false);
          toast("error", insError.message);
          return;
        }
      }
      await loadMarkers(selectedPhaseId);
      setSavingMarkers(false);
      setStandingsMode("view");
      setEditingMarkers([]);
      toast("success", "Marcações salvas.");
    }

    function StandingsMarkersLegend() {
      if (activeMarkers.length === 0 || standingsMode === "edit_markers") return null;
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 18px", borderTop: "1px solid var(--color-border)" }}>
          {activeMarkers.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: m.color_hex, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>
                {m.description}
                <span style={{ opacity: 0.55 }}> · {m.position_from}º–{m.position_to}º</span>
              </span>
            </div>
          ))}
        </div>
      );
    }

    // ── Tabela base ────────────────────────────────────────────────────────
    function StandingsTable({ rows, highlightTop = 4, showActions = false }: {
      rows: any[]; highlightTop?: number; showActions?: boolean;
    }) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["#", "Equipe", "J", "V", "E", "D", "GP", "GC", "SG", "PTS"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{h}</th>
                ))}
                {standingsMode === "edit_points" && (
                  <>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ color: "#BFF205" }}>+PTS</th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ color: "var(--color-danger)" }}>-PTS</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, idx: number) => {
                const awarded = editedPoints[row.team_id]?.awarded ?? 0;
                const deducted = editedPoints[row.team_id]?.deducted ?? 0;
                const effectivePts = (row.points ?? 0) + awarded - deducted;
                const rank = idx + 1;
                const rankMarker = getMarkerForRank(activeMarkers, rank);
                const useLegacyHighlight = activeMarkers.length === 0 && idx < highlightTop;
                return (
                  <tr key={row.team_id}
                    style={{
                      borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                      backgroundColor: rankMarker?.show_background
                        ? hexToRgba(rankMarker.color_hex, 0.1)
                        : "transparent",
                      boxShadow: rankMarker ? `inset 3px 0 0 ${rankMarker.color_hex}` : undefined,
                      transition: "background 0.1s",
                    }}
                    className="hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: rankMarker?.color_hex ?? (useLegacyHighlight ? "var(--color-brand)" : "var(--color-text-secondary)") }}>{rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.teams?.logo_url
                          ? <img src={row.teams.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                          : <div className="h-5 w-5 rounded" style={{ backgroundColor: "var(--color-border)" }} />}
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
                    <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: "var(--color-brand)" }}>
                      {effectivePts}
                      {(awarded > 0 || deducted > 0) && (
                        <span style={{ fontSize: 9, marginLeft: 4, color: "rgba(191,242,5,0.5)" }}>
                          {awarded > 0 ? `+${awarded}` : ""}{deducted > 0 ? `-${deducted}` : ""}
                        </span>
                      )}
                    </td>
                    {standingsMode === "edit_points" && (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="0"
                            value={editedPoints[row.team_id]?.awarded ?? 0}
                            onChange={e => setEditedPoints(prev => ({ ...prev, [row.team_id]: { awarded: Number(e.target.value), deducted: prev[row.team_id]?.deducted ?? 0 } }))}
                            style={{ width: 52, padding: "4px 8px", backgroundColor: "rgba(191,242,5,0.07)", border: "1px solid rgba(191,242,5,0.25)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "#BFF205", outline: "none", textAlign: "center" as const }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="0"
                            value={editedPoints[row.team_id]?.deducted ?? 0}
                            onChange={e => setEditedPoints(prev => ({ ...prev, [row.team_id]: { awarded: prev[row.team_id]?.awarded ?? 0, deducted: Number(e.target.value) } }))}
                            style={{ width: 52, padding: "4px 8px", backgroundColor: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-danger)", outline: "none", textAlign: "center" as const }}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  
    // ── Barra de ações ────────────────────────────────────────────────────
    async function handleSavePoints(rows: any[]) {
      setSavingStandings(true);
      const adjustments = Object.entries(editedPoints)
        .filter(([, v]) => v.awarded > 0 || v.deducted > 0)
        .map(([teamId, { awarded, deducted }]) => {
          const editionTeam = editionTeams.find(et => et.team_id === teamId);
          return { editionTeamId: editionTeam?.id, awarded, deducted };
        })
        .filter((a): a is { editionTeamId: string; awarded: number; deducted: number } => !!a.editionTeamId);
      const result = await salvarAjustesPontosClassificacao(selectedEditionId, adjustments);
      setSavingStandings(false);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      setStandingsMode("view");
      setEditedPoints({});
      await loadEditionData(selectedEditionId);
      toast("success", "Pontos atualizados.");
    }
  
    async function handleSaveOrder(rows: any[]) {
      if (reorderedTeams.length === 0) { setStandingsMode("view"); return; }
      setSavingStandings(true);
      const supabase = createClient();
      const updates = reorderedTeams.map((teamId, idx) =>
        supabase
          .from("edition_teams")
          .update({ display_order: idx + 1 })
          .eq("edition_id", selectedEditionId)
          .eq("team_id", teamId)
      );
      await Promise.all(updates);
      setSavingStandings(false);
      setStandingsMode("view");
      setReorderedTeams([]);
      await loadEditionData(selectedEditionId);
      toast("success", "Ordem salva.");
    }
  
    // ── Header com botão Gerenciar ────────────────────────────────────────
    function StandingsHeader({ rows }: { rows: any[] }) {
      const isEditing = standingsMode !== "view";
      const saving = standingsMode === "edit_markers" ? savingMarkers : savingStandings;
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: standingsMode === "edit_markers" ? "none" : "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--color-text-primary)" }}>
            {standingsMode === "edit_markers" ? "Marcações" : "Classificações"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isEditing && (
              <>
                <button type="button"
                  onClick={() => {
                    setStandingsMode("view");
                    setEditedPoints({});
                    setReorderedTeams([]);
                    setEditingMarkers([]);
                  }}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button type="button"
                  disabled={saving}
                  onClick={() => {
                    if (standingsMode === "edit_points") void handleSavePoints(rows);
                    else void handleSaveMarkers();
                  }}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "none", backgroundColor: "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </>
            )}
            {!isEditing && (
              <div style={{ position: "relative" }}>
                <button type="button"
                  onClick={() => setStandingsMenuOpen(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>
                  Gerenciar
                  <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.5 }}>⋮</span>
                </button>
                {standingsMenuOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setStandingsMenuOpen(false)} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, minWidth: 220, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", overflow: "hidden" }}>
                      {[
                        { icon: "◧", label: "Gerenciar marcações", action: startEditMarkers },
                        { icon: "✎", label: "Editar pontos", action: () => { setStandingsMode("edit_points"); setStandingsMenuOpen(false); setEditedPoints({}); } },
                        { icon: "↺", label: "Recalcular a classificação", action: () => { setStandingsMenuOpen(false); setStandingsConfirmRecalc(true); }, danger: false },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={item.action}
                          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)", backgroundColor: "transparent", border: "none", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", textAlign: "left" as const, transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                          <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: 0.6 }}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  
    // ── Modal de confirmação de recálculo ────────────────────────────────
    const RecalcConfirmModal = () => (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.78)", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 360, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Recalcular a classificação?</p>
            <button onClick={() => setStandingsConfirmRecalc(false)}
              style={{ width: 24, height: 24, borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <div style={{ padding: "0 20px 18px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              Ao fazer isso, a ordem da classificação será redefinida para o padrão calculado pelas partidas.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "0 20px 18px", justifyContent: "flex-end" }}>
            <button onClick={() => setStandingsConfirmRecalc(false)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={async () => {
              setStandingsConfirmRecalc(false);
              const r = await recalcularEstatisticasEdicao(selectedEditionId);
              if ("error" in r) { toast("error", r.error); return; }
              toast("success", "Classificação recalculada.");
              await loadEditionData(selectedEditionId);
            }}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer" }}>
              Recalcular
            </button>
          </div>
        </div>
      </div>
    );
  
    // ── Fases de grupos ───────────────────────────────────────────────────
    if (selectedPhase.phase_type === "group_stage") {
      const phaseGroups = groups.filter(g => g.phase_id === selectedPhaseId);
      if (phaseGroups.length === 0) {
        return <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum grupo cadastrado nesta fase.</p>;
      }
      return (
        <>
          {standingsConfirmRecalc && <RecalcConfirmModal />}
          <div className="space-y-6">
            {phaseGroups.map(group => {
              const teamIdsInGroup = groupTeams.filter(gt => gt.group_id === group.id).map(gt => gt.edition_team_id);
              const editionTeamIds = editionTeams.filter(et => teamIdsInGroup.includes(et.id)).map(et => et.team_id);
              const groupRows = standings
                .filter(s => editionTeamIds.includes(s.team_id))
                .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.goals_scored ?? 0) - (a.goals_scored ?? 0));
              return (
                <div key={group.id}>
                  <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>
                    {group.custom_label ?? group.name}
                  </p>
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                    <StandingsHeader rows={groupRows} />
                    <StandingsMarkersEditor visible={standingsMode === "edit_markers"} markers={editingMarkers} onChange={setEditingMarkers} />
                    {groupRows.length === 0
                      ? <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Sem dados de classificação.</p>
                      : <StandingsTable rows={groupRows} highlightTop={2} />}
                    <StandingsMarkersLegend />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }
  
    // ── Pontos corridos ───────────────────────────────────────────────────
    if (selectedPhase.phase_type === "round_robin") {
      const rows = standings;
      return (
        <>
          {standingsConfirmRecalc && <RecalcConfirmModal />}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            <StandingsHeader rows={rows} />
            <StandingsMarkersEditor visible={standingsMode === "edit_markers"} markers={editingMarkers} onChange={setEditingMarkers} />
            {rows.length === 0
              ? <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum dado de classificação disponível.</p>
              : <StandingsTable rows={rows} highlightTop={4} />}
            <StandingsMarkersLegend />
          </div>
        </>
      );
    }
  
    // ── Mata-mata / conferência (sem gerenciar) ───────────────────────────
    const phaseMatchups = matchups.filter(m => m.phase_id === selectedPhaseId);
    const phaseRounds = (rounds as Round[]).filter(r => r.phase_id === selectedPhaseId);
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button type="button"
            onClick={() => { setMatchFilterPhaseId(selectedPhaseId); setShowNovoConfronto(true); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(191,242,5,0.25)", backgroundColor: "rgba(191,242,5,0.06)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.12)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.06)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.25)"; }}>
            <Plus size={13} strokeWidth={2.5} /> Novo confronto
          </button>
        </div>
        <BracketView
          phaseId={selectedPhaseId}
          matchups={phaseMatchups}
          phaseRounds={phaseRounds}
          phaseType={selectedPhase.phase_type as "knockout" | "conference"}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", position: "relative", overflow: "hidden" }}>
        {/* Degradê com a cor da competição */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: competition.primary_color
            ? `linear-gradient(135deg, ${competition.primary_color}22 0%, transparent 50%)`
            : `linear-gradient(135deg, rgba(191,242,5,0.08) 0%, transparent 50%)`,
        }} />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--color-surface)", opacity: 0.85, pointerEvents: "none" }} />

        <div className="px-8 pt-5 pb-0" style={{ position: "relative", zIndex: 1 }}>
          <Breadcrumb items={[{ label: "Competições", href: "/competicoes" }, { label: competition.full_name ?? "Competição" }]} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {/* Logo */}
            {competition.logo_url ? (
              <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", border: `1px solid ${competition.primary_color ? competition.primary_color + "40" : "var(--color-border)"}`, backgroundColor: "rgba(255,255,255,0.04)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={competition.logo_url} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
              </div>
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 12, border: "1px solid var(--color-border)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: competition.primary_color ?? "#BFF205", flexShrink: 0 }}>
                {competition.full_name?.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Pill de edição */}
              <div style={{ position: "relative", display: "inline-block", marginBottom: 4 }}>
                <button type="button" onClick={() => setShowEditionDropdown(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; e.currentTarget.style.color = "#BFF205"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                  {selectedEdition ? editionLabel(selectedEdition) : "Selecionar edição"}
                  <ChevronDown size={11} />
                </button>

                {showEditionDropdown && (
                  <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 50, minWidth: 200, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", overflow: "hidden" }}>
                    {sortedEditionsForDropdown.map((e, idx) => (
                      <button key={e.id} type="button" onClick={() => {
                        setSelectedEditionId(e.id); setShowEditionDropdown(false);
                        const params = new URLSearchParams(searchParams.toString()); params.set("edicao", e.id);
                        router.replace(`?${params.toString()}`, { scroll: false });
                      }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: e.id === selectedEditionId ? "#BFF205" : "var(--color-text-primary)", backgroundColor: e.id === selectedEditionId ? "rgba(191,242,5,0.07)" : "transparent", border: "none", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", textAlign: "left" as const, transition: "background 0.1s" }}
                        onMouseEnter={ev => { if (e.id !== selectedEditionId) ev.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={ev => { ev.currentTarget.style.backgroundColor = e.id === selectedEditionId ? "rgba(191,242,5,0.07)" : "transparent"; }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                          {e.status === "ongoing" && (
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%", backgroundColor: "#BFF205", flexShrink: 0,
                              boxShadow: "0 0 6px rgba(191,242,5,0.6)",
                            }} />
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {editionLabel(e)}
                          </span>
                          {e.status === "ongoing" && (
                            <span style={{
                              fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", flexShrink: 0,
                              padding: "2px 6px", borderRadius: 4,
                              backgroundColor: "rgba(191,242,5,0.12)", color: "#BFF205",
                              border: "1px solid rgba(191,242,5,0.25)",
                            }}>
                              EM ANDAMENTO
                            </span>
                          )}
                        </span>
                        {e.id === selectedEditionId && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nome da competição */}
              <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "0.02em", lineHeight: 1.1, margin: 0 }}>
                {competition.full_name}
              </h1>
            </div>
          </div>

          {/* Faixa colorida na borda inferior do header */}
          {competition.primary_color && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${competition.primary_color}80 0%, transparent 60%)`, pointerEvents: "none" }} />
          )}

          {/* Abas */}
          <div style={{ display: "flex", gap: 0 }}>
          {[
              { key: "jogos", label: "JOGOS" },
              { key: "classificacao", label: "CLASSIFICAÇÃO" },
              { key: "estatisticas", label: "ESTATÍSTICAS" },
              { key: "competicao", label: "COMPETIÇÃO" },
              { key: "configuracoes", label: "CONFIGURAÇÕES" },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => { setActiveTab(tab.key as any); updateTab("aba", tab.key); }}
                style={{ padding: "11px 18px", border: "none", borderBottom: `2px solid ${activeTab === tab.key ? (competition.primary_color ?? "var(--color-brand)") : "transparent"}`, backgroundColor: "transparent", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: activeTab === tab.key ? (competition.primary_color ?? "var(--color-brand)") : "#666", cursor: "pointer", transition: "color 0.12s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal nova partida */}
      {showNewMatch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.78)", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewMatch(false); }}>
          <div style={{ width: "100%", maxWidth: 440, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

            {/* Header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0 }}>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>Nova partida</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, marginTop: 2 }}>
                  {phases.find(p => p.id === newMatchPhaseId)?.custom_label ?? phases.find(p => p.id === newMatchPhaseId)?.full_name ?? "Selecione a fase"}
                </p>
              </div>
              <button type="button" onClick={() => setShowNewMatch(false)}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.4)"; e.currentTarget.style.color = "#BFF205"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>×</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Fase — só se houver mais de uma classificatória */}
              {phases.filter(p => isClassificatory(p.phase_type)).length > 1 && (
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Fase</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
                    {phases.filter(p => isClassificatory(p.phase_type)).map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setNewMatchPhaseId(p.id); setNewMatchRoundId(""); setNewMatchTeamA(""); setNewMatchTeamB(""); loadPhaseTeams(p.id); }}
                        style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${newMatchPhaseId === p.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: newMatchPhaseId === p.id ? "rgba(191,242,5,0.08)" : "transparent", color: newMatchPhaseId === p.id ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                        {p.custom_label ?? p.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {newMatchPhaseId && (
                <>
                  {/* Data + Horário */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Data</span>
                      <input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)}
                        style={{ marginTop: 5, width: "100%", padding: "8px 10px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)", outline: "none", colorScheme: "dark" as any }} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Horário</span>
                      <input type="time" value={newMatchTime} onChange={e => setNewMatchTime(e.target.value)}
                        style={{ marginTop: 5, width: "100%", padding: "8px 10px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)", outline: "none", colorScheme: "dark" as any }} />
                    </div>
                  </div>

                  {/* Rodada */}
                  {roundsForSelectedPhase.length > 0 && (
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Rodada</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
                        {roundsForSelectedPhase.map(r => (
                          <button key={r.id} type="button" onClick={() => setNewMatchRoundId(r.id)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${newMatchRoundId === r.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: newMatchRoundId === r.id ? "rgba(191,242,5,0.08)" : "transparent", color: newMatchRoundId === r.id ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                            {r.custom_label ?? r.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Local */}
                  {venues.length > 0 && (
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Local</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
                        <button type="button" onClick={() => setNewMatchVenueId("")}
                          style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${!newMatchVenueId ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: !newMatchVenueId ? "rgba(191,242,5,0.08)" : "transparent", color: !newMatchVenueId ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                          Nenhum
                        </button>
                        {venues.map((v: any) => (
                          <button key={v.id} type="button" onClick={() => setNewMatchVenueId(v.id)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${newMatchVenueId === v.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: newMatchVenueId === v.id ? "rgba(191,242,5,0.08)" : "transparent", color: newMatchVenueId === v.id ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                            {v.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Times — grid de logos */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Times *</span>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(191,242,5,0.6)", marginBottom: 6 }}>MANDANTE (A)</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 5 }}>
                          {teamsForSelectedPhase.map(t => (
                            <div key={t.id} onClick={() => setNewMatchTeamA(t.id)}
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 4px", borderRadius: 8, border: `1px solid ${newMatchTeamA === t.id ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`, backgroundColor: newMatchTeamA === t.id ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.1s", opacity: t.id === newMatchTeamB ? 0.3 : 1 }}>
                              {t.logo_url
                                ? <img src={t.logo_url} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
                                : <div style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{t.abbreviation?.slice(0,2) ?? "—"}</span></div>
                              }
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: newMatchTeamA === t.id ? "#BFF205" : "rgba(255,255,255,0.3)", textAlign: "center" }}>
                                {t.abbreviation ?? t.full_name?.slice(0,3)?.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "rgba(255,255,255,0.15)", paddingTop: 24, flexShrink: 0 }}>×</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>VISITANTE (B)</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 5 }}>
                          {teamsForSelectedPhase.filter(t => t.id !== newMatchTeamA).map(t => (
                            <div key={t.id} onClick={() => setNewMatchTeamB(t.id)}
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 4px", borderRadius: 8, border: `1px solid ${newMatchTeamB === t.id ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`, backgroundColor: newMatchTeamB === t.id ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.1s" }}>
                              {t.logo_url
                                ? <img src={t.logo_url} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
                                : <div style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{t.abbreviation?.slice(0,2) ?? "—"}</span></div>
                              }
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: newMatchTeamB === t.id ? "#BFF205" : "rgba(255,255,255,0.3)", textAlign: "center" }}>
                                {t.abbreviation ?? t.full_name?.slice(0,3)?.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adicionar outra */}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <div onClick={() => setNewMatchAddAnother(v => !v)}
                      style={{ width: 18, height: 18, borderRadius: 5, border: `1px solid ${newMatchAddAnother ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.15)"}`, backgroundColor: newMatchAddAnother ? "rgba(191,242,5,0.1)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
                      {newMatchAddAnother && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Adicionar outra com mesma data</span>
                  </label>
                </>
              )}

              {newMatchError && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4444", backgroundColor: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
                  {newMatchError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 8, padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <button type="button" onClick={() => setShowNewMatch(false)}
                style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleCreateMatch}
                disabled={creatingMatch || !newMatchPhaseId || !newMatchTeamA || !newMatchTeamB}
                style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: creatingMatch || !newMatchPhaseId || !newMatchTeamA || !newMatchTeamB ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: creatingMatch || !newMatchPhaseId || !newMatchTeamA || !newMatchTeamB ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
                {creatingMatch ? "Criando…" : "Criar partida"}
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
              <LabSelect
                value={newEditionSeasonId}
                onChange={setNewEditionSeasonId}
                placeholder="Selecione…"
                options={seasons.map((s) => ({ value: s.id, label: s.name }))}
              />
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
                setJobsSubTab("partidas");
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
            setNewMatchPhaseId(matchFilterPhaseId || (phases.find(p => isClassificatory(p.phase_type))?.id ?? ""));
            if (matchFilterPhaseId) loadPhaseTeams(matchFilterPhaseId || (phases.find(p => isClassificatory(p.phase_type))?.id ?? ""));
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
          { key: "partidas", label: "PARTIDAS" },
          { key: "confrontos", label: "CONFRONTOS" },
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
                .map(group => ({
                  ...group,
                  matches: [...group.matches].sort((a, b) => {
                    const da = a.match_date ?? "9999";
                    const db = b.match_date ?? "9999";
                    if (da !== db) return da.localeCompare(db);
                    const ta = a.match_time ?? "00:00";
                    const tb = b.match_time ?? "00:00";
                    return ta.localeCompare(tb);
                  }),
                }))
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
            <div className="mb-6 flex items-center justify-end gap-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <button type="button"
                onClick={async () => {
                  const r = await recalcularEstatisticasEdicao(selectedEditionId);
                  if ("error" in r) { toast("error", r.error); return; }
                  toast("success", "Estatísticas atualizadas.");
                  await loadEditionData(selectedEditionId);
                }}
                style={{ marginBottom: 1, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(191,242,5,0.25)", backgroundColor: "rgba(191,242,5,0.06)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.12)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.06)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.25)"; }}>
                ↻ Atualizar dados
              </button>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <StatRanking title="Artilharia" data={topScorers} valueKey="goals" valueLabel="gols" allScorers={athleteScorers} phases={phases} rounds={rounds} editionTeams={editionTeams} emptyMessage="Nenhum gol registrado." />
              <StatRanking title="Assistências" data={topAssists} valueKey="assists" valueLabel="assist." allScorers={athleteScorers} phases={phases} rounds={rounds} editionTeams={editionTeams} emptyMessage="Nenhuma assistência registrada." />
              <StatRanking title="Cartões Amarelos" data={topYellow} valueKey="yellow_cards" valueLabel="amarelos" valueColor="#F2C005" allScorers={athleteScorers} phases={phases} rounds={rounds} editionTeams={editionTeams} emptyMessage="Nenhum cartão amarelo registrado." />
              <StatRanking title="Cartões Vermelhos" data={topRed} valueKey="red_cards" valueLabel="vermelhos" valueColor="var(--color-danger)" allScorers={athleteScorers} phases={phases} rounds={rounds} editionTeams={editionTeams} emptyMessage="Nenhum cartão vermelho registrado." />
            </div>
          </div>
        )}

        {/* ABA COMPETIÇÃO */}
        {activeTab === "competicao" && (
          <div>
            <div className="mb-6 flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
            {[{ key: "equipes", label: "EQUIPES" }, { key: "fases", label: "FASES" }].map(sub => (
                <button key={sub.key} type="button" onClick={() => { setActiveCompTab(sub.key as any); updateTab("comp", sub.key); }}
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
                        <div key={et.id} className="group relative flex items-center gap-3 px-4 py-3 transition-all duration-150"
                          style={{
                            borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                            opacity: isInactive ? 0.45 : 0.75,
                            cursor: "pointer",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = isInactive ? "0.45" : "0.75")}
                          onClick={() => {
                            if (!et.team_id || !selectedEditionId) return;
                            router.push(`/competicoes/${competition.id}/equipes/${et.team_id}?edicao=${selectedEditionId}`);
                          }}>

                          {/* Logo */}
                          {et.teams?.logo_url ? (
                            <img src={et.teams.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain shrink-0" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                              {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                            </div>
                          )}

                          {/* Sigla */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                            <p className="font-mono text-sm font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>
                              {et.teams?.abbreviation?.toUpperCase() ?? "—"}
                            </p>
                          </div>

                          {/* Nome */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                                {((et.teams as any)?.short_name ?? et.teams?.full_name ?? "—")}
                              </p>
                              {isInactive && (
                                <span className="font-mono text-xs rounded px-1.5 py-0.5 shrink-0"
                                  style={{ backgroundColor: "rgba(242,192,5,0.15)", color: "#F2C005" }}>
                                  Desativada
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                              {et.teams?.full_name ?? "—"}
                            </p>
                          </div>

                          {/* Ações — só aparecem no hover, param propagação do click */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={e => e.stopPropagation()}>
                            <HubActionButton
                              icon={<Users size={14} strokeWidth={2.5} />}
                              label="Elenco"
                              onClick={e => { e.stopPropagation(); router.push(`/competicoes/${competition.id}/equipes/${et.team_id}?edicao=${selectedEditionId}`); }}
                              color="var(--color-brand)"
                            />
                            {isInactive ? (
                              <HubActionButton
                                icon={<RotateCcw size={14} strokeWidth={2.5} />}
                                label="Reativar"
                                onClick={e => { e.stopPropagation(); handleReativarEquipeHub(et.id); }}
                                color="var(--color-brand)"
                              />
                            ) : (
                              <HubActionButton
                                icon={<Ban size={14} strokeWidth={2.5} />}
                                label="Desativar"
                                onClick={e => { e.stopPropagation(); handleDesativarEquipeHub(et.id); }}
                                color="#F2C005"
                              />
                            )}
                            <HubActionButton
                              icon={<Trash2 size={14} strokeWidth={2.5} />}
                              label="Remover"
                              onClick={e => { e.stopPropagation(); handleRemoverEquipeHub(et.id); }}
                              color="var(--color-danger)"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                  {/* Sem Clube — sempre por último */}
                  {editionTeams.filter(et => et.is_free_agent_pool).map(et => (
                    <div key={et.id}
                      className="group relative flex items-center gap-3 px-4 py-3 transition-all duration-150"
                      style={{ borderTop: "1px solid var(--color-border)", opacity: 0.6, cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                      onClick={() => router.push(`/competicoes/${competition.id}/equipes/${et.team_id}?edicao=${selectedEditionId}`)}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                        style={{ borderColor: "var(--color-border)", borderStyle: "dashed" }}>
                        <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>SC</span>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <p className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>—</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>Sem Clube</p>
                        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>Atletas sem equipe</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={e => e.stopPropagation()}>
                        <HubActionButton
                          icon={<Users size={14} strokeWidth={2.5} />}
                          label="Ver elenco"
                          onClick={e => { e.stopPropagation(); router.push(`/competicoes/${competition.id}/equipes/${et.team_id}?edicao=${selectedEditionId}`); }}
                          color="var(--color-brand)"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal adicionar equipe */}
                {showAddTeamModal && (
                  <AddTeamModal
                    allTeams={allTeams}
                    editionTeams={editionTeams}
                    addingTeamId={addingTeamId}
                    onAdd={handleAdicionarEquipeHub}
                    onClose={() => { setShowAddTeamModal(false); setTeamSearchQuery(""); }}
                    inputClass={inputClass}
                    inputStyle={inputStyle}
                  />
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
                { key: "inscricoes", label: "INSCRIÇÕES" },
                { key: "ranking", label: "RANKING" },
                { key: "suspensoes", label: "SUSPENSÕES" },
                { key: "premiacoes", label: "PREMIAÇÕES" },
                { key: "detalhes", label: "DETALHES" },
              ].map(sub => (
                <button key={sub.key} type="button" onClick={() => { setActiveConfigTab(sub.key as any); updateTab("config", sub.key); }}
                  className="border-b-2 pb-3 font-mono text-xs transition-colors"
                  style={{ borderColor: activeConfigTab === sub.key ? "var(--color-brand)" : "transparent", color: activeConfigTab === sub.key ? "var(--color-brand)" : "#A6A6A6" }}>
                  {sub.label}
                </button>
              ))}
            </div>
            {activeConfigTab === "gerais" && (
              <EdicaoConfigTab selectedEditionId={selectedEditionId} selectedEditionName={selectedEdition ? editionLabel(selectedEdition) : ""} inputClass={inputClass} inputStyle={inputStyle} />
            )}
            {activeConfigTab === "premiacoes" && (
              <PremiacoesTab
              awards={awards}
              loadingAwards={loadingAwards}
              editionTeams={editionTeams}
              editionAthletes={editionAthletes}
              editionStaff={editionStaff}
              onRemover={handleRemoverPremiacao}
              onRefreshAwards={loadAwards}
              selectedEditionId={selectedEditionId}
            />
            )}

            {activeConfigTab === "inscricoes" && (
              <InscricoesConfigTab
                selectedEditionId={selectedEditionId}
                inputClass={inputClass}
                inputStyle={inputStyle}
              />
            )}
            {activeConfigTab === "ranking" && (
              <RankingConfigTab
                selectedEditionId={selectedEditionId}
                inputClass={inputClass}
                inputStyle={inputStyle}
              />
            )}
            {activeConfigTab === "suspensoes" && (
          <div>
            {/* Alertas de acúmulo de amarelos */}
            {!loadingAlerts && yellowAlerts.filter(a => !dismissedAlerts.has(a.athleteId)).length > 0 && (
              <div className="mb-5 rounded-xl border overflow-hidden"
                style={{ borderColor: "rgba(250,180,0,0.3)", backgroundColor: "rgba(250,180,0,0.06)" }}>
                <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "rgba(250,180,0,0.2)" }}>
                  <AlertTriangle size={14} style={{ color: "rgb(250,180,0)" }} />
                  <p className="font-mono text-xs font-bold" style={{ color: "rgb(250,180,0)" }}>
                    ATLETAS NO LIMITE DE FALTAS — sugestão de suspensão
                  </p>
                </div>
                {yellowAlerts.filter(a => !dismissedAlerts.has(a.athleteId)).map((alert, idx) => (
                  <div key={alert.athleteId} className="flex items-center gap-4 px-5 py-3"
                    style={{ borderTop: idx > 0 ? "1px solid rgba(250,180,0,0.15)" : "none" }}>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {alert.athleteName}
                      </span>
                      <span className="font-mono text-xs ml-2" style={{ color: "var(--color-text-secondary)" }}>
                        {alert.teamName}
                      </span>
                    </div>
                    <span className="font-mono text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: "rgba(250,180,0,0.15)", color: "rgb(250,180,0)" }}>
                      {alert.count}/{alert.threshold} faltas
                    </span>
                    <button type="button"
                      className="rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "rgb(250,180,0)", color: "#000" }}
                      onClick={() => {
                        // Pré-preencher o modal com esse atleta
                        const entry = editionAthletes.find((a: any) => a.athlete_id === alert.athleteId);
                        if (entry) setSuspTeamId(entry.edition_teams?.team_id ?? "");
                        setSuspMemberType("athlete");
                        setSuspAthleteId(alert.athleteId);
                        setSuspStartsAt(new Date().toISOString().split("T")[0]);
                        setSuspGamesTotal("1");
                        setSuspReason(`Acúmulo de faltas (${alert.count})`);
                        setShowSuspModal(true);
                      }}>
                      Criar suspensão
                    </button>
                    <button type="button"
                      onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.athleteId]))}
                      className="shrink-0 transition-opacity hover:opacity-60"
                      style={{ color: "var(--color-text-secondary)" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSuspActiveFilter("active")}
                  className="flex items-center gap-2 font-mono text-xs transition-colors"
                  style={{ color: suspActiveFilter === "active" ? "var(--color-brand)" : "#666" }}>
                  ATIVAS
                  <span className="rounded px-1.5 py-0.5 font-mono text-xs"
                    style={{ backgroundColor: suspActiveFilter === "active" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)", color: suspActiveFilter === "active" ? "var(--color-brand)" : "#555" }}>
                    {suspensions.filter(s => s.is_active).length}
                  </span>
                </button>
                <button type="button" onClick={() => setSuspActiveFilter("all")}
                  className="flex items-center gap-2 font-mono text-xs transition-colors"
                  style={{ color: suspActiveFilter === "all" ? "var(--color-brand)" : "#666" }}>
                  TODAS
                  <span className="rounded px-1.5 py-0.5 font-mono text-xs"
                    style={{ backgroundColor: suspActiveFilter === "all" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)", color: suspActiveFilter === "all" ? "var(--color-brand)" : "#555" }}>
                    {suspensions.length}
                  </span>
                </button>
              </div>
              <button type="button" onClick={() => setShowSuspModal(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-xs font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                <Plus size={13} strokeWidth={2.5} />
                Nova suspensão
              </button>
            </div>

            {/* Lista */}
            {loadingSuspensions ? (
              <p className="font-mono text-xs py-10 text-center" style={{ color: "#666" }}>Carregando…</p>
            ) : (() => {
              const displayed = suspensions.filter(s => suspActiveFilter === "all" || s.is_active);
              if (displayed.length === 0) return (
                <div className="flex flex-col items-center justify-center rounded-xl border py-14 gap-1"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {suspActiveFilter === "active" ? "Nenhuma suspensão ativa." : "Nenhuma suspensão registrada."}
                  </p>
                </div>
              );
              return (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  {displayed.map((s: any, idx: number) => {
                    const isEditing = suspEditingId === s.id;
                    const cumpridos = s.games_total - s.games_remaining;
                    const completa = s.games_remaining === 0;
                    const pct = s.games_total > 0 ? (cumpridos / s.games_total) * 100 : 0;
                    const athleteName = s.athletes
                      ? (s.athletes.surname ?? s.athletes.full_name)
                      : s.staff_members
                        ? (s.staff_members.surname ?? s.staff_members.full_name)
                        : "—";

                    if (isEditing) return (
                      <div key={s.id} className="px-5 py-4 space-y-3"
                        style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", backgroundColor: "var(--color-background)" }}>
                        <p className="font-mono text-xs font-bold" style={{ color: "var(--color-brand)" }}>{athleteName}</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="flex flex-col gap-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Início</span>
                            <input type="date" value={suspEditStartsAt} onChange={e => setSuspEditStartsAt(e.target.value)}
                              className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Total de jogos</span>
                            <input type="number" min={1} value={suspEditGamesTotal} onChange={e => setSuspEditGamesTotal(e.target.value)}
                              className={inputClass} style={inputStyle} />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Jogos restantes</span>
                            <input type="number" min={0} max={Number(suspEditGamesTotal)} value={suspEditGamesRemaining}
                              onChange={e => setSuspEditGamesRemaining(e.target.value)} className={inputClass} style={inputStyle} />
                          </label>
                          <label className="flex flex-col gap-1 sm:col-span-3">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Motivo</span>
                            <input type="text" value={suspEditReason} onChange={e => setSuspEditReason(e.target.value)}
                              className={inputClass} style={inputStyle} />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" disabled={suspSaving}
                            className="rounded-lg px-3 py-1.5 font-mono text-xs font-bold disabled:opacity-50"
                            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}
                            onClick={async () => {
                              setSuspSaving(true);
                              const fd = new FormData();
                              fd.append("starts_at", suspEditStartsAt);
                              fd.append("games_total", suspEditGamesTotal);
                              fd.append("games_remaining", suspEditGamesRemaining);
                              fd.append("reason", suspEditReason);
                              const result = await editarSuspensao(s.id, fd);
                              setSuspSaving(false);
                              if ("error" in result) { toast("error", result.error); return; }
                              toast("success", "Suspensão atualizada.");
                              setSuspensions(prev => prev.map(x => x.id === s.id ? {
                                ...x, starts_at: suspEditStartsAt,
                                games_total: Number(suspEditGamesTotal),
                                games_remaining: Math.min(Number(suspEditGamesRemaining), Number(suspEditGamesTotal)),
                                reason: suspEditReason,
                              } : x));
                              setSuspEditingId(null);
                            }}>
                            {suspSaving ? "Salvando…" : "Salvar"}
                          </button>
                          <button type="button" onClick={() => setSuspEditingId(null)}
                            className="rounded-lg border px-3 py-1.5 font-mono text-xs"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    );

                    return (
                      <div key={s.id} className="flex items-center gap-6 px-5 py-4 group"
                        style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: s.is_active ? 1 : 0.45 }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                            {athleteName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {new Date(s.starts_at + "T00:00:00").toLocaleDateString("pt-BR")}
                            </span>
                            {s.reason && (
                              <>
                                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>·</span>
                                <span className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{s.reason}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 w-32">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {cumpridos}/{s.games_total} jogos
                            </span>
                            {completa && <span className="font-mono text-xs" style={{ color: "var(--color-success)" }}>completa</span>}
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: completa ? "var(--color-success)" : "var(--color-brand)" }} />
                          </div>
                        </div>
                        <div className="shrink-0 w-12 text-center">
                          <p className="font-display text-xl font-bold"
                            style={{ color: s.games_remaining === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                            {s.games_remaining}
                          </p>
                          <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>rest.</p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button type="button"
                            className="rounded border px-2 py-1 font-mono text-xs"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                            onClick={() => {
                              setSuspEditingId(s.id);
                              setSuspEditStartsAt(s.starts_at);
                              setSuspEditGamesTotal(String(s.games_total));
                              setSuspEditGamesRemaining(String(s.games_remaining));
                              setSuspEditReason(s.reason ?? "");
                            }}>
                            Editar
                          </button>
                          {s.is_active && (
                            <button type="button" disabled={suspProcessing === s.id}
                              className="rounded border px-2 py-1 font-mono text-xs disabled:opacity-50"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}
                              onClick={async () => {
                                if (!confirm("Desativar esta suspensão?")) return;
                                setSuspProcessing(s.id);
                                const result = await desativarSuspensao(s.id);
                                setSuspProcessing(null);
                                if ("error" in result) { toast("error", result.error); return; }
                                toast("success", "Suspensão desativada.");
                                setSuspensions(prev => prev.map(x => x.id === s.id ? { ...x, is_active: false } : x));
                              }}>
                              {suspProcessing === s.id ? "…" : "Desativar"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Modal nova suspensão */}
            {showSuspModal && (() => {
              const teamsInEdition = editionTeams.filter(et => !et.is_free_agent_pool && et.teams != null);
              const membersForTeam = suspTeamId
                ? suspMemberType === "athlete"
                  ? editionAthletes.filter((a: any) => a.edition_teams?.team_id === suspTeamId)
                  : editionStaff.filter((s: any) => s.edition_teams?.team_id === suspTeamId)
                : [];
              const matchesForEdition = matches.filter(m =>
                m.status === "finished" || m.status === "ongoing" || m.match_date
              ).sort((a, b) => (b.match_date ?? "").localeCompare(a.match_date ?? ""));

              function resetSuspModal() {
                setSuspTeamId(""); setSuspMemberType("athlete"); setSuspAthleteId("");
                setSuspStaffId(""); setSuspOriginMatchId(""); setSuspGamesTotal("1");
                setSuspStartsAt(""); setSuspReason("");
              }

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
                  onClick={e => { if (e.target === e.currentTarget) { resetSuspModal(); setShowSuspModal(false); } }}>
                  <div className="w-full max-w-lg rounded-xl border shadow-xl"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>

                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
                      <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Nova suspensão</h2>
                      <button type="button" onClick={() => { resetSuspModal(); setShowSuspModal(false); }} style={{ color: "var(--color-text-secondary)" }}>
                        <X size={18} />
                      </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">

                      {/* Tipo de membro */}
                      <div className="flex gap-2">
                        {(["athlete", "staff"] as const).map(type => (
                          <button key={type} type="button"
                            onClick={() => { setSuspMemberType(type); setSuspAthleteId(""); setSuspStaffId(""); }}
                            className="flex-1 rounded-lg border py-2 font-mono text-xs font-bold transition-colors"
                            style={{
                              borderColor: suspMemberType === type ? "var(--color-brand)" : "var(--color-border)",
                              backgroundColor: suspMemberType === type ? "rgba(191,242,5,0.08)" : "transparent",
                              color: suspMemberType === type ? "var(--color-brand)" : "var(--color-text-secondary)",
                            }}>
                            {type === "athlete" ? "Atleta" : "Comissão técnica"}
                          </button>
                        ))}
                      </div>

                      {/* Equipe */}
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>EQUIPE *</span>
                        <LabSelect
                          value={suspTeamId}
                          onChange={(v) => { setSuspTeamId(v); setSuspAthleteId(""); setSuspStaffId(""); }}
                          placeholder="Selecione…"
                          options={teamsInEdition.map((et: any) => ({
                            value: et.team_id,
                            label: et.teams?.full_name ?? "—",
                          }))}
                        />
                      </label>

                      {/* Membro */}
                      {suspTeamId && (
                        <label className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
                            {suspMemberType === "athlete" ? "ATLETA *" : "MEMBRO *"}
                          </span>
                          <LabSelect
                            value={suspMemberType === "athlete" ? suspAthleteId : suspStaffId}
                            onChange={(v) => suspMemberType === "athlete" ? setSuspAthleteId(v) : setSuspStaffId(v)}
                            placeholder="Selecione…"
                            options={
                              membersForTeam.length === 0
                                ? [{ value: "", label: "Nenhum cadastrado", disabled: true }]
                                : suspMemberType === "athlete"
                                  ? membersForTeam.map((a: any) => ({
                                      value: a.athlete_id,
                                      label: a.athletes?.surname ?? a.athletes?.full_name ?? "—",
                                    }))
                                  : membersForTeam.map((s: any) => ({
                                      value: s.staff_member_id,
                                      label: s.staff_members?.surname ?? s.staff_members?.full_name ?? "—",
                                    }))
                            }
                          />
                        </label>
                      )}

                      {/* Partida de origem */}
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>PARTIDA DE ORIGEM</span>
                        <LabSelect
                          value={suspOriginMatchId}
                          onChange={setSuspOriginMatchId}
                          placeholder="Nenhuma / Manual"
                          options={matchesForEdition.map((m: any) => {
                            const teamA = m.teams_a?.abbreviation ?? m.teams_a?.full_name ?? "?";
                            const teamB = m.teams_b?.abbreviation ?? m.teams_b?.full_name ?? "?";
                            const date = m.match_date ? new Date(m.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "s/data";
                            return { value: m.id, label: `${date} · ${teamA} × ${teamB}` };
                          })}
                        />
                      </label>

                      {/* Jogos + Data */}
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>JOGOS SUSPENSO *</span>
                          <input type="number" min={1} value={suspGamesTotal} onChange={e => setSuspGamesTotal(e.target.value)}
                            className={inputClass} style={inputStyle} />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>DATA DE INÍCIO *</span>
                          <input type="date" value={suspStartsAt} onChange={e => setSuspStartsAt(e.target.value)}
                            className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} />
                        </label>
                      </div>

                      {/* Motivo */}
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>MOTIVO</span>
                        <input type="text" value={suspReason} onChange={e => setSuspReason(e.target.value)}
                          placeholder="Ex: Cartão vermelho direto" className={inputClass} style={inputStyle} />
                      </label>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 border-t px-6 py-4 justify-end" style={{ borderColor: "var(--color-border)" }}>
                      <button type="button" onClick={() => { resetSuspModal(); setShowSuspModal(false); }}
                        className="rounded-lg border px-4 py-2 font-mono text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Cancelar
                      </button>
                      <button type="button" disabled={suspCreating}
                        className="rounded-lg px-4 py-2 font-mono text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}
                        onClick={async () => {
                          const memberId = suspMemberType === "athlete" ? suspAthleteId : suspStaffId;
                          if (!suspTeamId) { toast("error", "Selecione a equipe."); return; }
                          if (!memberId) { toast("error", suspMemberType === "athlete" ? "Selecione o atleta." : "Selecione o membro."); return; }
                          if (!suspStartsAt) { toast("error", "Data de início é obrigatória."); return; }
                          setSuspCreating(true);
                          const fd = new FormData();
                          if (suspMemberType === "athlete") fd.append("athlete_id", suspAthleteId);
                          if (suspMemberType === "staff") fd.append("staff_member_id", suspStaffId);
                          fd.append("scope_edition_id", selectedEditionId);
                          fd.append("games_total", suspGamesTotal);
                          fd.append("starts_at", suspStartsAt);
                          fd.append("reason", suspReason);
                          if (suspOriginMatchId) fd.append("origin_match_id", suspOriginMatchId);
                          const result = await criarSuspensao(fd);
                          setSuspCreating(false);
                          if ("error" in result) { toast("error", result.error); return; }
                          toast("success", "Suspensão criada.");
                          resetSuspModal();
                          setShowSuspModal(false);
                          await loadSuspensions(selectedEditionId);
                        }}>
                        {suspCreating ? "Salvando…" : "Criar suspensão"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
            )}
            {activeConfigTab === "detalhes" && selectedEdition && (
              <DetalhesConfigTab
                competition={competition}
                edition={selectedEdition}
                editionTeams={editionTeams}
                phases={phases}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── HubActionButton ──────────────────────────────────────────────────────────
function HubActionButton({ icon, label, onClick, disabled, color }: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  color?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div className="relative" style={{ flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="flex items-center justify-center rounded border transition-all duration-150 disabled:opacity-40"
        style={{
          width: 30,
          height: 30,
          borderColor: hov ? (color ?? "var(--color-brand)") : "var(--color-border)",
          color: color ?? "var(--color-text-secondary)",
          backgroundColor: hov ? `${color ?? "var(--color-brand)"}15` : "transparent",
        }}
      >
        {icon}
      </button>
      {hov && (
        <div
          className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 font-mono text-xs pointer-events-none z-10"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ─── AddTeamModal ─────────────────────────────────────────────────────────────
function AddTeamModal({
  allTeams, editionTeams, addingTeamId, onAdd, onClose, inputClass, inputStyle,
}: {
  allTeams: Team[];
  editionTeams: EditionTeam[];
  addingTeamId: string | null;
  onAdd: (teamId: string) => Promise<void>;
  onClose: () => void;
  inputClass: string;
  inputStyle: any;
}) {
  const [query, setQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const enrolledIds = new Set(editionTeams.map(et => et.team_id));
  const q = query.toLowerCase();
  const available = allTeams.filter(t =>
    !t.is_virtual &&
    !enrolledIds.has(t.id) &&
    (!q || t.full_name.toLowerCase().includes(q) || (t.abbreviation ?? "").toLowerCase().includes(q))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-xl border shadow-xl flex flex-col"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", maxHeight: "72vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0"
          style={{ borderColor: "var(--color-border)" }}>
          <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>
            {selectedTeam ? "Confirmar adição" : "Adicionar equipe"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: "var(--color-text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Etapa 1 — busca */}
        {!selectedTeam && (
          <>
            <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <Search size={14} style={{ color: "var(--color-text-secondary)" }} />
                <input autoFocus type="text" placeholder="Buscar equipe…"
                  value={query} onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-sm outline-none"
                  style={{ color: "var(--color-text-primary)" }} />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {available.length === 0 ? (
                <p className="px-6 py-8 text-center font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Nenhuma equipe disponível.
                </p>
              ) : (
                available.map((team, idx) => (
                  <button key={team.id} type="button"
                    onClick={() => setSelectedTeam(team)}
                    className="flex items-center gap-3 w-full px-6 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain shrink-0 border"
                        style={{ borderColor: "var(--color-border)" }} />
                    ) : (
                      <div className="h-10 w-10 rounded-lg shrink-0 border flex items-center justify-center"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                        <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
                          {(team.abbreviation ?? team.full_name).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {team.abbreviation?.toUpperCase() ?? team.full_name}
                      </p>
                      <p className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                        {team.full_name}
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color: "#555" }} />
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Etapa 2 — confirmação */}
        {selectedTeam && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <div className="flex items-center gap-4 rounded-xl border p-4"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
              {selectedTeam.logo_url ? (
                <img src={selectedTeam.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-xl shrink-0 border flex items-center justify-center"
                  style={{ borderColor: "var(--color-border)" }}>
                  <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
                    {(selectedTeam.abbreviation ?? selectedTeam.full_name).slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {selectedTeam.abbreviation?.toUpperCase() ?? selectedTeam.full_name}
                </p>
                <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {selectedTeam.full_name}
                </p>
              </div>
            </div>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Confirma a adição desta equipe à edição atual?
            </p>
            <div className="flex gap-3 justify-between">
              <button type="button" onClick={() => setSelectedTeam(null)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                ← Voltar
              </button>
              <button type="button"
                onClick={() => onAdd(selectedTeam.id)}
                disabled={addingTeamId === selectedTeam.id}
                className="rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {addingTeamId === selectedTeam.id ? "Adicionando…" : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InscricoesConfigTab ─────────────────────────────────────────────────────

function InscricoesConfigTab({ selectedEditionId, inputClass, inputStyle }: {
  selectedEditionId: string;
  inputClass: string;
  inputStyle: any;
}) {
  const [athleteDocType, setAthleteDocType] = useState<"rg" | "cpf">("rg");
  const [staffDocType, setStaffDocType] = useState<"rg" | "cpf">("rg");
  const [maxAthletes, setMaxAthletes] = useState("");
  const [maxStaff, setMaxStaff] = useState("");
  const [maxTransfers, setMaxTransfers] = useState("");
  const [minBirthYear, setMinBirthYear] = useState("");
  const [maxBirthYear, setMaxBirthYear] = useState("");
  const [windowOpensAt, setWindowOpensAt] = useState("");
  const [windowClosesAt, setWindowClosesAt] = useState("");
  const [windowId, setWindowId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  async function handleRecalculate() {
    setRecalculating(true);
    const supabase = createClient();
    const { data: edition } = await supabase
      .from("competition_editions")
      .select("competition_id, competitions(organization_id, gender, sport_slug)")
      .eq("id", selectedEditionId)
      .maybeSingle();
    const comp = (edition?.competitions as any);
    if (!comp) { toast("error", "Competição não encontrada."); setRecalculating(false); return; }
    const { error } = await supabase.rpc("calculate_ranking", {
      p_organization_id: comp.organization_id,
      p_gender: comp.gender,
      p_sport_slug: comp.sport_slug,
    });
    setRecalculating(false);
    if (error) { toast("error", error.message); return; }
    toast("success", "Ranking recalculado.");
  }

  useEffect(() => { setLoaded(false); }, [selectedEditionId]);

  useEffect(() => {
    if (!selectedEditionId || loaded) return;
    async function load() {
      const supabase = createClient();
      const [{ data: settings }, { data: windows }] = await Promise.all([
        supabase.from("edition_settings").select("*").eq("edition_id", selectedEditionId).maybeSingle(),
        supabase.from("edition_registration_windows").select("id, opens_at, closes_at")
          .eq("edition_id", selectedEditionId).order("opens_at").limit(1),
      ]);
      if (settings) {
        setAthleteDocType(settings.athlete_doc_type ?? "rg");
        setStaffDocType(settings.staff_doc_type ?? "rg");
        setMaxAthletes(settings.max_athletes ? String(settings.max_athletes) : "");
        setMaxStaff(settings.max_staff ? String(settings.max_staff) : "");
        setMaxTransfers(settings.max_transfers ? String(settings.max_transfers) : "");
        setMinBirthYear(settings.min_birth_year ? String(settings.min_birth_year) : "");
        setMaxBirthYear(settings.max_birth_year ? String(settings.max_birth_year) : "");
      }
      const win = windows?.[0];
      if (win) {
        setWindowId(win.id);
        setWindowOpensAt(win.opens_at ? win.opens_at.slice(0, 16) : "");
        setWindowClosesAt(win.closes_at ? win.closes_at.slice(0, 16) : "");
      }
      setLoaded(true);
    }
    void load();
  }, [selectedEditionId, loaded]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error: settingsError } = await supabase
      .from("edition_settings")
      .upsert({
        edition_id: selectedEditionId,
        athlete_doc_type: athleteDocType,
        staff_doc_type: staffDocType,
        max_athletes: maxAthletes ? Number(maxAthletes) : null,
        max_staff: maxStaff ? Number(maxStaff) : null,
        max_transfers: maxTransfers ? Number(maxTransfers) : null,
        min_birth_year: minBirthYear ? Number(minBirthYear) : null,
        max_birth_year: maxBirthYear ? Number(maxBirthYear) : null,
      }, { onConflict: "edition_id" });

    if (settingsError) { toast("error", settingsError.message); setSaving(false); return; }

    if (windowOpensAt && windowClosesAt) {
      if (windowId) {
        await supabase.from("edition_registration_windows")
          .update({ opens_at: windowOpensAt, closes_at: windowClosesAt, is_active: true })
          .eq("id", windowId);
      } else {
        const { data: inserted } = await supabase
          .from("edition_registration_windows")
          .insert({ edition_id: selectedEditionId, opens_at: windowOpensAt, closes_at: windowClosesAt, is_active: true })
          .select("id").single();
        if (inserted) setWindowId(inserted.id);
      }
    } else if (windowId && !windowOpensAt && !windowClosesAt) {
      await supabase.from("edition_registration_windows")
        .update({ is_active: false }).eq("id", windowId);
    }

    setSaving(false);
    toast("success", "Configurações salvas.");
  }

  function getWindowStatus(): { label: string; color: string } | null {
    if (!windowOpensAt || !windowClosesAt) return null;
    const now = new Date();
    if (now < new Date(windowOpensAt)) return { label: "Agendada", color: "#F2C005" };
    if (now > new Date(windowClosesAt)) return { label: "Encerrada", color: "#555" };
    return { label: "Aberta agora", color: "var(--color-brand)" };
  }

  const windowStatus = getWindowStatus();
  const windowInvalid = !!windowOpensAt && !!windowClosesAt && new Date(windowOpensAt) >= new Date(windowClosesAt);

  if (!loaded) return <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>;

  // Estilos reutilizáveis
  const card: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    padding: "20px 20px 24px",
  };

  const sectionTitle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--color-text-primary)",
    marginBottom: 4,
  };

  const sectionDesc: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--color-text-secondary)",
    marginBottom: 16,
    lineHeight: 1.5,
  };

  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--color-text-secondary)",
    marginBottom: 6,
  };

  // Input sem setas (number) e sem spinner (datetime)
  const baseInput: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    outline: "none",
    transition: "border-color 0.15s",
    // Remove spinner arrows
    MozAppearance: "textfield" as any,
  };

  return (
    <>
      {/* CSS global para remover setas de inputs number */}
      <style>{`
        .no-spin::-webkit-inner-spin-button,
        .no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spin { -moz-appearance: textfield; }
        .no-cal::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
        .cfg-input:focus { border-color: var(--color-brand) !important; }
      `}</style>

      <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── 1. Documentos de controle ── */}
        <div style={card}>
          <p style={sectionTitle}>Documentos de controle</p>
          <p style={sectionDesc}>Qual documento será exigido para identificação dos inscritos.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { label: "Atletas", val: athleteDocType, set: setAthleteDocType },
              { label: "Comissão técnica", val: staffDocType, set: setStaffDocType },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <span style={{ ...fieldLabel }}>{label}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["rg", "cpf"] as const).map(doc => (
                    <button key={doc} type="button" onClick={() => set(doc)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid",
                        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        transition: "all 0.15s",
                        borderColor: val === doc ? "var(--color-brand)" : "var(--color-border)",
                        backgroundColor: val === doc ? "rgba(191,242,5,0.1)" : "transparent",
                        color: val === doc ? "var(--color-brand)" : "var(--color-text-secondary)",
                      }}>
                      {doc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Limites por equipe ── */}
        <div style={card}>
          <p style={sectionTitle}>Limites por equipe</p>
          <p style={sectionDesc}>Deixe em branco para não impor limite.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "Máx. atletas", val: maxAthletes, set: setMaxAthletes, ph: "∞" },
              { label: "Máx. comissão", val: maxStaff, set: setMaxStaff, ph: "∞" },
              { label: "Máx. transferências", val: maxTransfers, set: setMaxTransfers, ph: "∞" },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <span style={fieldLabel}>{label}</span>
                <input
                  type="number"
                  min="0"
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={ph}
                  className="no-spin cfg-input"
                  style={baseInput}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Controle por ano de nascimento ── */}
        <div style={card}>
          <p style={sectionTitle}>Controle por ano de nascimento</p>
          <p style={sectionDesc}>Atletas nascidos fora desta faixa serão bloqueados na inscrição.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Ano mínimo (mais antigo)", val: minBirthYear, set: setMinBirthYear, ph: "Ex: 1990" },
              { label: "Ano máximo (mais recente)", val: maxBirthYear, set: setMaxBirthYear, ph: "Ex: 2008" },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <span style={fieldLabel}>{label}</span>
                <input
                  type="number"
                  min="1900"
                  max="2030"
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={ph}
                  className="no-spin cfg-input"
                  style={baseInput}
                />
              </div>
            ))}
          </div>
          {minBirthYear && maxBirthYear && Number(minBirthYear) <= Number(maxBirthYear) && (
            <div style={{
              marginTop: 14, padding: "8px 12px", borderRadius: 8,
              border: "1px solid rgba(191,242,5,0.2)", backgroundColor: "rgba(191,242,5,0.05)",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-brand)",
            }}>
              Atletas elegíveis: nascidos entre {minBirthYear} e {maxBirthYear}
            </div>
          )}
          {minBirthYear && maxBirthYear && Number(minBirthYear) > Number(maxBirthYear) && (
            <div style={{
              marginTop: 14, padding: "8px 12px", borderRadius: 8,
              border: "1px solid rgba(255,68,68,0.2)", backgroundColor: "rgba(255,68,68,0.05)",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)",
            }}>
              O ano mínimo não pode ser maior que o máximo.
            </div>
          )}
        </div>

        {/* ── 4. Janela de inscrição ── */}
        <div style={{ ...card, borderColor: windowStatus?.color === "var(--color-brand)" ? "rgba(191,242,5,0.3)" : "var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <p style={sectionTitle}>Janela de inscrição</p>
            {windowStatus && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                padding: "3px 10px", borderRadius: 20,
                backgroundColor: `${windowStatus.color}22`,
                color: windowStatus.color,
                border: `1px solid ${windowStatus.color}44`,
              }}>
                {windowStatus.label}
              </span>
            )}
          </div>
          <p style={sectionDesc}>
            Representantes só podem submeter inscrições dentro deste período.{" "}
            <span style={{ color: "var(--color-text-primary)" }}>Admins inscrevem a qualquer momento.</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <span style={fieldLabel}>Abertura</span>
              <input
                type="datetime-local"
                value={windowOpensAt}
                onChange={e => setWindowOpensAt(e.target.value)}
                className="no-cal cfg-input"
                style={baseInput}
              />
            </div>
            <div>
              <span style={fieldLabel}>Encerramento</span>
              <input
                type="datetime-local"
                value={windowClosesAt}
                onChange={e => setWindowClosesAt(e.target.value)}
                className="no-cal cfg-input"
                style={baseInput}
              />
            </div>
          </div>
          {windowInvalid && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              border: "1px solid rgba(255,68,68,0.2)", backgroundColor: "rgba(255,68,68,0.05)",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)",
            }}>
              A data de abertura deve ser anterior ao encerramento.
            </div>
          )}
        </div>

        {/* ── Salvar ── */}
        <div>
          <button type="button" onClick={handleSave}
            disabled={saving || windowInvalid}
            style={{
              padding: "10px 28px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer",
              backgroundColor: "var(--color-brand)", color: "var(--color-background)",
              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
              opacity: saving || windowInvalid ? 0.5 : 1, transition: "opacity 0.15s",
            }}>
            {saving ? "Salvando…" : "Salvar configurações"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── SemanasTab ───────────────────────────────────────────────────────────────

function SemanasTab({ selectedEditionId, rounds, editionTeams }: {
  selectedEditionId: string;
  rounds: any[];
  editionTeams: any[];
}) {
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

  const FW = 700;
  const FH = 380;
  const PAD_X = 50;
  const PAD_Y = 40;
  const INNER_W = FW - PAD_X * 2;
  const INNER_H = FH - PAD_Y * 2;
  const ZONE_X: Record<number, number> = {
    0: PAD_X + INNER_W * 0.08,
    1: PAD_X + INNER_W * 0.30,
    2: PAD_X + INNER_W * 0.58,
    3: PAD_X + INNER_W * 0.80,
  };
  const CY = FH / 2;
  const AVATAR_R = 20;

  function slotPosition(col: number, row: number, total: number): { cx: number; cy: number } {
    const cx = ZONE_X[col];
    const minSpacing = AVATAR_R * 2 + 20;
    const maxSpacing = INNER_H / (total + 0.5);
    const spacing = Math.max(minSpacing, Math.min(maxSpacing, 80));
    const startY = CY - spacing * (total - 1) / 2;
    const cy = startY + row * spacing;
    return { cx, cy };
  }

  // Sub-aba: "selecao" | "historico"
  const [activeSemanasTab, setActiveSemanasTab] = useState<"selecao" | "historico">("selecao");

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

  // Histórico TOTW
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Load TOTW for selected round (Seleção tab)
  useEffect(() => {
    if (!selectedRoundId || !selectedEditionId) return;
    async function loadSquads() {
      setLoading(true);
      const supabase = createClient();
      const { data: squads } = await supabase
        .from("selection_squads")
        .select("id, squad_type, formation, selection_squad_members(id, athlete_id, staff_member_id, team_id, display_order, athletes(id, full_name, surname, photo_url, player_positions(full_name, abbreviation)), staff_members(id, full_name, surname, photo_url, staff_roles(full_name)), teams(id, full_name, abbreviation, logo_url, primary_color))")
        .eq("edition_id", selectedEditionId).eq("round_id", selectedRoundId);

      const totw = (squads ?? []).find((s: any) => s.squad_type === "totw");
      const motw = (squads ?? []).find((s: any) => s.squad_type === "motw");
      setTotwSquadId(totw?.id ?? null);
      setMotwSquadId(motw?.id ?? null);

      if (totw?.selection_squad_members) {
        if (totw.formation && FORMATIONS[totw.formation]) {
          setFormation(totw.formation);
        }
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

  // Load histórico when switching to that tab
  useEffect(() => {
    if (activeSemanasTab !== "historico" || !selectedEditionId) return;
    void loadHistorico();
  }, [activeSemanasTab, selectedEditionId]);

  async function loadHistorico() {
    setLoadingHistorico(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("selection_squads")
      .select("id, round_id, created_at, rounds(id, name, custom_label, display_order), selection_squad_members(id, athlete_id, staff_member_id, display_order, athletes(id, full_name, surname, photo_url), staff_members(id, full_name, surname, photo_url), teams(id, abbreviation, full_name, logo_url))")
      .eq("edition_id", selectedEditionId)
      .eq("squad_type", "totw")
      .order("created_at", { ascending: false });
    setHistorico(data ?? []);
    setLoadingHistorico(false);
  }

  async function handleDeleteTotw(squadId: string) {
    if (!confirm("Excluir este TOTW? Esta ação não pode ser desfeita.")) return;
    setDeletingId(squadId);
    await deletarSquad(squadId);
    setHistorico(prev => prev.filter(h => h.id !== squadId));
    setDeletingId(null);
    toast("success", "TOTW excluído.");
  }

  function handleEditTotw(squad: any) {
    // Switch to Seleção tab and load the round
    setActiveSemanasTab("selecao");
    setSelectedRoundId(squad.round_id);
  }

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
    
    console.log('=== MOTW DEBUG ===');
    console.log('motwIndex:', motwIndex);
    console.log('slots[motwIndex]:', motwIndex !== null ? slots[motwIndex] : 'N/A');
    console.log('athleteId:', motwIndex !== null ? slots[motwIndex]?.athleteId : 'N/A');
    console.log('teamId:', motwIndex !== null ? slots[motwIndex]?.teamId : 'N/A');
    console.log('selectedRoundId:', selectedRoundId);
    console.log('selectedEditionId:', selectedEditionId);
    const allMembers: { athleteId?: string; staffMemberId?: string; teamId: string; displayOrder: number }[] = [];
    slots.forEach((s, i) => {
      if (s) allMembers.push({ athleteId: s.athleteId ?? undefined, staffMemberId: s.staffMemberId ?? undefined, teamId: s.teamId, displayOrder: i + 1 });
    });
    if (coach) allMembers.push({ staffMemberId: coach.staffMemberId ?? undefined, athleteId: coach.athleteId ?? undefined, teamId: coach.teamId, displayOrder: 8 });
    const totwResult = await criarOuAtualizarTOTW(selectedEditionId, selectedRoundId, allMembers, formation);
    if ("error" in totwResult) { toast("error", totwResult.error); setSaving(false); return; }
    const motwSlot = motwIndex !== null ? slots[motwIndex] : null;
if (motwSlot && motwSlot.athleteId !== null && motwSlot.athleteId !== undefined) {
  const motwResult = await criarOuAtualizarMOTW(selectedEditionId, selectedRoundId, motwSlot.athleteId, motwSlot.teamId);
  console.log('=== MOTW RESULT ===', JSON.stringify(motwResult));
} else if (motwSquadId) {
  await deletarSquad(motwSquadId);
}
    // Refresh historico if it was loaded
    if (historico.length > 0) void loadHistorico();
    setSaving(false);
    toast("success", "Premiações semanais salvas.");
  }

  const formationSlots = FORMATIONS[formation].slots;
  const usedAthleteIds = new Set(slots.filter(Boolean).map((s: any) => s.athleteId).filter(Boolean));
  const usedStaffIds = new Set([
    ...slots.filter(Boolean).map((s: any) => s.staffMemberId).filter(Boolean),
    ...(coach ? [coach.staffMemberId] : []),
  ]);

  const searchResults = (() => {
    const pool = searchType === "athlete" ? editionAthletes : editionStaff;
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

  // ── Renderizar Histórico ──
  function renderHistorico() {
    if (loadingHistorico) {
      return <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6", padding: "40px 0", textAlign: "center" }}>Carregando…</p>;
    }
    if (historico.length === 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text-primary)" }}>Nenhum TOTW salvo</p>
          <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6" }}>Selecione uma rodada e salve o Time da Semana.</p>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {historico.map((squad: any) => {
          const roundLabel = squad.rounds?.custom_label ?? squad.rounds?.name ?? "Rodada";
          const createdAt = new Date(squad.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
          const members = [...(squad.selection_squad_members ?? [])].sort((a: any, b: any) => a.display_order - b.display_order);
          const players = members.filter((m: any) => m.display_order <= 7);
          const coachMember = members.find((m: any) => m.display_order === 8);

          return (
            <div key={squad.id} style={{ borderRadius: 12, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
              {/* Header da rodada */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{roundLabel}</p>
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{createdAt}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleEditTotw(squad)}
                    style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(191,242,5,0.25)", backgroundColor: "rgba(191,242,5,0.06)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDeleteTotw(squad.id)} disabled={deletingId === squad.id}
                    style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,68,68,0.25)", backgroundColor: "rgba(255,68,68,0.06)", color: "var(--color-danger)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: deletingId === squad.id ? 0.5 : 1 }}>
                    {deletingId === squad.id ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              </div>
              {/* Atletas */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 18px" }}>
                {players.map((m: any) => {
                  const isAth = !!m.athlete_id;
                  const person = isAth ? m.athletes : m.staff_members;
                  const name = person?.surname ?? person?.full_name ?? "—";
                  const photo = person?.photo_url ?? null;
                  const team = m.teams;
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--color-border)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                      {photo ? (
                        <img src={photo} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{name}</span>
                      {team && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {team.logo_url && <img src={team.logo_url} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />}
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>{team.abbreviation ?? team.full_name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {coachMember && (() => {
                  const person = coachMember.athlete_id ? coachMember.athletes : coachMember.staff_members;
                  const name = person?.surname ?? person?.full_name ?? "—";
                  return (
                    <div key={coachMember.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(191,242,5,0.2)", backgroundColor: "rgba(191,242,5,0.05)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)", fontWeight: 700 }}>TEC</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{name}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Sub-abas: Seleção / Histórico */}
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--color-border)" }}>
        {[{ key: "selecao", label: "SELEÇÃO" }, { key: "historico", label: "HISTÓRICO" }].map(t => (
          <button key={t.key} type="button" onClick={() => setActiveSemanasTab(t.key as any)}
            style={{ paddingBottom: 12, background: "none", border: "none", borderBottom: `2px solid ${activeSemanasTab === t.key ? "var(--color-brand)" : "transparent"}`, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: activeSemanasTab === t.key ? "var(--color-brand)" : "#A6A6A6", cursor: "pointer", transition: "all 0.12s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── HISTÓRICO ── */}
      {activeSemanasTab === "historico" && renderHistorico()}

      {/* ── SELEÇÃO ── */}
      {activeSemanasTab === "selecao" && (
        <>
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
              <LabSelect
                value={selectedRoundId}
                onChange={setSelectedRoundId}
                options={rounds.map((r: any) => ({ value: r.id, label: r.custom_label ?? r.name }))}
              />
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

                  <rect width={FW} height={FH} fill="var(--color-surface)" />
                  <rect x={PAD_X} y={PAD_Y} width={INNER_W} height={INNER_H} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                  <line x1={FW/2} y1={PAD_Y} x2={FW/2} y2={PAD_Y + INNER_H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <circle cx={FW/2} cy={FH/2} r={Math.min(INNER_H, INNER_W) * 0.13} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <circle cx={FW/2} cy={FH/2} r="3" fill="rgba(255,255,255,0.2)" />
                  <rect x={PAD_X} y={PAD_Y + INNER_H * 0.22} width={INNER_W * 0.18} height={INNER_H * 0.56} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <rect x={PAD_X} y={PAD_Y + INNER_H * 0.35} width={INNER_W * 0.08} height={INNER_H * 0.30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <rect x={PAD_X - 14} y={PAD_Y + INNER_H * 0.40} width={14} height={INNER_H * 0.20} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                  <circle cx={PAD_X + INNER_W * 0.12} cy={FH/2} r="2.5" fill="rgba(255,255,255,0.2)" />
                  <rect x={PAD_X + INNER_W * 0.82} y={PAD_Y + INNER_H * 0.22} width={INNER_W * 0.18} height={INNER_H * 0.56} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <rect x={PAD_X + INNER_W * 0.92} y={PAD_Y + INNER_H * 0.35} width={INNER_W * 0.08} height={INNER_H * 0.30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <rect x={PAD_X + INNER_W} y={PAD_Y + INNER_H * 0.40} width={14} height={INNER_H * 0.20} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                  <circle cx={PAD_X + INNER_W * 0.88} cy={FH/2} r="2.5" fill="rgba(255,255,255,0.2)" />
                  <line x1={FW/2 - 20} y1={PAD_Y} x2={FW/2 - 20} y2={PAD_Y - 8} stroke="rgba(191,242,5,0.4)" strokeWidth="1.5" />
                  <line x1={FW/2 + 20} y1={PAD_Y} x2={FW/2 + 20} y2={PAD_Y - 8} stroke="rgba(191,242,5,0.4)" strokeWidth="1.5" />

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
                  {saving ? "Salvando…" : totwSquadId ? "Atualizar TOTW" : "Salvar TOTW"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── TotsTab ──────────────────────────────────────────────────────────────────

function TotsTab({ selectedEditionId }: { selectedEditionId: string }) {
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

  const FW = 700;
  const FH = 380;
  const PAD_X = 50;
  const PAD_Y = 40;
  const INNER_W = FW - PAD_X * 2;
  const INNER_H = FH - PAD_Y * 2;
  const ZONE_X: Record<number, number> = {
    0: PAD_X + INNER_W * 0.08,
    1: PAD_X + INNER_W * 0.30,
    2: PAD_X + INNER_W * 0.58,
    3: PAD_X + INNER_W * 0.80,
  };
  const CY = FH / 2;
  const AVATAR_R = 20;

  function slotPosition(col: number, row: number, total: number): { cx: number; cy: number } {
    const cx = ZONE_X[col];
    const minSpacing = AVATAR_R * 2 + 20;
    const maxSpacing = INNER_H / (total + 0.5);
    const spacing = Math.max(minSpacing, Math.min(maxSpacing, 80));
    const startY = CY - spacing * (total - 1) / 2;
    const cy = startY + row * spacing;
    return { cx, cy };
  }

  const [formation, setFormation] = useState<string>("2-3-1");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totsSquadId, setTotsSquadId] = useState<string | null>(null);
  const [slots, setSlots] = useState<(any | null)[]>(Array(7).fill(null));
  const [coach, setCoach] = useState<any | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlotIndex, setSearchSlotIndex] = useState<number | null>(null);
  const [searchIsCoach, setSearchIsCoach] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"athlete" | "staff">("athlete");
  const [editionAthletes, setEditionAthletes] = useState<any[]>([]);
  const [editionStaff, setEditionStaff] = useState<any[]>([]);

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

  function applySquadToState(tots: any) {
    if (!tots?.selection_squad_members) {
      setSlots(Array(7).fill(null));
      setCoach(null);
      return;
    }
    if (tots.formation && FORMATIONS[tots.formation]) setFormation(tots.formation);
    const members = [...tots.selection_squad_members].sort((a: any, b: any) => a.display_order - b.display_order);
    const playerSlots = members.filter((m: any) => m.display_order <= 7);
    const coachSlot = members.find((m: any) => m.display_order === 8);
    const newSlots: (any | null)[] = Array(7).fill(null);
    playerSlots.forEach((m: any, i: number) => { if (i < 7) newSlots[i] = buildSlotData(m); });
    setSlots(newSlots);
    setCoach(coachSlot ? buildSlotData(coachSlot) : null);
  }

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
    if (!selectedEditionId) return;
    async function loadTots() {
      setLoading(true);
      const result = await buscarTOTS(selectedEditionId);
      if ("error" in result) {
        toast("error", result.error);
        setLoading(false);
        return;
      }
      setTotsSquadId(result.squad?.id ?? null);
      applySquadToState(result.squad);
      setLoading(false);
    }
    void loadTots();
  }, [selectedEditionId]);

  async function handleSave() {
    setSaving(true);
    const allMembers: { athleteId?: string; staffMemberId?: string; teamId: string; displayOrder: number }[] = [];
    slots.forEach((s, i) => {
      if (s) allMembers.push({ athleteId: s.athleteId ?? undefined, staffMemberId: s.staffMemberId ?? undefined, teamId: s.teamId, displayOrder: i + 1 });
    });
    if (coach) allMembers.push({ staffMemberId: coach.staffMemberId ?? undefined, athleteId: coach.athleteId ?? undefined, teamId: coach.teamId, displayOrder: 8 });
    const result = await criarOuAtualizarTOTS(selectedEditionId, allMembers, formation);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    const refreshed = await buscarTOTS(selectedEditionId);
    if (!("error" in refreshed)) {
      setTotsSquadId(refreshed.squad?.id ?? null);
      applySquadToState(refreshed.squad);
    }
    toast("success", "TOTS salvo.");
  }

  const formationSlots = FORMATIONS[formation].slots;
  const usedAthleteIds = new Set(slots.filter(Boolean).map((s: any) => s.athleteId).filter(Boolean));
  const usedStaffIds = new Set([
    ...slots.filter(Boolean).map((s: any) => s.staffMemberId).filter(Boolean),
    ...(coach ? [coach.staffMemberId] : []),
  ]);

  const searchResults = (() => {
    const pool = searchType === "athlete" ? editionAthletes : editionStaff;
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
        TOTS — Seleção da Temporada
      </p>

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
                      if (searchIsCoach) setCoach(sd);
                      else if (searchSlotIndex !== null) {
                        setSlots(prev => { const n = [...prev]; n[searchSlotIndex] = sd; return n; });
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>Formação</span>
        {Object.keys(FORMATIONS).map(f => (
          <button key={f} type="button"
            onClick={() => { setFormation(f); setSlots(Array(7).fill(null)); }}
            style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
              borderColor: formation === f ? "var(--color-brand)" : "var(--color-border)",
              backgroundColor: formation === f ? "rgba(191,242,5,0.1)" : "transparent",
              color: formation === f ? "var(--color-brand)" : "#A6A6A6" }}>
            {FORMATIONS[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#A6A6A6" }}>Carregando…</p>
      ) : (
        <>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <div style={{ position: "absolute", top: 12, left: 0, right: 0, textAlign: "center", zIndex: 2, pointerEvents: "none" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", color: "rgba(191,242,5,0.55)", textTransform: "uppercase" as const }}>
                SELEÇÃO DA TEMPORADA
              </span>
            </div>
            <svg viewBox={`0 0 ${FW} ${FH}`} style={{ width: "100%", display: "block" }} xmlns="http://www.w3.org/2000/svg">
              <rect width={FW} height={FH} fill="var(--color-surface)" />
              <rect x={PAD_X} y={PAD_Y} width={INNER_W} height={INNER_H} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
              <line x1={FW/2} y1={PAD_Y} x2={FW/2} y2={PAD_Y + INNER_H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <circle cx={FW/2} cy={FH/2} r={Math.min(INNER_H, INNER_W) * 0.13} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <circle cx={FW/2} cy={FH/2} r="3" fill="rgba(255,255,255,0.2)" />
              <rect x={PAD_X} y={PAD_Y + INNER_H * 0.22} width={INNER_W * 0.18} height={INNER_H * 0.56} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x={PAD_X} y={PAD_Y + INNER_H * 0.35} width={INNER_W * 0.08} height={INNER_H * 0.30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x={PAD_X - 14} y={PAD_Y + INNER_H * 0.40} width={14} height={INNER_H * 0.20} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <circle cx={PAD_X + INNER_W * 0.12} cy={FH/2} r="2.5" fill="rgba(255,255,255,0.2)" />
              <rect x={PAD_X + INNER_W * 0.82} y={PAD_Y + INNER_H * 0.22} width={INNER_W * 0.18} height={INNER_H * 0.56} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x={PAD_X + INNER_W * 0.92} y={PAD_Y + INNER_H * 0.35} width={INNER_W * 0.08} height={INNER_H * 0.30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x={PAD_X + INNER_W} y={PAD_Y + INNER_H * 0.40} width={14} height={INNER_H * 0.20} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <circle cx={PAD_X + INNER_W * 0.88} cy={FH/2} r="2.5" fill="rgba(255,255,255,0.2)" />

              {formationSlots.map((slot, i) => {
                const { cx, cy } = slotPosition(slot.col, slot.row, slot.total);
                const data = slots[i];
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
                          <style>{`.tsa${i}:hover .tsg${i}{opacity:1}.tsa${i}:hover .tsr${i}{box-shadow:0 0 0 2px ${teamColor ?? "#BFF205"},0 0 12px 3px ${teamColor ? teamColor+"55" : "rgba(191,242,5,0.3)"}}`}</style>
                          <div className={`tsa${i}`} style={{ position: "relative", width: foSize, height: foSize, cursor: "pointer", flexShrink: 0 }}
                            onClick={() => { setSearchSlotIndex(i); setSearchIsCoach(false); setSearchType("athlete"); setSearchQuery(""); setSearchOpen(true); }}>
                            <div className={`tsg${i}`} style={{ position: "absolute", inset: -6, borderRadius: "50%", opacity: 0, pointerEvents: "none", transition: "opacity 0.2s",
                              background: teamColor ? `radial-gradient(circle,${teamColor}44 0%,transparent 70%)` : "radial-gradient(circle,rgba(191,242,5,0.25) 0%,transparent 70%)" }} />
                            <div className={`tsr${i}`} style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                              border: "2px solid rgba(255,255,255,0.3)", backgroundColor: "rgba(0,0,0,0.5)", transition: "box-shadow 0.2s" }}>
                              {data.photo
                                ? <img src={data.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{data.name.slice(0,2).toUpperCase()}</div>
                              }
                            </div>
                            <div onClick={e => { e.stopPropagation(); setSlots(prev => { const n = [...prev]; n[i] = null; return n; }); }}
                              style={{ position: "absolute", top: -3, left: -3, width: 15, height: 15, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, backgroundColor: "rgba(255,68,68,0.9)", color: "white", lineHeight: 1 }}>×</div>
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", maxWidth: foSize + 12, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{data.name}</p>
                          {data.teamName && <p style={{ margin: "1px 0 0", fontSize: 8, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>{data.teamName}</p>}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

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

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding: "9px 22px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando…" : totsSquadId ? "Atualizar TOTS" : "Salvar TOTS"}
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
  const allMatches = matchup.matches ?? [];
  const finished = allMatches.filter(m => m.status === "finished");
  const isLegs = legs && allMatches.length > 1;
  const tA = matchup.teams_a?.abbreviation ?? matchup.teams_a?.full_name ?? "Time A";
  const tB = matchup.teams_b?.abbreviation ?? matchup.teams_b?.full_name ?? "Time B";
  const logoA = matchup.teams_a?.logo_url ?? null;
  const logoB = matchup.teams_b?.logo_url ?? null;

  let summaryLabel = "";
  let summaryValue = "";
  if (isLegs && aggregateScore && finished.length > 1) {
    const totA = finished.reduce((s, m) => s + m.score_a, 0);
    const totB = finished.reduce((s, m) => s + m.score_b, 0);
    const last = finished[finished.length - 1];
    const pen = last?.pen_a != null ? ` · Pên: ${last.pen_a}–${last.pen_b}` : "";
    summaryLabel = "Placar agregado";
    summaryValue = `${tA} ${totA}–${totB} ${tB}${pen}`;
  } else if (isLegs && !aggregateScore && finished.length > 1) {
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
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.78)", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 360, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>

        {/* Cabeçalho */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "rgba(191,242,5,0.03)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>Confronto</p>
            {/* Times com logos */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              {/* Time A */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {logoA
                  ? <img src={logoA} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                  : <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                }
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "0.04em" }}>{tA}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>×</span>
              {/* Time B */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {logoB
                  ? <img src={logoB} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                  : <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                }
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "0.04em" }}>{tB}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.4)"; (e.currentTarget as HTMLElement).style.color = "#BFF205"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>×</button>
        </div>

        {/* Resumo agregado / série */}
        {summaryLabel && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", backgroundColor: "rgba(191,242,5,0.05)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>
              {summaryLabel}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#BFF205", fontWeight: 700 }}>
              {summaryValue}
            </span>
          </div>
        )}

        {/* Jogos */}
        {allMatches.map((m, i) => {
          const isFinished = m.status === "finished";
          const hasPen = isFinished && (m.pen_a ?? null) !== null;
          const wA = isFinished && (hasPen ? (m.pen_a! > m.pen_b!) : m.score_a > m.score_b);
          const wB = isFinished && (hasPen ? (m.pen_b! > m.pen_a!) : m.score_b > m.score_a);
          const gameLabel = isLegs
            ? (i === 0 ? "🏠 Jogo de ida" : "✈ Jogo de volta")
            : "Jogo único";

          return (
            <div key={m.id} style={{ borderBottom: i < allMatches.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>

              {/* Label do jogo */}
              <div style={{ padding: "10px 18px 6px", fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{gameLabel}</span>
                {!isFinished && (
                  <span style={{ color: "#F2C005", fontSize: 8, letterSpacing: "0.06em" }}>
                    {m.status === "scheduled" ? "Agendado" : m.status === "ongoing" ? "Ao vivo" : m.status}
                  </span>
                )}
              </div>

              {/* Placar Time A */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 18px" }}>
                {logoA
                  ? <img src={logoA} alt="" style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0, filter: wB ? "grayscale(1) opacity(0.3)" : "none" }} />
                  : <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: wA ? "#BFF205" : wB ? "rgba(255,255,255,0.2)" : "var(--color-text-primary)" }}>
                  {tA}
                </span>
                {hasPen && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, background: "rgba(191,242,5,0.1)", color: "#BFF205", padding: "2px 6px", borderRadius: 4 }}>pen</span>
                )}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 800, lineHeight: 1, color: wA ? "#BFF205" : wB ? "rgba(255,255,255,0.1)" : isFinished ? "var(--color-text-primary)" : "#333", minWidth: 18, textAlign: "right" as const }}>
                  {isFinished ? m.score_a : "–"}
                </span>
              </div>

              {/* Placar Time B */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 18px 10px" }}>
                {logoB
                  ? <img src={logoB} alt="" style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0, filter: wA ? "grayscale(1) opacity(0.3)" : "none" }} />
                  : <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: wB ? "#BFF205" : wA ? "rgba(255,255,255,0.2)" : "var(--color-text-primary)" }}>
                  {tB}
                </span>
                {hasPen && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, background: "rgba(191,242,5,0.1)", color: "#BFF205", padding: "2px 6px", borderRadius: 4 }}>pen</span>
                )}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 800, lineHeight: 1, color: wB ? "#BFF205" : wA ? "rgba(255,255,255,0.1)" : isFinished ? "var(--color-text-primary)" : "#333", minWidth: 18, textAlign: "right" as const }}>
                  {isFinished ? m.score_b : "–"}
                </span>
              </div>

              {/* Pênaltis */}
              {hasPen && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 18px 10px", backgroundColor: "rgba(191,242,5,0.04)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 10 }}>⚽</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                    Pênaltis:{" "}
                    <span style={{ color: "#BFF205", fontWeight: 700 }}>{tA} {m.pen_a} × {m.pen_b} {tB}</span>
                  </span>
                </div>
              )}

              {/* Link para a partida */}
              <div style={{ padding: "0 18px 12px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => router.push(`/partidas/${m.id}`)}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#BFF205"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.4)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}>
                  Ver partida →
                </button>
              </div>
            </div>
          );
        })}

        {/* Fallback vazio */}
        {allMatches.length === 0 && (
          <div style={{ padding: "28px 18px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Nenhuma partida adicionada.</p>
          </div>
        )}
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

      // Monta pen_a / pen_b por partida — result é string por kick, soma por time
      const penByMatch: Record<string, { pen_a: number; pen_b: number }> = {};
      const matchTeamAMap: Record<string, string> = {};
      (matchesData ?? []).forEach((m: any) => { matchTeamAMap[m.id] = m.team_a_id; });

      shootouts.forEach((s: any) => {
        if (!penByMatch[s.match_id]) penByMatch[s.match_id] = { pen_a: 0, pen_b: 0 };
        const isTeamA = matchTeamAMap[s.match_id] === s.team_id;
        // result é string por kick: "goal" | "goalkeeper_save" | "off_target" | "post"
        if (s.result === "goal") {
          if (isTeamA) penByMatch[s.match_id].pen_a += 1;
          else penByMatch[s.match_id].pen_b += 1;
        }
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
                          onOpenModal={() => onOpenModal(matchups.find(m => m.id === mu.id) ?? mu)}
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
              <BracketMatchupCard matchup={mu} legs={legs} aggregateScore={aggregateScore} showOrder={false} onOpenModal={() => onOpenModal(matchups.find(m => m.id === mu.id) ?? mu)} />
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
              {finalMatchup != null ? (
                <div data-matchup-id={finalMatchup.id}>
                  <BracketMatchupCard
                    matchup={finalMatchup}
                    legs={phaseRounds.find(r => (r.custom_label ?? r.name) === finalLabel)?.legs ?? false}
                    aggregateScore={phaseRounds.find(r => (r.custom_label ?? r.name) === finalLabel)?.aggregate_score ?? false}
                    showOrder={false}
                    onOpenModal={() => { if (finalMatchup != null) onOpenModal(matchups.find(m => m.id === finalMatchup.id) ?? finalMatchup); }}
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

function StatRanking({ title, data, valueKey, valueLabel, valueColor, emptyMessage, allScorers, phases, rounds, editionTeams, isDecimal }: {
  title: string; data: any[]; valueKey: string; valueLabel: string; valueColor?: string; emptyMessage: string;
  allScorers: any[]; phases: any[]; rounds: any[]; editionTeams: any[]; isDecimal?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterPhaseId, setFilterPhaseId] = useState("");
  const [filterRoundId, setFilterRoundId] = useState("");
  const LIMIT = 5;
  const visible = data.slice(0, LIMIT);
  const hasMore = data.length > LIMIT;

  // Derive team list from editionTeams
  const teamOptions = editionTeams.map((et: any) => ({ id: et.team_id, label: et.teams?.abbreviation ?? et.teams?.full_name ?? "—" }));
  const phaseOptions = phases.map((p: any) => ({ id: p.id, label: p.custom_label ?? p.full_name }));
  const roundOptions = rounds.filter((r: any) => !filterPhaseId || r.phase_id === filterPhaseId).map((r: any) => ({ id: r.id, label: r.custom_label ?? r.name }));

  // Build phase→rounds map for match-level filtering
  // We filter allScorers by team only (phase/round filtering on edition-level stats
  // isn't directly supported without per-match data; we filter by team_id instead)
  const filteredForModal = allScorers.filter(s => {
    if (!s.athlete_id || !s.athletes) return false;
    if (filterTeamId && s.team_id !== filterTeamId) return false;
    return true;
  }).filter(s => (s[valueKey] ?? 0) > 0).sort((a, b) => (b[valueKey] ?? 0) - (a[valueKey] ?? 0));

  const selectStyle = {
    padding: "5px 10px", borderRadius: 8, border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background)", color: "var(--color-text-primary)",
    fontSize: 11, fontFamily: "var(--font-mono)", outline: "none", cursor: "pointer",
  };

  function AthleteRow({ row, idx, inModal }: { row: any; idx: number; inModal?: boolean }) {
    const sz = inModal ? "h-8 w-8" : "h-7 w-7";
    const valSz = inModal ? "text-xl" : "text-lg";
    return (
      <div className={`flex items-center gap-3 ${inModal ? "px-6" : "px-5"} py-3`}
        style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
        <span className="font-mono text-xs text-right shrink-0" style={{ width: inModal ? 20 : 16, color: idx < 3 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
          {idx + 1}
        </span>
        {row.athletes?.photo_url ? (
          <img src={row.athletes.photo_url} alt="" className={`${sz} rounded-full object-cover shrink-0`} />
        ) : (
          <div className={`flex ${sz} shrink-0 items-center justify-center rounded-full text-xs font-bold`}
            style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {(row.athletes?.surname ?? row.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
            {row.athletes?.surname ?? row.athletes?.full_name ?? "—"}
          </p>
          {row.team && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {row.team.logo_url && <img src={row.team.logo_url} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />}
              <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {row.team.abbreviation ?? row.team.full_name}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className={`font-display ${valSz} font-bold`} style={{ color: valueColor ?? "var(--color-brand)" }}>
            {isDecimal ? (row[valueKey] ?? 0).toFixed(1) : (row[valueKey] ?? 0)}
          </span>
          {inModal && <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{valueLabel}</span>}
        </div>
      </div>
    );
  }

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
            {visible.map((row: any, idx: number) => <AthleteRow key={row.athlete_id} row={row} idx={idx} />)}
            {hasMore && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-3 font-mono text-xs transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                style={{ color: "var(--color-brand)", borderTop: "1px solid var(--color-border)" }}>
                Ver mais ({data.length})
              </button>
            )}
          </>
        )}
      </div>
      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-xl border shadow-xl flex flex-col max-h-[85vh]"
            style={{ backgroundColor: "#0e0e0e", borderColor: "var(--color-border)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{title}</h2>
              <button type="button" onClick={() => setShowAll(false)} style={{ color: "var(--color-text-secondary)" }}><X size={18} /></button>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <LabSelect value={filterTeamId} onChange={setFilterTeamId} placeholder="Todas as equipes"
                options={teamOptions.map((t: any) => ({ value: t.id, label: t.label }))} />
              <LabSelect value={filterPhaseId} onChange={(v) => { setFilterPhaseId(v); setFilterRoundId(""); }} placeholder="Todas as fases"
                options={phaseOptions.map((p: any) => ({ value: p.id, label: p.label }))} />
              {filterPhaseId && (
                <LabSelect value={filterRoundId} onChange={setFilterRoundId} placeholder="Todas as rodadas"
                  options={roundOptions.map((r: any) => ({ value: r.id, label: r.label }))} />
              )}
              {(filterTeamId || filterPhaseId || filterRoundId) && (
                <button type="button" onClick={() => { setFilterTeamId(""); setFilterPhaseId(""); setFilterRoundId(""); }}
                  style={{ ...selectStyle, color: "var(--color-brand)", borderColor: "rgba(191,242,5,0.25)", backgroundColor: "rgba(191,242,5,0.06)" }}>
                  Limpar
                </button>
              )}
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1">
              {filteredForModal.length === 0 ? (
                <p className="py-10 text-center font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Nenhum resultado.</p>
              ) : filteredForModal.map((row: any, idx: number) => (
                <AthleteRow key={row.athlete_id} row={row} idx={idx} inModal />
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
  const isScheduled = match.status === "scheduled";
  const colorA = match.teams_a?.primary_color ?? "#444444";
  const colorB = match.teams_b?.primary_color ?? "#444444";
  const nameA = match.teams_a?.short_name ?? match.teams_a?.full_name ?? "A definir";
  const nameB = match.teams_b?.short_name ?? match.teams_b?.full_name ?? "A definir";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
        position: "relative",
        opacity: hovered ? 1 : 0.82,
        transition: "opacity 0.12s ease",
      }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${colorA} 50%, ${colorB} 50%)`,
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: "none", zIndex: 1,
      }} />

      <Link
        href={`/partidas/${match.id}`}
        className="hover:bg-[rgba(255,255,255,0.025)]"
        style={{ display: "flex", alignItems: "center", padding: "0 16px", height: 54, textDecoration: "none" }}
      >
        {/* Data + status — largura fixa, sempre legível */}
        <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {match.match_date
              ? new Date(match.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              : "—"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)" }}>
            {match.match_time ? match.match_time.slice(0, 5) : STATUS_LABEL[match.status] ?? "—"}
          </span>
        </div>

        <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0, margin: "0 16px" }} />

        {/* Bloco central — ocupa todo o espaço restante, conteúdo centralizado */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, minWidth: 0 }}>

          {/* Nome A */}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            textAlign: "right", flex: 1, minWidth: 0,
          }}>
            {nameA}
          </span>

          {/* Logo A — sem fundo */}
          <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {match.teams_a?.logo_url
              ? <img src={match.teams_a.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
              : <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: colorA }}>
                  {nameA.slice(0, 2).toUpperCase()}
                </span>
            }
          </div>

          {/* Placar */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, width: 68, justifyContent: "center" }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, lineHeight: 1,
              color: isScheduled ? "#2a2a2a" : "var(--color-brand)",
              width: 20, textAlign: "center",
            }}>
              {isScheduled ? "–" : match.score_a}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#333", lineHeight: 1 }}>–</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, lineHeight: 1,
              color: isScheduled ? "#2a2a2a" : "var(--color-brand)",
              width: 20, textAlign: "center",
            }}>
              {isScheduled ? "–" : match.score_b}
            </span>
          </div>

          {/* Logo B — sem fundo */}
          <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {match.teams_b?.logo_url
              ? <img src={match.teams_b.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
              : <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: colorB }}>
                  {nameB.slice(0, 2).toUpperCase()}
                </span>
            }
          </div>

          {/* Nome B */}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1, minWidth: 0,
          }}>
            {nameB}
          </span>

        </div>

        <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0, margin: "0 16px" }} />

        {/* Delete */}
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          style={{
            flexShrink: 0, width: 26, height: 26, borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.07)",
            backgroundColor: "rgba(255,255,255,0.03)",
            color: "var(--color-danger)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            opacity: hovered ? 1 : 0.25,
            transition: "opacity 0.12s, border-color 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,68,68,0.45)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
        >
          <Trash2 size={12} strokeWidth={2} />
        </button>
      </Link>
    </div>
  );
}

// ─── DetalhesConfigTab ───────────────────────────────────────────────────────

const EDITION_STATUS_LABEL: Record<string, string> = {
  planned: "Planejada",
  ongoing: "Em andamento",
  closed: "Encerrada",
};

function DetalhesConfigTab({
  competition,
  edition,
  editionTeams,
  phases,
}: {
  competition: Competition;
  edition: Edition;
  editionTeams: EditionTeam[];
  phases: Phase[];
}) {
  function fmtDate(value: string | null): string {
    if (!value) return "—";
    const d = value.includes("T") ? value : `${value}T00:00:00`;
    return new Date(d).toLocaleDateString("pt-BR");
  }

  const teamCount = editionTeams.filter(et => !et.is_free_agent_pool).length;
  const rows = [
    { label: "Nome da edição", value: editionLabel(edition) },
    { label: "Status", value: EDITION_STATUS_LABEL[edition.status] ?? edition.status },
    { label: "Competição", value: competition.full_name ?? "—" },
    { label: "Temporada", value: edition.season_name ?? "—" },
    { label: "Data de início", value: fmtDate(edition.start_date) },
    { label: "Data de fim", value: fmtDate(edition.end_date) },
    { label: "Equipes inscritas", value: String(teamCount) },
    { label: "Fases", value: String(phases.length) },
  ];

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        {rows.map((row, idx) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3"
            style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
            <span className="font-mono text-xs uppercase tracking-widest shrink-0" style={{ color: "var(--color-text-secondary)" }}>
              {row.label}
            </span>
            <span className="font-mono text-sm font-medium text-right" style={{ color: "var(--color-text-primary)" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EdicaoConfigTab ─────────────────────────────────────────────────────────

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function EdicaoConfigTab({ selectedEditionId, selectedEditionName, inputClass, inputStyle }: {
  selectedEditionId: string; selectedEditionName: string; inputClass: string; inputStyle: any;
}) {
  const [editionStatus, setEditionStatus] = useState("planned");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showInHome, setShowInHome] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingShowInHome, setUpdatingShowInHome] = useState(false);

  useEffect(() => {
    if (!selectedEditionId) return;
    async function load() {
      const supabase = createClient();
      const [{ data: ed }, { data: settings }] = await Promise.all([
        supabase.from("competition_editions").select("status, show_in_home, start_date, end_date").eq("id", selectedEditionId).maybeSingle(),
        supabase.from("edition_settings").select("is_public").eq("edition_id", selectedEditionId).maybeSingle(),
      ]);
      setEditionStatus(ed?.status ?? "planned");
      setStartDate(toDateInputValue(ed?.start_date));
      setEndDate(toDateInputValue(ed?.end_date));
      setShowInHome(ed?.show_in_home ?? false);
      setIsPublic(settings?.is_public ?? false);
      setLoaded(true);
    }
    void load();
  }, [selectedEditionId]);

  async function handleShowInHomeChange(checked: boolean) {
    const previous = showInHome;
    setShowInHome(checked);
    setUpdatingShowInHome(true);
    const result = await atualizarVisibilidadeHome(selectedEditionId, checked);
    setUpdatingShowInHome(false);
    if ("error" in result) {
      setShowInHome(previous);
      toast("error", result.error);
    }
  }

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("status", editionStatus);
    fd.append("start_date", startDate);
    fd.append("end_date", endDate);
    fd.append("is_public", String(isPublic));
    const result = await editarEdicao(selectedEditionId, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Configurações salvas.");
  }

  if (!loaded) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#666", padding: "32px 0" }}>Carregando…</p>;

  const border = "1px solid rgba(255,255,255,0.08)";

  function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205" }}>{title}</span>
          {subtitle && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{subtitle}</p>}
        </div>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
      </div>
    );
  }

  const STATUS_OPTIONS = [
    { v: "planned", l: "Planejada", desc: "Ainda não iniciada" },
    { v: "ongoing", l: "Em andamento", desc: "Competição ativa" },
    { v: "closed", l: "Encerrada", desc: "Competição encerrada" },
  ];

  const homeVisibilityHint = (() => {
    if (!showInHome) return { text: "Não exibida na home", gray: false };
    if (editionStatus === "ongoing") return { text: "Será exibida na home", gray: false };
    if (editionStatus === "closed") return { text: "Encerrada — não exibida na home", gray: true };
    return { text: "Não exibida na home", gray: false };
  })();

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Status da edição" subtitle={selectedEditionName} />

      {/* Status */}
      <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
        {STATUS_OPTIONS.map((opt, idx) => (
          <div key={opt.v}
            onClick={() => setEditionStatus(opt.v)}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", cursor: "pointer", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", backgroundColor: editionStatus === opt.v ? "rgba(191,242,5,0.04)" : "transparent", transition: "background 0.12s", position: "relative" as const }}
            onMouseEnter={e => { if (editionStatus !== opt.v) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = editionStatus === opt.v ? "rgba(191,242,5,0.04)" : "transparent"; }}
          >
            {editionStatus === opt.v && (
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, backgroundColor: "#BFF205", borderRadius: 1 }} />
            )}
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${editionStatus === opt.v ? "#BFF205" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color 0.12s" }}>
              {editionStatus === opt.v && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#BFF205" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: editionStatus === opt.v ? "var(--color-text-primary)" : "rgba(255,255,255,0.4)", margin: 0 }}>{opt.l}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", margin: 0, marginTop: 1 }}>{opt.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader title="Período" />

      <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Data de início</p>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inputClass}
              style={{ ...inputStyle, colorScheme: "dark" as const }}
            />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Data de fim</p>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inputClass}
              style={{ ...inputStyle, colorScheme: "dark" as const }}
            />
          </div>
        </div>
      </div>

      <SectionHeader title="Visibilidade" />

      {/* Visibilidade */}
      <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Visível no 06.score</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", margin: 0, marginTop: 2 }}>Dados públicos disponíveis para o site</p>
          </div>
          <button type="button" onClick={() => setIsPublic(v => !v)}
            style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: isPublic ? "#BFF205" : "rgba(255,255,255,0.1)", transition: "background 0.15s", position: "relative" as const, flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: isPublic ? 23 : 3, width: 18, height: 18, borderRadius: "50%", backgroundColor: isPublic ? "#0a0a0a" : "#555", transition: "left 0.15s" }} />
          </button>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Exibir na home</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: homeVisibilityHint.gray ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.25)", margin: 0, marginTop: 2 }}>{homeVisibilityHint.text}</p>
            </div>
            <button type="button" disabled={updatingShowInHome} onClick={() => void handleShowInHomeChange(!showInHome)}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: updatingShowInHome ? "wait" : "pointer", backgroundColor: showInHome ? "#BFF205" : "rgba(255,255,255,0.1)", transition: "background 0.15s", position: "relative" as const, flexShrink: 0, opacity: updatingShowInHome ? 0.6 : 1 }}>
              <div style={{ position: "absolute", top: 3, left: showInHome ? 23 : 3, width: 18, height: 18, borderRadius: "50%", backgroundColor: showInHome ? "#0a0a0a" : "#555", transition: "left 0.15s" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ padding: "10px 28px", borderRadius: 9, border: "none", cursor: "pointer", backgroundColor: saving ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}

// ─── RankingConfigTab ────────────────────────────────────────────────────────

const RANKING_GROUPS = [
  {
    label: "PARTICIPAÇÃO GERAL",
    categories: [
      { code: "participation", label: "Participação na edição" },
    ],
  },
  {
    label: "FASE CLASSIFICATÓRIA",
    categories: [
      { code: "win_in_classification", label: "Vitória" },
      { code: "draw_in_classification", label: "Empate" },
      { code: "loss_in_classification", label: "Derrota" },
    ],
  },
  {
    label: "FASE ELIMINATÓRIA",
    categories: [
      { code: "participation_knockout", label: "Participação em mata-mata" },
      { code: "win_in_knockout", label: "Vitória em mata-mata" },
      { code: "draw_in_knockout", label: "Empate em mata-mata" },
      { code: "loss_in_knockout", label: "Derrota em mata-mata" },
    ],
  },
  {
    label: "POSIÇÕES FINAIS",
    categories: [
      { code: "first_place", label: "1º lugar (Campeão)" },
      { code: "second_place", label: "2º lugar (Vice)" },
      { code: "third_place", label: "3º lugar" },
      { code: "fourth_place", label: "4º lugar" },
      { code: "fifth_to_eighth", label: "5º ao 8º lugar" },
      { code: "ninth_plus", label: "9º lugar ou mais" },
    ],
  },
];

function RankingConfigTab({
  selectedEditionId,
  inputClass,
  inputStyle,
}: {
  selectedEditionId: string;
  inputClass: string;
  inputStyle: React.CSSProperties;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (!selectedEditionId) return;
    setLoaded(false);
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("edition_ranking_config")
        .select("category_code, points_value")
        .eq("edition_id", selectedEditionId);
      const map: Record<string, string> = {};
      (data ?? []).forEach(r => { map[r.category_code] = String(r.points_value); });
      setValues(map);
      setLoaded(true);
    }
    void load();
  }, [selectedEditionId]);

  function handleChange(code: string, val: string) {
    setValues(prev => ({ ...prev, [code]: val }));
  }

  async function handleSave() {
    setSaving(true);
    const allCodes = RANKING_GROUPS.flatMap(g => g.categories.map(c => c.code));
    const configs = allCodes.map(code => ({
      category_code: code,
      points_value: parseInt(values[code] ?? "0", 10) || 0,
    }));
    const result = await salvarRankingConfig(selectedEditionId, configs);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Configuração de ranking salva.");
  }

  async function handleRecalculate() {
    setRecalculating(true);
    const supabase = createClient();
    const { data: edition } = await supabase
      .from("competition_editions")
      .select("competition_id, competitions(organization_id, gender, sport_slug)")
      .eq("id", selectedEditionId)
      .maybeSingle();
    const comp = (edition?.competitions as any);
    if (!comp) { toast("error", "Competição não encontrada."); setRecalculating(false); return; }
    const { error } = await supabase.rpc("calculate_ranking", {
      p_organization_id: comp.organization_id,
      p_gender: comp.gender,
      p_sport_slug: comp.sport_slug,
    });
    setRecalculating(false);
    if (error) { toast("error", error.message); return; }
    toast("success", "Ranking recalculado.");
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-xs" style={{ color: "#A6A6A6" }}>CARREGANDO...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <p className="mb-6 font-mono text-xs leading-relaxed" style={{ color: "#A6A6A6" }}>
        Define quantos pontos cada equipe acumula no ranking histórico desta competição por cada resultado ou conquista nesta edição.
      </p>

      <div className="flex flex-col gap-8">
        {RANKING_GROUPS.map(group => (
          <div key={group.label}>
            <p className="mb-3 font-mono text-xs font-bold tracking-widest uppercase"
              style={{ color: "var(--color-text-secondary)", fontSize: "10px", letterSpacing: "0.16em" }}>
              {group.label}
            </p>
            <div className="flex flex-col gap-2">
              {group.categories.map(cat => (
                <div
                  key={cat.code}
                  className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                >
                  <span className="font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
                    {cat.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs" style={{ color: "#A6A6A6" }}>pts</span>
                    <input
                      type="number"
                      min={0}
                      value={values[cat.code] ?? "0"}
                      onChange={e => handleChange(cat.code, e.target.value)}
                      className={inputClass}
                      style={{ ...inputStyle, width: "72px", textAlign: "right" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || recalculating}
          className="font-mono text-xs font-bold px-5 py-2.5 rounded-lg transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "#0a0a0a" }}
        >
          {saving ? "SALVANDO..." : "SALVAR CONFIGURAÇÃO DE RANKING"}
        </button>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={saving || recalculating}
          className="font-mono text-xs font-bold px-5 py-2.5 rounded-lg border transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--color-border)", color: "var(--color-brand)", backgroundColor: "transparent" }}
        >
          {recalculating ? "CALCULANDO..." : "↻ RECALCULAR"}
        </button>
      </div>
    </div>
  );
}

// ─── PremiacoesTab ────────────────────────────────────────────────────────────

function PremiacoesTab({
  awards, loadingAwards, editionTeams, editionAthletes, editionStaff, onRemover, onRefreshAwards, selectedEditionId,
}: {
  awards: any[];
  loadingAwards: boolean;
  editionTeams: any[];
  editionAthletes: any[];
  editionStaff: any[];
  onRemover: (id: string) => void;
  onRefreshAwards: (editionId: string) => void;
  selectedEditionId: string;
}) {
  const [activeSub, setActiveSub] = useState<"individuais" | "coletivas" | "tots">("individuais");
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingColetiva, setSavingColetiva] = useState<string | null>(null);
  const border = "1px solid rgba(255,255,255,0.08)";

  // Equipes reais (sem free agent pool)
  const realTeams = editionTeams.filter((et: any) => !et.is_free_agent_pool && et.teams);
  const teamCount = realTeams.length;

  // Estado centralizado das seleções individuais: { [awardType]: { teamId, memberId } }
  const INDIVIDUAL_AWARDS = [
    { awardType: "top_scorer",     label: "Artilheiro",             icon: <span style={{ fontSize: 16 }}>⚽</span> },
    { awardType: "top_assists",    label: "Líder de assistências",  icon: <span style={{ fontSize: 16 }}>🎯</span> },
    { awardType: "mvp",            label: "MVP",                    icon: <span style={{ fontSize: 16 }}>⭐</span> },
    { awardType: "best_goalkeeper",label: "Melhor goleiro",         icon: <span style={{ fontSize: 16 }}>🧤</span> },
    { awardType: "best_coach",     label: "Melhor técnico",         icon: <span style={{ fontSize: 16 }}>📋</span> },
  ];

  // Inicializa seleções a partir dos awards já salvos
  function buildInitialSelections() {
    const result: Record<string, { teamId: string; memberId: string }> = {};
    for (const { awardType } of INDIVIDUAL_AWARDS) {
      const isCoach = awardType === "best_coach";
      const idField = isCoach ? "staff_member_id" : "athlete_id";
      const memberList = isCoach ? editionStaff : editionAthletes;
      const existing = awards.find((a: any) => a.award_type === awardType);
      const existingMemberId = existing?.[idField] ?? "";
      const existingEntry = memberList.find((a: any) => a[idField] === existingMemberId);
      result[awardType] = {
        teamId: existingEntry?.edition_team_id ?? "",
        memberId: existingMemberId,
      };
    }
    return result;
  }

  const [selections, setSelections] = useState<Record<string, { teamId: string; memberId: string }>>(buildInitialSelections);

  // Re-inicializa quando awards carregam (ex: troca de edição)
  useEffect(() => {
    setSelections(buildInitialSelections());
  }, [awards]);

  function setTeamForAward(awardType: string, teamId: string) {
    setSelections(prev => ({ ...prev, [awardType]: { teamId, memberId: "" } }));
  }

  function setMemberForAward(awardType: string, memberId: string) {
    setSelections(prev => ({ ...prev, [awardType]: { ...prev[awardType], memberId } }));
  }

  // Verifica se alguma seleção mudou em relação ao que está salvo
  const hasIndividualChanges = INDIVIDUAL_AWARDS.some(({ awardType }) => {
    const isCoach = awardType === "best_coach";
    const idField = isCoach ? "staff_member_id" : "athlete_id";
    const existing = awards.find((a: any) => a.award_type === awardType);
    const savedMemberId = existing?.[idField] ?? "";
    return selections[awardType]?.memberId !== savedMemberId;
  });

  async function handleSaveBatchIndividual() {
    setSavingBatch(true);
    const toSave = INDIVIDUAL_AWARDS.filter(({ awardType }) => {
      const isCoach = awardType === "best_coach";
      const idField = isCoach ? "staff_member_id" : "athlete_id";
      const existing = awards.find((a: any) => a.award_type === awardType);
      const savedMemberId = existing?.[idField] ?? "";
      return selections[awardType]?.memberId && selections[awardType].memberId !== savedMemberId;
    });

    let hasError = false;
    for (const { awardType } of toSave) {
      const isCoach = awardType === "best_coach";
      const { memberId } = selections[awardType];
      const fd = new FormData();
      fd.append("award_type", awardType);
      if (isCoach) fd.append("staff_member_id", memberId);
      else fd.append("athlete_id", memberId);
      const result = await atribuirPremiacao(selectedEditionId, fd);
      if ("error" in result) { toast("error", result.error); hasError = true; break; }
    }

    setSavingBatch(false);
    if (!hasError) {
      toast("success", "Premiações individuais salvas.");
      onRefreshAwards(selectedEditionId);
    }
  }

  // Busca premiação atual por tipo
  function getAward(type: string) {
    return awards.find((a: any) => a.award_type === type);
  }

  // Premiação coletiva da equipe (registro sem atleta/staff individual)
  function getCollectiveTeamId(awardType: string) {
    const teamAward = awards.find((a: any) =>
      a.award_type === awardType &&
      a.winning_team_id &&
      !a.athlete_id &&
      !a.staff_member_id,
    );
    return teamAward?.winning_team_id ?? "";
  }

  // Seleções coletivas pendentes: { [awardType]: teamId }
  const [collectiveSelections, setCollectiveSelections] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const a of awards) {
      if (a.winning_team_id && !a.athlete_id && !a.staff_member_id) {
        result[a.award_type] = a.winning_team_id;
      }
    }
    return result;
  });

  useEffect(() => {
    const result: Record<string, string> = {};
    for (const a of awards) {
      if (a.winning_team_id && !a.athlete_id && !a.staff_member_id) {
        result[a.award_type] = a.winning_team_id;
      }
    }
    setCollectiveSelections(result);
  }, [awards]);

  
  // ── AwardCard individual (controlado pelo pai) ────────────────────────────
  function IndividualAwardCard({ awardType, label, icon }: { awardType: string; label: string; icon: React.ReactNode }) {
    const isCoach = awardType === "best_coach";
    const idField = isCoach ? "staff_member_id" : "athlete_id";
    const nameField = isCoach ? "staff_members" : "athletes";
    const memberList = isCoach ? editionStaff : editionAthletes;

    const existing = getAward(awardType);
    const { teamId: selectedTeamId, memberId: selectedMemberId } = selections[awardType] ?? { teamId: "", memberId: "" };

    const [showDropdown, setShowDropdown] = useState(false);
    const [search, setSearch] = useState("");
    const dropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handle(e: MouseEvent) {
        if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
      }
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }, []);

    const membersForTeam = selectedTeamId
      ? memberList.filter((a: any) => a.edition_team_id === selectedTeamId)
      : [];

    const filteredMembers = search.trim()
      ? membersForTeam.filter((a: any) => {
          const name = a[nameField]?.surname ?? a[nameField]?.full_name ?? "";
          return name.toLowerCase().includes(search.toLowerCase());
        })
      : membersForTeam;

    const selectedEntry = memberList.find((a: any) => a[idField] === selectedMemberId);
    const selectedPerson = selectedEntry?.[nameField];
    const selectedET = realTeams.find((et: any) => et.id === selectedTeamId);

    // Determina se este card tem mudança pendente (para highlight visual)
    const savedMemberId = existing?.[idField] ?? "";
    const isDirty = selectedMemberId !== savedMemberId;

    return (
      <div style={{ borderRadius: 12, border: isDirty ? "1px solid rgba(191,242,5,0.25)" : border, backgroundColor: existing ? "rgba(191,242,5,0.03)" : "var(--color-surface)", overflow: "visible", transition: "all 0.15s" }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: existing ? "rgba(191,242,5,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${existing ? "rgba(191,242,5,0.25)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: existing ? "#BFF205" : "rgba(255,255,255,0.35)", margin: 0 }}>{label}</p>
            {existing && selectedPerson && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                {selectedPerson.photo_url
                  ? <img src={selectedPerson.photo_url} alt="" style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "#555" }}>{(selectedPerson.surname ?? selectedPerson.full_name ?? "?").slice(0, 2).toUpperCase()}</div>
                }
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{selectedPerson.surname ?? selectedPerson.full_name}</p>
                {selectedET?.teams?.logo_url && <img src={selectedET.teams.logo_url} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{selectedET?.teams?.abbreviation ?? selectedET?.teams?.full_name ?? ""}</span>
              </div>
            )}
            {!existing && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", margin: 0, marginTop: 1 }}>Não atribuído</p>
            )}
          </div>
          {existing && (
            <button type="button" onClick={() => onRemover(existing.id)}
              style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,100,100,0.2)", background: "none", color: "rgba(255,100,100,0.5)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.5)"; e.currentTarget.style.color = "#FF4444"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,100,100,0.2)"; e.currentTarget.style.color = "rgba(255,100,100,0.5)"; }}>×</button>
          )}
        </div>

        {/* Passo 1 — Selecionar equipe / Passo 2 — Selecionar membro */}
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }} ref={dropRef}>

          {/* Passo 1: grid de equipes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 6 }}>
            {realTeams.map((et: any) => {
              const isSelected = et.id === selectedTeamId;
              return (
                <div key={et.id}
                  onClick={() => { setTeamForAward(awardType, isSelected ? "" : et.id); setSearch(""); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 4px", borderRadius: 8, border: `1px solid ${isSelected ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`, backgroundColor: isSelected ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.1s" }}>
                  {et.teams?.logo_url
                    ? <img src={et.teams.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{(et.teams?.abbreviation ?? "?").slice(0, 2)}</span></div>
                  }
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: isSelected ? "#BFF205" : "rgba(255,255,255,0.3)", textAlign: "center" as const }}>
                    {et.teams?.abbreviation ?? et.teams?.full_name?.slice(0, 3)?.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Passo 2: dropdown de membro (só após selecionar equipe) */}
          {selectedTeamId && (
            <div style={{ position: "relative" }}>
              <div onClick={() => { setShowDropdown(v => !v); setSearch(""); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${showDropdown ? "rgba(191,242,5,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, cursor: "pointer", transition: "border-color 0.12s" }}>
                {selectedMemberId && selectedPerson ? (
                  <>
                    {selectedPerson.photo_url
                      ? <img src={selectedPerson.photo_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "#555", flexShrink: 0 }}>{(selectedPerson.surname ?? selectedPerson.full_name ?? "?").slice(0, 2).toUpperCase()}</div>
                    }
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>{selectedPerson.surname ?? selectedPerson.full_name}</span>
                  </>
                ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", flex: 1 }}>{isCoach ? "Selecionar técnico…" : "Selecionar atleta…"}</span>
                )}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.3 }}>
                  <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>

              {showDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200, backgroundColor: "#0e0e0e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder={isCoach ? "Buscar técnico…" : "Buscar atleta…"}
                      style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)" }} />
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {filteredMembers.length === 0
                      ? <p style={{ padding: "16px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "#444" }}>Nenhum resultado.</p>
                      : filteredMembers.map((entry: any, idx: number) => {
                          const person = entry[nameField];
                          const isSelected = entry[idField] === selectedMemberId;
                          return (
                            <div key={entry[idField]}
                              onClick={() => { setMemberForAward(awardType, entry[idField]); setShowDropdown(false); setSearch(""); }}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", backgroundColor: isSelected ? "rgba(191,242,5,0.07)" : "transparent", transition: "background 0.1s" }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isSelected ? "rgba(191,242,5,0.07)" : "transparent"; }}>
                              {person?.photo_url
                                ? <img src={person.photo_url} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                : <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#555", flexShrink: 0 }}>{(person?.surname ?? person?.full_name ?? "?").slice(0, 2).toUpperCase()}</div>
                              }
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: isSelected ? "#BFF205" : "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{person?.surname ?? person?.full_name ?? "—"}</p>
                              </div>
                              {isSelected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── AwardCard coletivo (controlado pelo pai) ──────────────────────────────
  function CollectiveAwardCard({ awardType, label, icon, rank }: { awardType: string; label: string; icon: React.ReactNode; rank: number }) {
    const existing = awards.find((a: any) =>
      a.award_type === awardType &&
      a.winning_team_id &&
      !a.athlete_id &&
      !a.staff_member_id,
    );
    const selectedTeamId = collectiveSelections[awardType] ?? "";
    const selectedET = realTeams.find((et: any) => et.team_id === selectedTeamId);
    const savedTeamId = getCollectiveTeamId(awardType);
    const isDirty = selectedTeamId !== savedTeamId;

    const usedTeamIds = new Set(
      Object.entries(collectiveSelections)
        .filter(([type]) => type !== awardType)
        .map(([, teamId]) => teamId)
        .filter(Boolean)
    );

    return (
      <div style={{ borderRadius: 12, border: isDirty ? "1px solid rgba(191,242,5,0.25)" : border, backgroundColor: existing ? "rgba(191,242,5,0.03)" : "var(--color-surface)", overflow: "visible", transition: "all 0.15s" }}>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: existing ? "rgba(191,242,5,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${existing ? "rgba(191,242,5,0.25)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon ?? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: existing ? "#BFF205" : "rgba(255,255,255,0.3)" }}>{rank}°</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: existing ? "#BFF205" : "rgba(255,255,255,0.35)", margin: 0 }}>{label}</p>
            {selectedET ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                {selectedET.teams?.logo_url && <img src={selectedET.teams.logo_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{selectedET.teams?.short_name ?? selectedET.teams?.full_name}</p>
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", margin: 0, marginTop: 1 }}>Não atribuído</p>
            )}
          </div>
          {existing && (
            <button type="button" onClick={() => onRemover(existing.id)}
              style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,100,100,0.2)", background: "none", color: "rgba(255,100,100,0.5)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.5)"; e.currentTarget.style.color = "#FF4444"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,100,100,0.2)"; e.currentTarget.style.color = "rgba(255,100,100,0.5)"; }}>×</button>
          )}
        </div>

        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 6 }}>
            {realTeams.map((et: any) => {
              const isSelected = et.team_id === selectedTeamId;
              const isUsed = usedTeamIds.has(et.team_id);
              return (
                <div key={et.team_id}
                  onClick={() => !isUsed && setCollectiveSelections(prev => ({ ...prev, [awardType]: isSelected ? "" : et.team_id }))}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 4px", borderRadius: 8, border: `1px solid ${isSelected ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`, backgroundColor: isSelected ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)", cursor: isUsed ? "default" : "pointer", transition: "all 0.1s", opacity: isUsed && !isSelected ? 0.25 : 1 }}>
                  {et.teams?.logo_url
                    ? <img src={et.teams.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{(et.teams?.abbreviation ?? "?").slice(0, 2)}</span></div>
                  }
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: isSelected ? "#BFF205" : "rgba(255,255,255,0.3)", textAlign: "center" as const }}>
                    {et.teams?.abbreviation ?? et.teams?.full_name?.slice(0, 3)?.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Posições coletivas dinâmicas baseadas no número de equipes ───────────
  function buildCollectiveSlots(): { awardType: string; label: string; rank: number; icon?: React.ReactNode }[] {
    const slots: { awardType: string; label: string; rank: number; icon?: React.ReactNode }[] = [];
    if (teamCount >= 1) slots.push({ awardType: "champion", label: "Campeão", rank: 1, icon: <span style={{ fontSize: 16 }}>🏆</span> });
    if (teamCount >= 2) slots.push({ awardType: "runner_up", label: "Vice-campeão", rank: 2, icon: <span style={{ fontSize: 16 }}>🥈</span> });
    if (teamCount >= 3) slots.push({ awardType: "third_place", label: "Terceiro lugar", rank: 3, icon: <span style={{ fontSize: 16 }}>🥉</span> });
    if (teamCount >= 4) slots.push({ awardType: "fourth_place", label: "Quarto lugar", rank: 4 });
    const rankLabels: Record<number, string> = { 5: "5° lugar", 6: "6° lugar", 7: "7° lugar", 8: "8° lugar", 9: "9° lugar", 10: "10° lugar", 11: "11° lugar", 12: "12° lugar", 13: "13° lugar", 14: "14° lugar", 15: "15° lugar", 16: "16° lugar", 17: "17° lugar", 18: "18° lugar", 19: "19° lugar", 20: "20° lugar" };
    const typeLabels: Record<number, string> = { 5: "fifth_place", 6: "sixth_place", 7: "seventh_place", 8: "eighth_place", 9: "ninth_place", 10: "tenth_place", 11: "eleventh_place", 12: "twelfth_place", 13: "thirteenth_place", 14: "fourteenth_place", 15: "fifteenth_place", 16: "sixteenth_place", 17: "seventeenth_place", 18: "eighteenth_place", 19: "nineteenth_place", 20: "twentieth_place" };
    for (let r = 5; r <= Math.min(teamCount, 20); r++) {
      slots.push({ awardType: typeLabels[r], label: rankLabels[r], rank: r });
    }
    if (teamCount > 20) slots.push({ awardType: "twenty_first_or_more", label: "21° ou mais", rank: 21 });
    return slots;
  }

  const collectiveSlots = buildCollectiveSlots();

  const hasCollectiveChanges = collectiveSlots.some(({ awardType }) => {
    const saved = getCollectiveTeamId(awardType);
    return (collectiveSelections[awardType] ?? "") !== saved;
  });

  const [savingBatchColetiva, setSavingBatchColetiva] = useState(false);

  async function handleSaveBatchColetiva() {
    setSavingBatchColetiva(true);
    const toSave = collectiveSlots.filter(({ awardType }) => {
      const saved = getCollectiveTeamId(awardType);
      return collectiveSelections[awardType] && collectiveSelections[awardType] !== saved;
    });

    let hasError = false;
    for (const { awardType } of toSave) {
      const fd = new FormData();
      fd.append("award_type", awardType);
      fd.append("winning_team_id", collectiveSelections[awardType]);
      const result = await atribuirPremiacao(selectedEditionId, fd);
      if ("error" in result) { toast("error", result.error); hasError = true; break; }
    }

    setSavingBatchColetiva(false);
    if (!hasError) {
      toast("success", "Premiações coletivas salvas.");
      onRefreshAwards(selectedEditionId);
    }
  }

  if (loadingAwards) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#666", padding: "32px 0" }}>Carregando…</p>;

  return (
    <div style={{ maxWidth: activeSub === "tots" ? "100%" : 640, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Sub-abas */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {[{ key: "individuais", label: "INDIVIDUAIS" }, { key: "coletivas", label: "COLETIVAS" }, { key: "tots", label: "TOTS" }].map(sub => (
          <button key={sub.key} type="button" onClick={() => setActiveSub(sub.key as any)}
            style={{ padding: "10px 20px", border: "none", borderBottom: `2px solid ${activeSub === sub.key ? "#BFF205" : "transparent"}`, backgroundColor: "transparent", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: activeSub === sub.key ? "#BFF205" : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.12s", marginBottom: -1 }}>
            {sub.label}
          </button>
        ))}
      </div>

      {/* INDIVIDUAIS */}
      {activeSub === "individuais" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {INDIVIDUAL_AWARDS.map(({ awardType, label, icon }) => (
            <IndividualAwardCard key={awardType} awardType={awardType} label={label} icon={icon} />
          ))}
          {/* Botão unificado */}
          <button type="button" onClick={handleSaveBatchIndividual}
            disabled={savingBatch || !hasIndividualChanges}
            style={{ marginTop: 4, width: "100%", padding: "12px", borderRadius: 10, border: "none", backgroundColor: hasIndividualChanges ? "#BFF205" : "rgba(255,255,255,0.06)", color: hasIndividualChanges ? "#0a0a0a" : "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: hasIndividualChanges ? "pointer" : "default", opacity: savingBatch ? 0.5 : 1, transition: "all 0.15s" }}>
            {savingBatch ? "Salvando…" : "Salvar Premiações Individuais"}
          </button>
        </div>
      )}

      {/* COLETIVAS */}
      {activeSub === "coletivas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {teamCount === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Nenhuma equipe inscrita nesta edição.</p>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
                {teamCount} equipes participando — {collectiveSlots.length} posições disponíveis
              </p>
              {collectiveSlots.map(slot => (
                <CollectiveAwardCard key={slot.awardType} {...slot} />
              ))}
              <button type="button" onClick={handleSaveBatchColetiva}
                disabled={savingBatchColetiva || !hasCollectiveChanges}
                style={{ marginTop: 4, width: "100%", padding: "12px", borderRadius: 10, border: "none", backgroundColor: hasCollectiveChanges ? "#BFF205" : "rgba(255,255,255,0.06)", color: hasCollectiveChanges ? "#0a0a0a" : "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: hasCollectiveChanges ? "pointer" : "default", opacity: savingBatchColetiva ? 0.5 : 1, transition: "all 0.15s" }}>
                {savingBatchColetiva ? "Salvando…" : "Salvar Premiações Coletivas"}
              </button>
            </>
          )}
        </div>
      )}

      {/* TOTS */}
      {activeSub === "tots" && (
        <TotsTab selectedEditionId={selectedEditionId} />
      )}
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
  onClose,
  onSuccess,
}: {
  phases: Phase[];
  initialPhaseId?: string;
  rounds: Round[];
  editionTeams: EditionTeam[];
  onClose: () => void;
  onSuccess: () => void;
  inputClass: string;
  inputStyle: React.CSSProperties;
  venues: { id: string; full_name: string }[];
}) {
  const [phaseId, setPhaseId] = useState(initialPhaseId || (phases[0]?.id ?? ""));
  const [roundId, setRoundId] = useState("");
  const [teamAId, setTeamAId] = useState<string>("tbd");
  const [teamBId, setTeamBId] = useState<string>("tbd");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phaseTeamIds, setPhaseTeamIds] = useState<string[]>([]);
  const [loadingPhaseTeams, setLoadingPhaseTeams] = useState(false);

  const roundsForPhase = rounds.filter(r => r.phase_id === phaseId);
  const selectedRound = rounds.find(r => r.id === roundId);
  const isLegs = selectedRound?.legs ?? false;
  const selectedPhase = phases.find(p => p.id === phaseId);

  useEffect(() => {
    if (!phaseId) return;
    async function load() {
      setLoadingPhaseTeams(true);
      const supabase = createClient();
      const { data } = await supabase.from("phase_teams").select("edition_team_id").eq("phase_id", phaseId);
      const etIds = (data ?? []).map((r: any) => r.edition_team_id);
      const teamIds = editionTeams.filter(et => etIds.includes(et.id) && !et.is_free_agent_pool).map(et => et.team_id);
      setPhaseTeamIds(teamIds);
      setLoadingPhaseTeams(false);
    }
    load();
  }, [phaseId, editionTeams]);

  useEffect(() => { setRoundId(""); setTeamAId("tbd"); setTeamBId("tbd"); setError(null); }, [phaseId]);

  const teamsForPhase: (Team & { _tbd?: boolean })[] = [
    { id: "tbd", full_name: "A definir", abbreviation: "TBD", logo_url: null, _tbd: true },
    ...editionTeams.filter(et => !et.is_free_agent_pool && et.teams && phaseTeamIds.includes(et.team_id)).map(et => et.teams as Team),
  ];

  async function handleCriar() {
    if (!phaseId || !roundId) { setError("Selecione o estágio."); return; }
    if (teamAId === teamBId && teamAId !== "tbd") { setError("Os dois times não podem ser iguais."); return; }
    setCreating(true); setError(null);
    const aId = teamAId === "tbd" ? null : teamAId;
    const bId = teamBId === "tbd" ? null : teamBId;
    const result = await criarConfronto(phaseId, roundId, aId, bId);
    setCreating(false);
    if ("error" in result) { setError(result.error); return; }
    onSuccess();
  }

  const border = "1px solid rgba(255,255,255,0.08)";

  function TeamCard({ id, selected, onClick, disabled }: { id: string; selected: boolean; onClick: () => void; disabled?: boolean }) {
    const team = teamsForPhase.find(t => t.id === id);
    const isTbd = id === "tbd" || !team || team._tbd;
    return (
      <div onClick={disabled ? undefined : onClick} style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "14px 8px", borderRadius: 10,
        border: `1px solid ${selected ? "rgba(191,242,5,0.45)" : "rgba(255,255,255,0.07)"}`,
        backgroundColor: selected ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.02)",
        cursor: disabled ? "default" : "pointer", transition: "all 0.12s",
        opacity: disabled ? 0.4 : 1,
      }}
        onMouseEnter={e => { if (!disabled && !selected) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; } }}
        onMouseLeave={e => { if (!disabled && !selected) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"; } }}
      >
        <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!isTbd && team?.logo_url
            ? <img src={team.logo_url} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
            : <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>?</span>
              </div>
          }
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: selected ? "#BFF205" : "rgba(255,255,255,0.5)", textAlign: "center", letterSpacing: "0.04em" }}>
          {isTbd ? "A definir" : (team?.abbreviation ?? team?.full_name ?? "—")}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.78)", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 420, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>Novo confronto</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, marginTop: 2 }}>
              {selectedPhase?.custom_label ?? selectedPhase?.full_name ?? "—"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border, background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.4)"; e.currentTarget.style.color = "#BFF205"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>×</button>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Fase — só mostra se há mais de uma */}
          {phases.length > 1 && (
            <div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Fase</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
                {phases.map(p => (
                  <button key={p.id} type="button" onClick={() => setPhaseId(p.id)}
                    style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${phaseId === p.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: phaseId === p.id ? "rgba(191,242,5,0.08)" : "transparent", color: phaseId === p.id ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                    {p.custom_label ?? p.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estágio */}
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Estágio *</span>
            {roundsForPhase.length === 0 ? (
              <p style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "#F2C005", backgroundColor: "rgba(242,192,5,0.06)", border: "1px solid rgba(242,192,5,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                Nenhuma rodada cadastrada nesta fase.
              </p>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
                {roundsForPhase.map(r => (
                  <button key={r.id} type="button" onClick={() => setRoundId(r.id)}
                    style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${roundId === r.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: roundId === r.id ? "rgba(191,242,5,0.08)" : "transparent", color: roundId === r.id ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                    {r.custom_label ?? r.name}
                  </button>
                ))}
              </div>
            )}
            {selectedRound && (
              <p style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
                {isLegs ? "Ida e volta" : "Jogo único"}
                {selectedRound.aggregate_score ? " · Placar agregado" : ""}
              </p>
            )}
          </div>

          {/* Times — visual com logos */}
          {loadingPhaseTeams ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Carregando equipes…</p>
          ) : (
            <div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>Times</span>
              <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                {/* Time A — dropdown estilizado */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(191,242,5,0.6)", marginBottom: 4 }}>TIME A</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))", gap: 6 }}>
                    {teamsForPhase.map(t => (
                      <div key={t.id}
                        onClick={() => { if (t.id !== teamBId || t.id === "tbd") setTeamAId(t.id); }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          padding: "8px 4px", borderRadius: 8,
                          border: `1px solid ${teamAId === t.id ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`,
                          backgroundColor: teamAId === t.id ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)",
                          cursor: "pointer", transition: "all 0.1s",
                          opacity: t.id === teamBId && t.id !== "tbd" ? 0.3 : 1,
                        }}>
                        {t.logo_url
                          ? <img src={t.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                          : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>?</span>
                            </div>
                        }
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: teamAId === t.id ? "#BFF205" : "rgba(255,255,255,0.3)", textAlign: "center", letterSpacing: "0.02em" }}>
                          {t._tbd ? "TBD" : (t.abbreviation ?? t.full_name?.slice(0, 3)?.toUpperCase() ?? "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>×</span>

                {/* Time B */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>TIME B</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))", gap: 6 }}>
                    {teamsForPhase.map(t => (
                      <div key={t.id}
                        onClick={() => { if (t.id !== teamAId || t.id === "tbd") setTeamBId(t.id); }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          padding: "8px 4px", borderRadius: 8,
                          border: `1px solid ${teamBId === t.id ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`,
                          backgroundColor: teamBId === t.id ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)",
                          cursor: "pointer", transition: "all 0.1s",
                          opacity: t.id === teamAId && t.id !== "tbd" ? 0.3 : 1,
                        }}>
                        {t.logo_url
                          ? <img src={t.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                          : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>?</span>
                            </div>
                        }
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700, color: teamBId === t.id ? "#BFF205" : "rgba(255,255,255,0.3)", textAlign: "center", letterSpacing: "0.02em" }}>
                          {t._tbd ? "TBD" : (t.abbreviation ?? t.full_name?.slice(0, 3)?.toUpperCase() ?? "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4444", backgroundColor: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 9, border, background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="button" onClick={handleCriar} disabled={creating || !roundId}
            style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: creating || !roundId ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: creating || !roundId ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
            {creating ? "Criando…" : "Criar confronto"}
          </button>
        </div>
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

  const teamsForMatchup = teamsForPhase.filter(t =>
    !t._tbd &&
    (t.id === matchup.team_a_id || t.id === matchup.team_b_id)
  );
 
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
    const { atualizarCampoPartida } = await import("@/app/(lab)/partidas/[matchId]/actions");
    const result = await atualizarCampoPartida(matchId, field, value || null);
    if ("error" in result) {
      toast("error", result.error);
      return;
    }
    setMatchesLocal(prev => prev.map(m => m.id === matchId ? { ...m, [field]: value || null } : m));
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
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, backgroundColor: "rgba(191,242,5,0.03)" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>
              Editar confronto
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, marginTop: 3 }}>
              {matchup.round_label}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(191,242,5,0.4)"; (e.currentTarget as HTMLElement).style.color = "#BFF205"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>×</button>
        </div>
 
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
 
          {/* Seção times */}
          <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205" }}>Times do confronto</span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Time A</span>
                <LabSelect
                  value={teamAId}
                  onChange={setTeamAId}
                  options={teamsForPhase.map((t) => ({
                    value: t.id,
                    label: t._tbd ? "A definir" : `${t.abbreviation ?? ""} — ${t.full_name}`,
                    disabled: t.id === teamBId && t.id !== "tbd",
                  }))}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Time B</span>
                <LabSelect
                  value={teamBId}
                  onChange={setTeamBId}
                  options={teamsForPhase.map((t) => ({
                    value: t.id,
                    label: t._tbd ? "A definir" : `${t.abbreviation ?? ""} — ${t.full_name}`,
                    disabled: t.id === teamAId && t.id !== "tbd",
                  }))}
                />
              </label>
            </div>
            {error && <p style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: 8 }}>{error}</p>}
            <button onClick={handleSaveTeams} disabled={saving}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = saving ? "0.6" : "0.85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = saving ? "0.6" : "1"; }}>
              {saving ? "Salvando…" : "Salvar times"}
            </button>
          </div>
 
          {/* Seção partidas */}
          <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205" }}>
                Partidas {isLegs ? "· Ida e Volta" : "· Jogo único"}
              </span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
            </div>
 
            {loadingMatches ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>Carregando…</p>
            ) : matchesLocal.length === 0 ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>
                {hasTeams ? "Nenhuma partida adicionada." : "Defina os times para adicionar partidas."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matchesLocal.map((m, i) => (
                  <div key={m.id} style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.04)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, color: "#BFF205", textTransform: "uppercase" as const, letterSpacing: "0.12em" }}>
                        {isLegs ? (m.is_second_leg ? "✈ Volta" : "🏠 Ida") : "Jogo único"}
                      </span>
                      <button onClick={() => handleDeleteMatch(m.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,100,100,0.5)", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.04em", transition: "color 0.12s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#FF4444")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,100,100,0.5)")}>
                        Remover
                      </button>
                    </div>
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Times por jogo — manda/visita */}
                      {isLegs && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 10, color: "#BFF205", fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Mandante</span>
                            <LabSelect
                              value={m.team_a_id ?? ""}
                              onChange={(v) => handleUpdateMatch(m.id, "team_a_id", v)}
                              placeholder="A definir"
                              options={teamsForMatchup.map((t) => ({ value: t.id, label: t.abbreviation ?? t.full_name }))}
                            />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Visitante</span>
                            <LabSelect
                              value={m.team_b_id ?? ""}
                              onChange={(v) => handleUpdateMatch(m.id, "team_b_id", v)}
                              placeholder="A definir"
                              options={teamsForMatchup.map((t) => ({ value: t.id, label: t.abbreviation ?? t.full_name }))}
                            />
                          </label>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Data</span>
                          <input type="date" defaultValue={m.match_date ?? ""} onBlur={e => handleUpdateMatch(m.id, "match_date", e.target.value)}
                            style={{ padding: "7px 10px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)", outline: "none", colorScheme: "dark" as any, width: "100%" }} />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Horário</span>
                          <input type="time" defaultValue={m.match_time?.slice(0,5) ?? ""} onBlur={e => handleUpdateMatch(m.id, "match_time", e.target.value)}
                            style={{ padding: "7px 10px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)", outline: "none", colorScheme: "dark" as any, width: "100%" }} />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>Local</span>
                          <LabSelect
                            value={m.venue_id ?? ""}
                            onChange={(v) => handleUpdateMatch(m.id, "venue_id", v)}
                            placeholder="—"
                            options={venues.map((v) => ({ value: v.id, label: v.full_name }))}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            {/* Botões de adicionar partida */}
            {hasTeams && !loadingMatches && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {!isLegs && matchesLocal.length === 0 && (
                  <button onClick={() => handleAddMatch(false)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(191,242,5,0.3)", backgroundColor: "rgba(191,242,5,0.07)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.12)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.5)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.07)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; }}>
                    + Adicionar partida
                  </button>
                )}
                {isLegs && !matchesLocal.find(m => !m.is_second_leg) && (
                  <button onClick={() => handleAddMatch(false)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(191,242,5,0.3)", backgroundColor: "rgba(191,242,5,0.07)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.12)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.5)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.07)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; }}>
                    🏠 + Jogo de ida
                  </button>
                )}
                {isLegs && matchesLocal.find(m => !m.is_second_leg) && !matchesLocal.find(m => m.is_second_leg) && (
                  <button onClick={() => handleAddMatch(true)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(191,242,5,0.3)", backgroundColor: "rgba(191,242,5,0.07)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.12)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.5)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.07)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; }}>
                    ✈ + Jogo de volta
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
 
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "flex-end", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.01)" }}>
          <button onClick={onSuccess}
            style={{ padding: "9px 24px", borderRadius: 9, border: "none", cursor: "pointer", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
            Concluir
          </button>
        </div>
      </div>
    </div>
);
}