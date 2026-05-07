// PARTIDA CLIENT

"use client";

import { adicionarAcao, editarAcao, deletarAcao, editarPartida, salvarFormacoes, publicarResultado, salvarArbitrosPartida, salvarFaltas, adicionarShootout, deletarShootout, encerrarPartida } from "./actions";

// CSS global para forçar dark mode em todos os selects nativos
if (typeof document !== "undefined") {
  const styleId = "partida-select-dark";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      select option { background-color: #181818 !important; color: #E0E0E0 !important; }
      select { color-scheme: dark; }
    `;
    document.head.appendChild(style);
  }
}
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Athlete = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  position_id: string | null;
  player_positions: { full_name: string; abbreviation: string; display_order: number } | null;
};

type LineupEntry = {
  athlete_id: string;
  is_present: boolean;
  is_captain: boolean;
  played_as_goalkeeper: boolean;
};

type MatchReferee = {
  id: string;
  referee_id: string;
  referee_role_id: string;
  referees: { id: string; full_name: string; surname: string | null; photo_url: string | null } | null;
  referee_roles: { id: string; full_name: string } | null;
};

type Referee = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  referee_role_id: string | null;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const REFEREE_ROLES = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "Árbitro" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "Assistente" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "Mesário" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "Staff" },
];

const ACTION_LABELS: Record<string, string> = {
  goal: "Gol",
  yellow_card: "Cartão Amarelo",
  red_card: "Cartão Vermelho",
  red_yellow_card: "Amarelo-Vermelho",
  penalty_missed: "Pênalti Perdido",
  shootout_missed: "Shoot-out Perdido",
  foul: "Falta",
  fifth_foul: "Quinta Falta",
};

const ACTION_COLORS: Record<string, string> = {
  goal: "#BFF205",
  yellow_card: "#F2C005",
  red_card: "#FF4444",
  red_yellow_card: "#FF8C00",
  penalty_missed: "#FF4444",
  shootout_missed: "#FF4444",
  foul: "#A6A6A6",
  fifth_foul: "#A6A6A6",
};

const ACTION_EMOJI: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  red_yellow_card: "🟧",
  penalty_missed: "✗",
  shootout_missed: "✗",
  foul: "⚠",
  fifth_foul: "5ª",
};

function ActionIcon({ actionType, goalType, size = 20 }: { actionType: string; goalType?: string; size?: number }) {
  const s = size;

  if (actionType === "goal" && goalType !== "own_goal" && goalType !== "penalty" && goalType !== "shootout") return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <g>
        <path d="m9.5 5.83-2.76 1v3.02l2.08.81 2.07-2.29z" fill="currentColor"/>
        <path d="M7 0C3.14 0 0 3.14 0 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7m0 12.26c-.97 0-1.88-.27-2.66-.73l.25-1.38-1.55-1.73-.94.48A5.2 5.2 0 0 1 1.74 7v-.17l2.01-.72.66-2.48-.92-.55a5.24 5.24 0 0 1 3.5-1.35c.1 0 .19 0 .29.01l-.29 1.07 2.72 1.15.88-.81c1.02.96 1.67 2.32 1.67 3.83 0 2.9-2.36 5.27-5.26 5.27z" fill="currentColor"/>
      </g>
    </svg>
  );

  if (actionType === "goal" && goalType === "penalty") return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <g>
        <path d="m8.78 8.43-1.88.68v2.06l1.41.55 1.42-1.56z" fill="currentColor"/>
        <path d="M7.07 4.45c-2.63 0-4.77 2.14-4.77 4.77s2.14 4.77 4.77 4.77 4.77-2.14 4.77-4.77S9.7 4.45 7.07 4.45m0 8.37c-.66 0-1.28-.18-1.82-.5l.17-.94-1.06-1.18-.64.33c-.16-.4-.24-.84-.24-1.29v-.12l1.37-.49.45-1.69-.63-.37c.64-.57 1.47-.92 2.39-.92h.2l-.2.73 1.86.78.6-.55c.7.66 1.14 1.58 1.14 2.62 0 1.98-1.61 3.59-3.59 3.59" fill="currentColor"/>
        <path d="M14 6.75h-1.5V1.5h-11v5.25H0V0h14z" fill="currentColor"/>
      </g>
    </svg>
  );

  if (actionType === "goal" && goalType === "shootout") return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <g>
        <path d="m8.78 8.43-1.88.68v2.06l1.41.55 1.42-1.56z" fill="currentColor"/>
        <path d="M7.07 4.45c-2.63 0-4.77 2.14-4.77 4.77s2.14 4.77 4.77 4.77 4.77-2.14 4.77-4.77S9.7 4.45 7.07 4.45m0 8.37c-.66 0-1.28-.18-1.82-.5l.17-.94-1.06-1.18-.64.33c-.16-.4-.24-.84-.24-1.29v-.12l1.37-.49.45-1.69-.63-.37c.64-.57 1.47-.92 2.39-.92h.2l-.2.73 1.86.78.6-.55c.7.66 1.14 1.58 1.14 2.62 0 1.98-1.61 3.59-3.59 3.59" fill="currentColor"/>
        <path d="M14 6.75h-1.5V1.5h-11v5.25H0V0h14z" fill="currentColor"/>
      </g>
    </svg>
  );

  if (actionType === "goal" && goalType === "own_goal") return (
    <svg width={s} height={s} viewBox="0 0 175.29 191.85" fill="none">
      <path d="M93.06,21.3c-16.94-.86-33.43,4.91-46.2,16.37l11.21,6.73-8.08,30.37-24.56,8.79c-.2,8.48,1.15,16.99,4.36,25.15l-18.42,11.5c-5.14-11.66-7.56-24-7.24-36.55.38-22.67,10.1-44.07,25.97-59.48,35.15-34.13,91.72-31.83,123.96,5.07,14.92,16.88,22.72,39.57,20.99,62.54-6.02-4.58-13.7-6.15-21.12-4.16.57-18.55-6.65-36.01-20.36-49.04l-10.76,9.9-33.29-14.08,3.54-13.11Z" fill="#FF4444"/>
      <path d="M33.35,189.17L1.77,152.43c-2.81-3.27-2.24-8.18,1.48-10.5l40.83-25.49c4.05-2.53,9.46-1.16,12.39,2.26,2.59,3.24,2.23,7.96-1.36,10.22l-23.61,14.83,52.41,7.97c12.11,1.34,24.19-.21,35.35-4.94,16.5-7.03,29.57-21.02,32.44-38.98.38-2.4,1.48-4.33,3.6-5.57,4-2.33,9.12-1.61,12.27,1.74,1.92,2.05,2.27,4.39,1.79,7.09-2.17,12.28-7.99,23.46-16.64,32.5-14.87,15.54-36.34,23.64-57.73,23.99-5.38.06-10.34-.17-15.65-.98l-50.14-7.63,18.03,21.03c2.67,3.4,1.91,7.95-1.69,10.33-3.79,2.42-8.63,1.95-12.19-1.14Z" fill="#FF4444"/>
      <polygon points="111.98 130.38 86.46 120.49 86.45 83.51 120.26 71.25 137.29 102.35 111.98 130.38" fill="#FF4444"/>
    </svg>
  );

  if (actionType === "yellow_card") return (
    <svg width={s * 0.7} height={s} viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" d="M3 1h10v14H3z" fill="#D9AF00"/>
    </svg>
  );

  if (actionType === "red_card") return (
    <svg width={s * 0.7} height={s} viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" d="M3 1h10v14H3z" fill="#E35C47"/>
    </svg>
  );

  if (actionType === "red_yellow_card") return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M6 1V4.66667V12H9.81818H13V1H6Z" fill="#E35C47"/>
      <path d="M5 13V11.3333V4H3V15H10V13H6.18182H5Z" fill="#D9AF00"/>
    </svg>
  );

  if (actionType === "penalty_missed") return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M12.667 0H0v6h1.333V1.333H12V6h1.333V0z" fill="currentColor"/>
      <path d="M9.273 5.447 6.66 8.067 4.073 5.48l-.94.947 2.58 2.58-2.6 2.606.947.94 2.6-2.6 2.6 2.6.94-.94-2.6-2.606 2.62-2.614z" fill="currentColor"/>
    </svg>
  );

  if (actionType === "shootout_missed") return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M12.667 0H0v6h1.333V1.333H12V6h1.333V0z" fill="currentColor"/>
      <path d="M9.273 5.447 6.66 8.067 4.073 5.48l-.94.947 2.58 2.58-2.6 2.606.947.94 2.6-2.6 2.6 2.6.94-.94-2.6-2.606 2.62-2.614z" fill="currentColor"/>
    </svg>
  );

  if (actionType === "foul") return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 4v4M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );

  if (actionType === "fifth_foul") return (
    <svg width={s * 0.72} height={s} viewBox="0 0 79.04 108.9" fill="none">
      <path d="M29.93,108.15C13.92,105.48.3,94.07,0,77.09h22.07c.12,3.57,1.55,6.75,4.1,9.15,2.51,2.33,5.55,3.82,8.92,4.43,2.5.42,4.91.45,7.41.03,5.71-.94,10.43-4.6,12.79-9.87s2.3-12.09,0-17.25c-2.39-5.37-7.12-9.15-12.92-10.17-5.35-.92-10.76.1-15.41,2.89-1.72,1.07-3.16,2.32-4.42,3.99l-20.27-3.6L7.34.01h65.7s0,18.59,0,18.59H26.1s-2.67,26.84-2.67,26.84c.36.13.67-.01.82-.3,3.62-4.7,9.98-7.53,15.79-8.4,4.17-.63,8.28-.52,12.43.28,13.13,2.53,23.06,13.01,25.71,26.04,1.07,5.25,1.12,10.56.22,15.84-1.6,9.47-7.05,17.79-15.02,23.11-4.73,3.16-10,5.22-15.65,6.16s-11.81.99-17.8-.01Z" fill="currentColor"/>
    </svg>
  );

  return <span style={{ fontSize: s * 0.7, color: "currentColor" }}>{ACTION_EMOJI[actionType] ?? "·"}</span>;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  ongoing: "Em andamento",
  finished: "Finalizada",
  postponed: "Adiada",
};

const MISS_RESULTS: Record<string, string> = {
  goalkeeper_save: "Defesa do goleiro",
  off_target: "Para fora",
  post: "Na trave",
  foul: "Irregularidade",
};

const FINISH_TYPE_LABELS: Record<string, string> = {
  normal: "Normal",
  walkover: "W.O.",
  penalties: "Pênaltis",
  shootouts: "Shoot-outs",
  postponed: "Adiada",
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function PartidaClient({
  match,
  actions: initialActions,
  lineups: initialLineups,
  editionTeamsWithAthletes,
  competitionId,
  edicaoId,
  faseId,
  matchReferees: initialMatchReferees,
  allReferees,
  initialTeamStats,
  initialShootout,
}: {
  match: any;
  actions: any[];
  lineups: any[];
  editionTeamsWithAthletes: any[];
  competitionId: string;
  edicaoId: string;
  faseId: string;
  matchReferees?: MatchReferee[];
  allReferees?: Referee[];
  initialTeamStats?: any[];
  initialShootout?: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"informacao" | "formacoes" | "posjogo" | "midia">("posjogo");
  const [actions, setActions] = useState<any[]>(initialActions ?? []);
  const [scoreA, setScoreA] = useState<number>(match.score_a ?? 0);
  const [scoreB, setScoreB] = useState<number>(match.score_b ?? 0);
  const [status, setStatus] = useState<string>(match.status ?? "scheduled");
  const [finishType, setFinishType] = useState<string>(match.finish_type ?? "");
  const [saving, setSaving] = useState(false);
  const [matchDate, setMatchDate] = useState<string>(match.match_date ?? "");
  const [matchTime, setMatchTime] = useState<string>(match.match_time?.slice(0, 5) ?? "");
  const [venueId, setVenueId] = useState<string>(match.venue_id ?? "");
  const [motmAthleteId, setMotmAthleteId] = useState<string>(match.motm_athlete_id ?? "");
  const [motmTeamId, setMotmTeamId] = useState<string>(match.motm_team_id ?? "");
  const [highlightsUrl, setHighlightsUrl] = useState<string>(match.highlights_url ?? "");
  const [photosUrl, setPhotosUrl] = useState<string>(match.photos_url ?? "");

  const isMobile = useIsMobile();

  // Árbitros
  const [matchReferees, setMatchReferees] = useState<MatchReferee[]>(initialMatchReferees ?? []);
  const [savingReferees, setSavingReferees] = useState(false);
  const [addRefereeId, setAddRefereeId] = useState("");
  const [addRefereeRoleId, setAddRefereeRoleId] = useState("");

  // Ação
  const [addingAction, setAddingAction] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<any | null>(null);
  const [openActionType, setOpenActionType] = useState<string | null>(null);

  // Team stats (faltas)
  const [teamStats, setTeamStats] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    (initialTeamStats ?? []).forEach((s: any) => {
      if (!map[s.team_id]) map[s.team_id] = {};
      map[s.team_id][s.period] = s.fouls;
    });
    return map;
  });
  const [activePeriod, setActivePeriod] = useState<"first" | "second">("first");

  // Shootout
  const [shootout, setShootout] = useState<any[]>(initialShootout ?? []);
  const [activeShootoutTab, setActiveShootoutTab] = useState<"timeline" | "shootout">("timeline");

  // Encerramento
  const [showEndModal, setShowEndModal] = useState(false);
  const [endFinishType, setEndFinishType] = useState<string>(match.finish_type ?? "");
  const [endAggregateWinnerId, setEndAggregateWinnerId] = useState<string>(match.aggregate_winner_id ?? "");
  const [savingEnd, setSavingEnd] = useState(false);

  // Formações
  const [lineups, setLineups] = useState<Record<string, LineupEntry>>(() => {
    const map: Record<string, LineupEntry> = {};
    (initialLineups ?? []).forEach((l: any) => {
      map[l.athlete_id] = {
        athlete_id: l.athlete_id,
        is_present: l.is_present ?? false,
        is_captain: l.is_captain ?? false,
        played_as_goalkeeper: l.played_as_goalkeeper ?? false,
      };
    });
    return map;
  });

  const [savingLineups, setSavingLineups] = useState(false);

  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };
  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";

  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const roundName: string = match.rounds?.custom_label ?? match.rounds?.name ?? "Rodada";
  const competitionName: string = match.phases?.competition_editions?.competitions?.full_name ?? "Competição";
  const safeAllReferees: Referee[] = allReferees ?? [];

  function getAthletes(teamId: string): Athlete[] {
    const et = (editionTeamsWithAthletes ?? []).find((e: any) => e.team_id === teamId);
    if (!et) return [];
    return et.athletes ?? [];
  }

  function getAthletesByPosition(teamId: string) {
    const athletes = getAthletes(teamId);
    const groups: Record<string, { label: string; order: number; athletes: Athlete[] }> = {};
    athletes.forEach(a => {
      const key = a.player_positions?.full_name ?? "Sem posição";
      const order = a.player_positions?.display_order ?? 99;
      if (!groups[key]) groups[key] = { label: key, order, athletes: [] };
      groups[key].athletes.push(a);
    });
    return Object.values(groups).sort((a, b) => a.order - b.order);
  }

  function toggleLineup(athleteId: string, field: keyof Omit<LineupEntry, "athlete_id">) {
    setLineups(prev => {
      const current = prev[athleteId] ?? { athlete_id: athleteId, is_present: false, is_captain: false, played_as_goalkeeper: false };
      return { ...prev, [athleteId]: { ...current, [field]: !current[field] } };
    });
  }

  async function handleSaveInfo() {
    setSaving(true);
    const fd = new FormData();
    fd.append("status", status);
    fd.append("finish_type", finishType);
    fd.append("score_a", String(scoreA));
    fd.append("score_b", String(scoreB));
    if (matchDate) fd.append("match_date", matchDate);
    if (matchTime) fd.append("match_time", matchTime);
    fd.append("venue_id", venueId);
    fd.append("motm_athlete_id", motmAthleteId);
    fd.append("motm_team_id", motmTeamId);
    fd.append("highlights_url", highlightsUrl);
    fd.append("photos_url", photosUrl);
    const r = await editarPartida(match.id, fd);
    setSaving(false);
    if ("error" in r) { toast("error", r.error); return; }
    toast("success", "Informações salvas.");
  }

  async function handleSaveReferees() {
    setSavingReferees(true);
    const entries = matchReferees.map(r => ({ referee_id: r.referee_id, referee_role_id: r.referee_role_id }));
    const result = await salvarArbitrosPartida(match.id, entries);
    setSavingReferees(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Árbitros salvos.");
  }

  function handleAddReferee() {
    if (!addRefereeId || !addRefereeRoleId) { toast("error", "Selecione árbitro e função."); return; }
    const already = matchReferees.find(r => r.referee_id === addRefereeId);
    if (already) { toast("error", "Árbitro já adicionado."); return; }
    const referee = safeAllReferees.find(r => r.id === addRefereeId);
    setMatchReferees(prev => [...prev, {
      id: crypto.randomUUID(),
      referee_id: addRefereeId,
      referee_role_id: addRefereeRoleId,
      referees: referee ? { id: referee.id, full_name: referee.full_name, surname: referee.surname } : null,
      referee_roles: null,
    }]);
    setAddRefereeId(""); setAddRefereeRoleId("");
  }

  function handleRemoveReferee(refereeId: string) {
    setMatchReferees(prev => prev.filter(r => r.referee_id !== refereeId));
  }

  async function handlePublish() {
    setPublishing(true);
    const r = await publicarResultado(match.id);
    setPublishing(false);
    if ("error" in r) { toast("error", r.error); return; }
    setPublished(true);
    toast("success", "Resultado publicado. Stats atualizadas.");
  }

  async function handleSaveLineups() {
    setSavingLineups(true);
    const entries = Object.values(lineups);
    const r = await salvarFormacoes(match.id, entries);
    setSavingLineups(false);
    if ("error" in r) { toast("error", r.error); return; }
    toast("success", "Formações salvas.");
    router.refresh();
  }

  const halfDuration: number = match.phases?.half_duration_minutes ?? 25;

  function getPeriodFromMinute(minute: number): "first" | "second" {
    // halfDuration = duração de cada tempo (ex: 35 min)
    // minuto 1-35 = primeiro tempo; minuto 36-70 = segundo tempo
    return minute <= halfDuration ? "first" : "second";
  }

  function getFouls(teamId: string, period: "first" | "second"): number {
    return teamStats[teamId]?.[period] ?? 0;
  }

  async function handleChangeFouls(teamId: string, delta: number) {
    const period = activePeriod;
    const current = getFouls(teamId, period);
    const next = Math.max(0, current + delta);
    setTeamStats(prev => ({ ...prev, [teamId]: { ...(prev[teamId] ?? {}), [period]: next } }));
    await salvarFaltas(match.id, teamId, period, next);
  }

  async function handleAddAction(fd: FormData) {
    setAddingAction(true);
    const aType = fd.get("action_type") as string;
    const minuteRaw = fd.get("minute") as string;
    const minute = minuteRaw ? parseInt(minuteRaw, 10) : null;
    const goalType = fd.get("goal_type") as string;
    const missResult = fd.get("miss_result") as string;
    const primaryAthleteId = fd.get("primary_athlete_id") as string;
    const secondaryAthleteId = fd.get("secondary_athlete_id") as string;
    const goalkeeperIdVal = fd.get("goalkeeper_id") as string;
    const teamIdVal = fd.get("team_id") as string;

    // Período calculado a partir do minuto: <= halfDuration = primeiro tempo
    const period = (minute && minute <= halfDuration) ? "first" : "second";

    const allAthletes = [...getAthletes(match.team_a_id), ...getAthletes(match.team_b_id)];
    const athlete = allAthletes.find((a: any) => a.id === primaryAthleteId);
    const secondaryAthlete = allAthletes.find((a: any) => a.id === secondaryAthleteId);

    const payload = new FormData();
    payload.append("team_id", teamIdVal);
    payload.append("action_type", aType);
    payload.append("period", period);
    payload.append("match_id", match.id);
    if (minute) payload.append("minute", String(minute));
    if (primaryAthleteId) payload.append("primary_athlete_id", primaryAthleteId);
    if (secondaryAthleteId) payload.append("secondary_athlete_id", secondaryAthleteId);
    if (goalType) {
      payload.append("goal_type", goalType);
      payload.append("is_own_goal", goalType === "own_goal" ? "true" : "false");
    }
    if (missResult) payload.append("miss_result", missResult);
    if (goalkeeperIdVal) payload.append("goalkeeper_id", goalkeeperIdVal);

    const isEditing = !!editingAction;

    if (isEditing) {
      if (editingAction.action_type === "goal") {
        if (editingAction.team_id === match.team_a_id) setScoreA(p => Math.max(0, p - 1));
        else setScoreB(p => Math.max(0, p - 1));
      }
      const r = await editarAcao(editingAction.id, payload);
      setAddingAction(false);
      if ("error" in r) { toast("error", r.error); return; }
      if (aType === "goal") {
        if (teamIdVal === match.team_a_id) setScoreA(p => p + 1);
        else setScoreB(p => p + 1);
      }
      setActions(prev => prev.map((a: any) => a.id === editingAction.id ? {
        ...a, team_id: teamIdVal, period, minute,
        is_own_goal: goalType === "own_goal", goal_type: goalType || "normal",
        miss_result: missResult || null, primary_athlete: athlete ?? null,
        secondary_athlete: secondaryAthlete ?? null,
      } : a));
    } else {
      const r = await adicionarAcao(match.id, payload);
      setAddingAction(false);
      if ("error" in r) { toast("error", r.error); return; }
      if (aType === "goal") {
        if (teamIdVal === match.team_a_id) setScoreA(p => p + 1);
        else setScoreB(p => p + 1);
      }
      setActions(prev => [...prev, {
        id: r.id, action_type: aType, team_id: teamIdVal,
        period, minute, is_own_goal: goalType === "own_goal",
        goal_type: goalType || "normal", miss_result: missResult || null,
        primary_athlete: athlete ?? null, secondary_athlete: secondaryAthlete ?? null,
      }]);
    }
    setShowActionModal(false);
    setEditingAction(null);
  }

  async function handleDelete(actionId: string, aType: string, own: boolean, teamId: string) {
    if (!confirm("Remover esta ação?")) return;
    const r = await deletarAcao(actionId, match.id);
    if ("error" in r) { toast("error", r.error); return; }
    if (aType === "goal") {
      // team_id no banco é sempre quem marcou
      if (teamId === match.team_a_id) setScoreA(p => Math.max(0, p - 1));
      else setScoreB(p => Math.max(0, p - 1));
    }
    setActions(prev => prev.filter((a: any) => a.id !== actionId));
  }

  async function handleEncerrar() {
    setSavingEnd(true);
    const fd = new FormData();
    fd.append("finish_type", endFinishType);
    if (endAggregateWinnerId) fd.append("aggregate_winner_id", endAggregateWinnerId);
    const r = await encerrarPartida(match.id, fd);
    setSavingEnd(false);
    if ("error" in r) { toast("error", r.error); return; }
    setStatus("finished");
    setFinishType(endFinishType);
    setShowEndModal(false);
    toast("success", "Partida encerrada.");
  }

  async function handleAddShootout(fd: FormData) {
    const editingId = fd.get("editing_id") as string | null;
    const teamId = fd.get("team_id") as string;
    const athleteId = fd.get("athlete_id") as string;
    const allAthletes = [...getAthletes(match.team_a_id), ...getAthletes(match.team_b_id)];
    const athlete = allAthletes.find((a: any) => a.id === athleteId);

    if (editingId) {
      // Edição: deletar e recriar mantendo kick_order
      const existing = shootout.find((s: any) => s.id === editingId);
      if (existing) fd.append("kick_order", String(existing.kick_order));
      const del = await deletarShootout(editingId);
      if ("error" in del) { toast("error", del.error); return; }
      const r = await adicionarShootout(match.id, fd);
      if ("error" in r) { toast("error", r.error); return; }
      setShootout(prev => prev.map((s: any) => s.id === editingId ? {
        id: r.id, team_id: teamId,
        shootout_type: fd.get("shootout_type") as string,
        result: fd.get("result") as string,
        kick_order: existing?.kick_order ?? s.kick_order,
        athlete: athlete ?? null,
      } : s));
    } else {
      const nextOrder = shootout.length + 1;
      fd.append("kick_order", String(nextOrder));
      const r = await adicionarShootout(match.id, fd);
      if ("error" in r) { toast("error", r.error); return; }
      setShootout(prev => [...prev, {
        id: r.id, team_id: teamId,
        shootout_type: fd.get("shootout_type") as string,
        result: fd.get("result") as string,
        kick_order: nextOrder, athlete: athlete ?? null,
      }]);
    }
  }

  async function handleDeleteShootout(id: string) {
    if (!confirm("Remover esta cobrança?")) return;
    const r = await deletarShootout(id);
    if ("error" in r) { toast("error", r.error); return; }
    setShootout(prev => prev.filter((s: any) => s.id !== id));
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", position: "sticky", top: 0, zIndex: 10, overflow: "hidden" }}>
        {/* Degradê suave com as cores dos times */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `linear-gradient(135deg, ${teamA?.primary_color ?? "#141414"}12 0%, transparent 45%, transparent 55%, ${teamB?.primary_color ?? "#141414"}12 100%)`,
        }} />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--color-surface)", opacity: 0.75, pointerEvents: "none", zIndex: 0 }} />

        <div className="px-4 pt-4 pb-0 sm:px-8 sm:pt-5" style={{ position: "relative", zIndex: 1 }}>
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competitionName, href: `/competicoes/${competitionId}` },
            { label: roundName },
          ]} />

          {/* Logo + nome da competição */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 18 }}>
            {match.phases?.competition_editions?.competitions?.logo_url ? (
              <img
                src={match.phases.competition_editions.competitions.logo_url}
                alt=""
                style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4 }}
              />
            ) : null}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffffff" }}>
              {competitionName}
            </span>
            <span style={{ color: "#2a2a2a", fontSize: 10 }}>·</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#var(--color-text-secondary)" }}>
              {roundName}
            </span>
          </div>

          {/* Scoreboard: NOMES A | LOGO A | PLACAR | LOGO B | NOMES B */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", paddingBottom: 22 }}>

            {/* Time A — nomes à direita, logo à direita dos nomes */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
              <div style={{ textAlign: "right", minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 13 : 20, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {teamA?.short_name ?? teamA?.full_name ?? "A definir"}
                </p>
                {teamA?.short_name && teamA?.full_name && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#444", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {teamA.full_name}
                  </p>
                )}
              </div>
              <div style={{ width: isMobile ? 44 : 72, height: isMobile ? 44 : 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {teamA?.logo_url
                  ? <img src={teamA.logo_url} alt="" style={{ width: isMobile ? 44 : 72, height: isMobile ? 44 : 72, objectFit: "contain" }} />
                  : <div style={{ width: isMobile ? 44 : 72, height: isMobile ? 44 : 72, borderRadius: 12, border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#333" }}>
                      {(teamA?.short_name ?? teamA?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
            </div>

            {/* Placar central */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 28px", minWidth: 150 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 36 : 56, fontWeight: 700, lineHeight: 1, width: isMobile ? 32 : 44, textAlign: "center", color: "var(--color-brand)" }}>
                  {scoreA}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 18 : 24, color: "#222", lineHeight: 1 }}>:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 36 : 56, fontWeight: 700, lineHeight: 1, width: isMobile ? 32 : 44, textAlign: "center", color: "var(--color-brand)" }}>
                  {scoreB}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {match.match_date && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.04em" }}>
                    {new Date(match.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    {match.match_time ? ` · ${match.match_time.slice(0, 5)}` : ""}
                  </span>
                )}
                {status === "ongoing" && (
                  <>
                    <span style={{ width: 2, height: 2, borderRadius: "50%", backgroundColor: "#2a2a2a", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, backgroundColor: "rgba(191,242,5,0.12)", color: "var(--color-brand)", border: "1px solid rgba(191,242,5,0.2)" }}>
                      Ao vivo
                    </span>
                  </>
                )}
                {match.venues?.full_name && (
                  <>
                    <span style={{ width: 2, height: 2, borderRadius: "50%", backgroundColor: "#2a2a2a", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {match.venues.full_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Time B — logo à esquerda, nomes à direita da logo */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 14 }}>
            <div style={{ width: isMobile ? 44 : 72, height: isMobile ? 44 : 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {teamB?.logo_url
                  ? <img src={teamB.logo_url} alt="" style={{ width: isMobile ? 44 : 72, height: isMobile ? 44 : 72, objectFit: "contain" }} />
                  : <div style={{ width: isMobile ? 44 : 72, height: isMobile ? 44 : 72, borderRadius: 12, border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#333" }}>
                      {(teamB?.short_name ?? teamB?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 13 : 20, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {teamB?.short_name ?? teamB?.full_name ?? "A definir"}
                </p>
                {teamB?.short_name && teamB?.full_name && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#444", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {teamB.full_name}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Abas */}
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { key: "informacao", label: "INFORMAÇÃO" },
              { key: "formacoes", label: "FORMAÇÕES" },
              { key: "posjogo", label: "PÓS-JOGO" },
              { key: "midia", label: "MÍDIA" },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: "12px 20px",
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: activeTab === tab.key ? "var(--color-brand)" : "var(--color-text-secondary)",
                  borderBottom: `2px solid ${activeTab === tab.key ? "var(--color-brand)" : "transparent"}`,
                  borderTop: "none", borderLeft: "none", borderRight: "none",
                  background: "none", cursor: "pointer",
                  transition: "color 0.12s",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6">

        {/* ABA INFORMAÇÃO */}
        {activeTab === "informacao" && (
          <InfoTab
          match={match}
          matchDate={matchDate} setMatchDate={setMatchDate}
          matchTime={matchTime} setMatchTime={setMatchTime}
          venueId={venueId} setVenueId={setVenueId}
          matchReferees={matchReferees}
          addRefereeId={addRefereeId} setAddRefereeId={setAddRefereeId}
          addRefereeRoleId={addRefereeRoleId} setAddRefereeRoleId={setAddRefereeRoleId}
          savingReferees={savingReferees} saving={saving}
          safeAllReferees={safeAllReferees}
          handleAddReferee={handleAddReferee}
          handleRemoveReferee={handleRemoveReferee}
          handleSaveReferees={handleSaveReferees}
          handleSaveInfo={handleSaveInfo}
        />
        )}

        {/* ABA FORMAÇÕES */}
        {activeTab === "formacoes" && (
          <FormacoesTab
            match={match}
            lineups={lineups}
            setLineups={setLineups}
            getAthletes={getAthletes}
            savingLineups={savingLineups}
            handleSaveLineups={handleSaveLineups}
            toggleLineup={toggleLineup}
          />
        )}

        {/* ABA PÓS-JOGO */}
        {activeTab === "posjogo" && (
          <PosJogoTab
            match={match}
            actions={actions}
            shootout={shootout}
            scoreA={scoreA}
            scoreB={scoreB}
            status={status}
            finishType={finishType}
            teamStats={teamStats}
            activePeriod={activePeriod}
            setActivePeriod={setActivePeriod}
            activeShootoutTab={activeShootoutTab}
            setActiveShootoutTab={setActiveShootoutTab}
            showEndModal={showEndModal}
            setShowEndModal={setShowEndModal}
            endFinishType={endFinishType}
            setEndFinishType={setEndFinishType}
            endAggregateWinnerId={endAggregateWinnerId}
            setEndAggregateWinnerId={setEndAggregateWinnerId}
            savingEnd={savingEnd}
            publishing={publishing}
            published={published}
            addingAction={addingAction}
            editingAction={editingAction}
            setEditingAction={setEditingAction}
            showActionModal={showActionModal}
            setShowActionModal={setShowActionModal}
            openActionType={openActionType}
            setOpenActionType={setOpenActionType}
            motmAthleteId={motmAthleteId}
            setMotmAthleteId={setMotmAthleteId}
            halfDuration={halfDuration}
            getAthletes={getAthletes}
            handleChangeFouls={handleChangeFouls}
            getFouls={getFouls}
            handleAddAction={handleAddAction}
            handleDelete={handleDelete}
            handleAddShootout={handleAddShootout}
            handleDeleteShootout={handleDeleteShootout}
            handleEncerrar={handleEncerrar}
            handlePublish={handlePublish}
            getPeriodFromMinute={getPeriodFromMinute}
          />
        )}

        {/* ABA MÍDIA */}
        {activeTab === "midia" && (
          <MidiaTab
          match={match}
          motmAthleteId={motmAthleteId}
          setMotmAthleteId={setMotmAthleteId}
          motmTeamIdProp={motmTeamId}
          setMotmTeamIdProp={setMotmTeamId}
          highlightsUrl={highlightsUrl}
          setHighlightsUrl={setHighlightsUrl}
          photosUrl={photosUrl}
          setPhotosUrl={setPhotosUrl}
          getAthletes={getAthletes}
          handleSaveInfo={handleSaveInfo}
          saving={saving}
        />
        )}
      </div>

      </div>
  );
}


// ─── TimePicker (drum clock) ──────────────────────────────────────────────────

function TimePicker({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void;
}) {
  const toH = (v: string) => parseInt(v.split(":")[0] ?? "0", 10);
  const toM = (v: string) => Math.round(parseInt(v.split(":")[1] ?? "0", 10) / 5) * 5;
  const [selH, setSelH] = useState(toH(value));
  const [selM, setSelM] = useState(toM(value));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins  = Array.from({ length: 12 }, (_, i) => i * 5);
  const ITEM_H = 48;

  function confirm() {
    onChange(`${String(selH).padStart(2, "0")}:${String(selM).padStart(2, "0")}`);
    onClose();
  }

  function Drum({ items, selected, onSelect }: { items: number[]; selected: number; onSelect: (v: number) => void }) {
    return (
      <div style={{ position: "relative", height: ITEM_H * 3, width: 72, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: ITEM_H, background: "linear-gradient(to bottom, var(--color-surface), transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: ITEM_H, left: 4, right: 4, height: ITEM_H, background: "rgba(191,242,5,0.07)", border: "1px solid rgba(191,242,5,0.18)", borderRadius: 10, zIndex: 1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: ITEM_H, background: "linear-gradient(to top, var(--color-surface), transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ display: "flex", flexDirection: "column", transform: `translateY(${-items.indexOf(selected) * ITEM_H + ITEM_H}px)`, transition: "transform 0.2s cubic-bezier(.4,0,.2,1)" }}>
          {items.map(v => (
            <div key={v} onClick={() => onSelect(v)} style={{
              height: ITEM_H, width: 72, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, cursor: "pointer",
              color: v === selected ? "var(--color-brand)" : Math.abs(items.indexOf(v) - items.indexOf(selected)) === 1 ? "#3a3a3a" : "#1e1e1e",
              transition: "color 0.15s", position: "relative", zIndex: 3, userSelect: "none",
            }}>
              {String(v).padStart(2, "0")}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 300, borderRadius: 18, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555" }}>
            Horário da partida
          </span>
          <button type="button" onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--color-border)", background: "none", color: "#555", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          <Drum items={hours} selected={selH} onSelect={setSelH} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--color-brand)", padding: "0 4px", userSelect: "none", marginBottom: 2 }}>:</span>
          <Drum items={mins} selected={selM} onSelect={setSelM} />
        </div>
        <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderTop: "1px solid var(--color-border)" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid var(--color-border)", background: "none", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="button" onClick={confirm} style={{ flex: 1, padding: 10, borderRadius: 9, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InfoTab ──────────────────────────────────────────────────────────────────

function InfoTab({
  match, matchDate, setMatchDate, matchTime, setMatchTime,
  venueId, setVenueId, matchReferees, addRefereeId, setAddRefereeId,
  addRefereeRoleId, setAddRefereeRoleId, savingReferees, saving,
  safeAllReferees, handleAddReferee, handleRemoveReferee,
  handleSaveReferees, handleSaveInfo,
}: {
  match: any; matchDate: string; setMatchDate: (v: string) => void;
  matchTime: string; setMatchTime: (v: string) => void;
  venueId: string; setVenueId: (v: string) => void;
  matchReferees: MatchReferee[]; addRefereeId: string; setAddRefereeId: (v: string) => void;
  addRefereeRoleId: string; setAddRefereeRoleId: (v: string) => void;
  savingReferees: boolean; saving: boolean; safeAllReferees: Referee[];
  handleAddReferee: () => void; handleRemoveReferee: (id: string) => void;
  handleSaveReferees: () => void; handleSaveInfo: () => void;
}) {
  const isMobile = useIsMobile();
  const border = "1px solid var(--color-border)";
  const [showClock, setShowClock] = useState(false);
  const [matchDescription, setMatchDescription] = useState<string>(match.description ?? "");
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");
  const [showRefereeDropdown, setShowRefereeDropdown] = useState(false);
  const [refereeSearch, setRefereeSearch] = useState("");
  const venueRef = useRef<HTMLDivElement>(null);
  const refereeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (venueRef.current && !venueRef.current.contains(e.target as Node)) setShowVenueDropdown(false);
      if (refereeRef.current && !refereeRef.current.contains(e.target as Node)) setShowRefereeDropdown(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selectedVenue = (match.venues_list ?? []).find((v: any) => v.id === venueId);
  const filteredVenues = venueSearch.trim()
    ? (match.venues_list ?? []).filter((v: any) => v.full_name.toLowerCase().includes(venueSearch.toLowerCase()))
    : (match.venues_list ?? []);
  const filteredReferees = refereeSearch.trim()
    ? safeAllReferees.filter(r => (r.surname ?? r.full_name).toLowerCase().includes(refereeSearch.toLowerCase()))
    : safeAllReferees;
  const selectedRefereeForAdd = safeAllReferees.find(r => r.id === addRefereeId);

  function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205" }}>{title}</span>
          {subtitle && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1, letterSpacing: "0.06em" }}>{subtitle}</p>}
        </div>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
      </div>
    );
  }

  // ── Campo genérico com label flutuante e barra de foco ──
  const fieldBase: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 5,
    padding: "14px 16px", backgroundColor: "var(--color-surface)",
    position: "relative", flex: 1,
  };
  const labelBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
    letterSpacing: "0.14em", textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.3)",
    display: "flex", alignItems: "center", gap: 5,
  };
  const valueBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600,
    color: "var(--color-text-primary)",
    background: "none", border: "none", outline: "none",
    width: "100%", padding: 0,
  };
  const focusBar: React.CSSProperties = {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 1.5,
    background: "#BFF205", transform: "scaleX(0)", transition: "transform 0.2s",
    transformOrigin: "left", pointerEvents: "none",
  };

  // ── Ícones ──
  const IconCalendar = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="1" y="2" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 1v2M7 1v2M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  const IconClock = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  const IconStadium = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 9V5C1 3.5 2.5 2.5 5 2.5S9 3.5 9 5V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M1 6h8M3 2.5V9M7 2.5V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <ellipse cx="5" cy="2.5" rx="2.5" ry="1" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  );
  const IconNote = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="1.5" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M3 4h4M3 6h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
  const IconChevron = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.25, flexShrink: 0 }}>
      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div style={{ maxWidth: 720, width: "100%", paddingBottom: 80 }}>

      {/* ══ DADOS DA PARTIDA ══ */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Dados da Partida" subtitle="Data, horário e local" />
        <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "visible" }}>

          {/* Linha 1: Data + Horário */}
          <div style={{ display: "flex", borderBottom: border }}>
            {/* Data */}
            <div style={fieldBase}
              onFocus={e => { const b = e.currentTarget.querySelector<HTMLElement>(".fbar"); if (b) b.style.transform = "scaleX(1)"; }}
              onBlur={e => { const b = e.currentTarget.querySelector<HTMLElement>(".fbar"); if (b) b.style.transform = "scaleX(0)"; }}>
              <span style={labelBase}><IconCalendar /> Data</span>
              <input type="date" defaultValue={match.match_date ?? ""}
                onChange={e => setMatchDate(e.target.value)}
                style={{ ...valueBase, colorScheme: "dark" }} />
              <div className="fbar" style={focusBar} />
            </div>

            {/* Horário */}
            <div style={{ ...fieldBase, borderLeft: border, cursor: "pointer" }}
              onClick={() => setShowClock(true)}>
              <span style={labelBase}><IconClock /> Horário</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: matchTime ? "var(--color-text-primary)" : "rgba(255,255,255,0.2)" }}>
                  {matchTime || "—"}
                </span>
                <IconChevron />
              </div>
              <div style={{ ...focusBar, transform: showClock ? "scaleX(1)" : "scaleX(0)" }} />
            </div>
          </div>

          {/* Linha 2: Estádio */}
          <div style={{ borderBottom: border, position: "relative" }} ref={venueRef}>
            <div style={{ ...fieldBase, cursor: "pointer" }}
              onClick={() => { setShowVenueDropdown(v => !v); setVenueSearch(""); }}>
              <span style={labelBase}><IconStadium /> Estádio / Arena</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: selectedVenue ? "var(--color-text-primary)" : "rgba(255,255,255,0.2)" }}>
                  {selectedVenue?.full_name ?? "Selecionar…"}
                </span>
                <IconChevron />
              </div>
              <div style={{ ...focusBar, transform: showVenueDropdown ? "scaleX(1)" : "scaleX(0)" }} />
            </div>

            {showVenueDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 200, backgroundColor: "#0e0e0e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.8)", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <input autoFocus type="text" value={venueSearch} onChange={e => setVenueSearch(e.target.value)}
                    placeholder="Buscar estádio…"
                    style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)" }} />
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {[{ id: "", full_name: "Nenhum" }, ...filteredVenues].map((v: any, i: number) => (
                    <div key={v.id || "none"}
                      onClick={() => { setVenueId(v.id); setShowVenueDropdown(false); setVenueSearch(""); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", backgroundColor: venueId === v.id ? "rgba(191,242,5,0.07)" : "transparent", transition: "background 0.1s" }}
                      onMouseEnter={e => { if (venueId !== v.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = venueId === v.id ? "rgba(191,242,5,0.07)" : "transparent"; }}
                    >
                      {/* Ícone estádio */}
                      <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
                          <path d="M1 9V5C1 3.5 2.5 2.5 5 2.5S9 3.5 9 5V9" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1" strokeLinecap="round"/>
                          <path d="M1 6h8M3 2.5V9M7 2.5V9" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1" strokeLinecap="round"/>
                          <ellipse cx="5" cy="2.5" rx="2.5" ry="1" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: venueId === v.id ? "#BFF205" : "var(--color-text-primary)", flex: 1 }}>
                        {v.full_name}
                      </span>
                      {venueId === v.id && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Linha 3: Descrição */}
          <div style={{ display: "flex" }}>
            <div style={fieldBase}
              onFocus={e => { const b = e.currentTarget.querySelector<HTMLElement>(".fbar2"); if (b) b.style.transform = "scaleX(1)"; }}
              onBlur={e => { const b = e.currentTarget.querySelector<HTMLElement>(".fbar2"); if (b) b.style.transform = "scaleX(0)"; }}>
              <span style={labelBase}><IconNote /> Descrição curta <span style={{ opacity: 0.4 }}>(opcional)</span></span>
              <input type="text" value={matchDescription} onChange={e => setMatchDescription(e.target.value)}
                placeholder="Ex: Jogo de volta da semifinal…"
                style={{ ...valueBase }} />
              <div className="fbar2" style={focusBar} />
            </div>
          </div>
        </div>
      </div>

      {/* ══ ARBITRAGEM ══ */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Arbitragem" subtitle="Árbitros escalados para a partida" />
        <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "visible" }}>

          {/* Lista de árbitros */}
          {matchReferees.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Nenhum árbitro adicionado.</p>
            </div>
          )}
          {matchReferees.map((r, idx) => (
            <div key={r.referee_id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: border, transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* Avatar */}
              <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {r.referees?.photo_url
                  ? <img src={(r.referees as any).photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#555" }}>
                      {(r.referees?.surname ?? r.referees?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                  {r.referees?.surname ?? r.referees?.full_name ?? "—"}
                </p>
                <span style={{ display: "inline-block", marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#BFF205", backgroundColor: "rgba(191,242,5,0.08)", border: "1px solid rgba(191,242,5,0.18)", borderRadius: 4, padding: "2px 6px" }}>
                  {REFEREE_ROLES.find(x => x.id === r.referee_role_id)?.label ?? "—"}
                </span>
              </div>

              {/* Remover */}
              <button type="button" onClick={() => handleRemoveReferee(r.referee_id)}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,100,100,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.4)"; e.currentTarget.style.color = "#FF4444"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,100,100,0.5)"; }}
              >×</button>
            </div>
          ))}

          {/* Adicionar árbitro */}
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }} ref={refereeRef}>

            {/* Dropdown de árbitro */}
            <div style={{ position: "relative" }}>
              <div onClick={() => { setShowRefereeDropdown(v => !v); setRefereeSearch(""); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, cursor: "pointer", transition: "border-color 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                {selectedRefereeForAdd ? (
                  <>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.06)" }}>
                      {selectedRefereeForAdd.photo_url
                        ? <img src={selectedRefereeForAdd.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#555" }}>
                            {(selectedRefereeForAdd.surname ?? selectedRefereeForAdd.full_name).slice(0, 2).toUpperCase()}
                          </div>
                      }
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
                      {selectedRefereeForAdd.surname ?? selectedRefereeForAdd.full_name}
                    </span>
                  </>
                ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.2)", flex: 1 }}>Selecionar árbitro…</span>
                )}
                <IconChevron />
              </div>

              {showRefereeDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200, backgroundColor: "#0e0e0e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.8)", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <input autoFocus type="text" value={refereeSearch} onChange={e => setRefereeSearch(e.target.value)}
                      placeholder="Buscar árbitro…"
                      style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)" }} />
                  </div>
                  <div style={{ maxHeight: 260, overflowY: "auto" }}>
                    {filteredReferees.length === 0
                      ? <p style={{ padding: "16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#444", textAlign: "center" }}>Nenhum resultado.</p>
                      : filteredReferees.map((r, idx) => (
                        <div key={r.id}
                          onClick={() => { setAddRefereeId(r.id); setShowRefereeDropdown(false); setRefereeSearch(""); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", backgroundColor: addRefereeId === r.id ? "rgba(191,242,5,0.07)" : "transparent", transition: "background 0.1s" }}
                          onMouseEnter={e => { if (addRefereeId !== r.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = addRefereeId === r.id ? "rgba(191,242,5,0.07)" : "transparent"; }}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.06)" }}>
                            {r.photo_url
                              ? <img src={r.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#555" }}>
                                  {(r.surname ?? r.full_name).slice(0, 2).toUpperCase()}
                                </div>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: addRefereeId === r.id ? "#BFF205" : "var(--color-text-primary)", margin: 0 }}>
                              {r.surname ?? r.full_name}
                            </p>
                            {r.surname && r.full_name !== r.surname && (
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", margin: 0, marginTop: 1 }}>{r.full_name}</p>
                            )}
                          </div>
                          {addRefereeId === r.id && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Função + botão adicionar */}
            <div style={{ display: "flex", gap: 8 }}>
              <select value={addRefereeRoleId} onChange={e => setAddRefereeRoleId(e.target.value)}
                style={{ flex: 1, padding: "10px 13px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, fontFamily: "var(--font-mono)", fontSize: 12, color: addRefereeRoleId ? "var(--color-text-primary)" : "rgba(255,255,255,0.2)", outline: "none", cursor: "pointer", colorScheme: "dark" as any }}>
                <option value="">Função do árbitro…</option>
                {REFEREE_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>

              <button type="button" onClick={handleAddReferee}
                style={{ padding: "10px 18px", borderRadius: 9, border: "1px solid rgba(191,242,5,0.25)", backgroundColor: "rgba(191,242,5,0.06)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.12)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.06)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.25)"; }}
              >+ Adicionar</button>
            </div>

            {matchReferees.length > 0 && (
              <button type="button" onClick={handleSaveReferees} disabled={savingReferees}
                style={{ alignSelf: "flex-start", padding: "8px 18px", borderRadius: 8, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, cursor: "pointer", opacity: savingReferees ? 0.5 : 1 }}>
                {savingReferees ? "Salvando…" : "Salvar árbitros"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ SÚMULA ══ */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Súmula" subtitle="Documento oficial da partida" />
        <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10 }}>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Súmula da partida</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", margin: 0, marginTop: 3 }}>PDF · máx. 5 MB</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                { label: "Baixar", icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v6M2.5 5l3 3 3-3M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>, variant: "neutral" },
                { label: "Subir PDF", icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 7V1M2.5 4l3-3 3 3M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>, variant: "neutral" },
                { label: "Visualizar", icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5.5s2-3.5 4.5-3.5S10 5.5 10 5.5s-2 3.5-4.5 3.5S1 5.5 1 5.5z" stroke="currentColor" strokeWidth="1.3"/></svg>, variant: "brand" },
              ] as const).map(({ label, icon, variant }) => (
                <button key={label} type="button"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap" as const,
                    borderColor: variant === "brand" ? "rgba(191,242,5,0.25)" : "rgba(255,255,255,0.1)",
                    backgroundColor: variant === "brand" ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.03)",
                    color: variant === "brand" ? "#BFF205" : "rgba(255,255,255,0.4)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = variant === "brand" ? "rgba(191,242,5,0.12)" : "rgba(255,255,255,0.07)"; e.currentTarget.style.color = variant === "brand" ? "#BFF205" : "var(--color-text-primary)"; e.currentTarget.style.borderColor = variant === "brand" ? "rgba(191,242,5,0.45)" : "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = variant === "brand" ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.03)"; e.currentTarget.style.color = variant === "brand" ? "#BFF205" : "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = variant === "brand" ? "rgba(191,242,5,0.25)" : "rgba(255,255,255,0.1)"; }}
                >{icon}{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ SALVAR ══ */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={handleSaveInfo} disabled={saving}
          style={{ padding: isMobile ? "12px 0" : "12px 40px", width: isMobile ? "100%" : "auto", borderRadius: 10, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>

      {showClock && (
        <TimePicker value={matchTime || "00:00"} onChange={v => setMatchTime(v)} onClose={() => setShowClock(false)} />
      )}
    </div>
  );
}

// ─── FormacoesTab ─────────────────────────────────────────────────────────────

function FormacoesTab({ match, lineups, setLineups, getAthletes, savingLineups, handleSaveLineups, toggleLineup }: {
  match: any;
  lineups: Record<string, LineupEntry>;
  setLineups: React.Dispatch<React.SetStateAction<Record<string, LineupEntry>>>;
  getAthletes: (teamId: string) => Athlete[];
  savingLineups: boolean;
  handleSaveLineups: () => void;
  toggleLineup: (athleteId: string, field: keyof Omit<LineupEntry, "athlete_id">) => void;
}) {
  const isMobile = useIsMobile();
  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const border = "1px solid var(--color-border)";

  function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205" }}>{title}</span>
          {subtitle && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1, letterSpacing: "0.06em" }}>{subtitle}</p>}
        </div>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
      </div>
    );
  }

  function TeamPanel({ teamId, team }: { teamId: string; team: any }) {
    const allAthletes = getAthletes(teamId).sort((a, b) =>
      (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name)
    );

    const isGKByPosition = (a: Athlete) =>
      a.player_positions?.abbreviation?.toLowerCase() === "gk" ||
      a.player_positions?.full_name?.toLowerCase().includes("goleiro");

    const goalkeepers = allAthletes.filter(isGKByPosition);
    const outfield = allAthletes.filter(a => !isGKByPosition(a));
    const presentCount = allAthletes.filter(a => lineups[a.id]?.is_present).length;

    function setCaptain(athleteId: string) {
      setLineups(prev => {
        const next = { ...prev };
        allAthletes.forEach(a => {
          if (next[a.id]?.is_captain) next[a.id] = { ...next[a.id], is_captain: false };
        });
        const already = prev[athleteId]?.is_captain;
        if (!already) {
          next[athleteId] = {
            ...(next[athleteId] ?? { athlete_id: athleteId, is_present: false, played_as_goalkeeper: false, is_captain: false }),
            is_captain: true,
          };
        }
        return next;
      });
    }

    function setGoalkeeper(athleteId: string) {
      setLineups(prev => {
        const next = { ...prev };
        allAthletes.forEach(a => {
          if (next[a.id]?.played_as_goalkeeper) next[a.id] = { ...next[a.id], played_as_goalkeeper: false };
        });
        const already = prev[athleteId]?.played_as_goalkeeper;
        if (!already) {
          next[athleteId] = {
            ...(next[athleteId] ?? { athlete_id: athleteId, is_present: false, played_as_goalkeeper: false, is_captain: false }),
            played_as_goalkeeper: true,
          };
        }
        return next;
      });
    }

    function AthleteRow({ athlete }: { athlete: Athlete }) {
      const entry = lineups[athlete.id] ?? { athlete_id: athlete.id, is_present: false, is_captain: false, played_as_goalkeeper: false };
      const isPresent = entry.is_present;
      const isCaptain = entry.is_captain;
      const isGK = entry.played_as_goalkeeper;
      const name = athlete.surname ?? athlete.full_name;

      return (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            backgroundColor: isPresent
              ? isCaptain ? "rgba(191,242,5,0.03)" : isGK ? "rgba(242,192,5,0.03)" : "transparent"
              : "transparent",
            transition: "background 0.12s",
            position: "relative" as const,
          }}
          onMouseEnter={e => { if (!isPresent) return; e.currentTarget.style.backgroundColor = isCaptain ? "rgba(191,242,5,0.05)" : isGK ? "rgba(242,192,5,0.05)" : "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = isPresent ? isCaptain ? "rgba(191,242,5,0.03)" : isGK ? "rgba(242,192,5,0.03)" : "transparent" : "transparent"; }}
        >
          {/* Barra lateral de status */}
          <div style={{
            position: "absolute", left: 0, top: 6, bottom: 6, width: 2, borderRadius: 1,
            backgroundColor: isCaptain ? "#BFF205" : isGK ? "#F2C005" : "transparent",
            transition: "background 0.15s",
          }} />

          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: `1.5px solid ${isCaptain ? "rgba(191,242,5,0.4)" : isGK ? "rgba(242,192,5,0.35)" : "rgba(255,255,255,0.08)"}`,
            opacity: isPresent ? 1 : 0.3,
            transition: "all 0.15s",
          }}>
            {athlete.photo_url
              ? <img src={athlete.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#555" }}>
                  {name.slice(0, 2).toUpperCase()}
                </div>
            }
          </div>

          {/* Número — placeholder */}
          <div style={{
            width: 20, flexShrink: 0, textAlign: "center",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            color: "rgba(255,255,255,0.15)",
          }}>—</div>

          {/* Nome + badges */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
              color: isPresent ? "var(--color-text-primary)" : "rgba(255,255,255,0.25)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
              transition: "color 0.15s",
            }}>{name}</span>

            {isCaptain && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
                letterSpacing: "0.06em", color: "#BFF205",
                backgroundColor: "rgba(191,242,5,0.1)", border: "1px solid rgba(191,242,5,0.25)",
                borderRadius: 4, padding: "1px 5px", flexShrink: 0,
              }}>CAP</span>
            )}
            {isGK && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
                letterSpacing: "0.06em", color: "#F2C005",
                backgroundColor: "rgba(242,192,5,0.1)", border: "1px solid rgba(242,192,5,0.25)",
                borderRadius: 4, padding: "1px 5px", flexShrink: 0,
              }}>GK</span>
            )}
          </div>

          {/* Ações */}
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
            {/* Botão GK */}
            <button type="button"
              onClick={() => isPresent && setGoalkeeper(athlete.id)}
              disabled={!isPresent}
              title="Goleiro na partida"
              style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid",
                cursor: isPresent ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
                letterSpacing: "0.02em", transition: "all 0.12s",
                borderColor: isGK ? "rgba(242,192,5,0.5)" : "rgba(255,255,255,0.08)",
                backgroundColor: isGK ? "rgba(242,192,5,0.12)" : "rgba(255,255,255,0.03)",
                color: isGK ? "#F2C005" : "rgba(255,255,255,0.2)",
                opacity: isPresent ? 1 : 0.3,
              }}>GK</button>

            {/* Botão Capitão */}
            <button type="button"
              onClick={() => isPresent && setCaptain(athlete.id)}
              disabled={!isPresent}
              title="Capitão"
              style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid",
                cursor: isPresent ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 900,
                transition: "all 0.12s",
                borderColor: isCaptain ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.08)",
                backgroundColor: isCaptain ? "rgba(191,242,5,0.12)" : "rgba(255,255,255,0.03)",
                color: isCaptain ? "#BFF205" : "rgba(255,255,255,0.2)",
                opacity: isPresent ? 1 : 0.3,
              }}>C</button>

            {/* Toggle presença */}
            <button type="button"
              onClick={() => toggleLineup(athlete.id, "is_present")}
              title={isPresent ? "Marcar ausência" : "Marcar presença"}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
                borderColor: isPresent ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.1)",
                backgroundColor: isPresent ? "rgba(191,242,5,0.1)" : "rgba(255,255,255,0.03)",
              }}>
              {isPresent
                ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/></svg>
              }
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header do time */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px", marginBottom: 2,
          borderRadius: "12px 12px 0 0",
          backgroundColor: "var(--color-surface)",
          border, borderBottom: "none",
        }}>
          {team?.logo_url
            ? <img src={team.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              {team?.short_name ?? team?.full_name ?? "Equipe"}
            </p>
          </div>
          {/* Contador */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900, color: presentCount > 0 ? "var(--color-brand)" : "rgba(255,255,255,0.15)", lineHeight: 1 }}>{presentCount}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>/{allAthletes.length}</span>
          </div>
        </div>

        {/* Header das colunas */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "5px 14px",
          backgroundColor: "rgba(255,255,255,0.02)",
          borderLeft: border, borderRight: border,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ width: 36, flexShrink: 0 }} />
          <div style={{ width: 20, flexShrink: 0, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const }}>#</div>
          <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const }}>Atleta</span>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ width: 28, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const }}>GK</span>
            <span style={{ width: 28, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const }}>C</span>
            <span style={{ width: 28, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const }}>✓</span>
          </div>
        </div>

        {/* Lista */}
        <div style={{
          borderRadius: "0 0 12px 12px",
          border, borderTop: "none",
          backgroundColor: "var(--color-surface)",
          overflow: "hidden",
        }}>
          {allAthletes.length === 0 ? (
            <p style={{ padding: "24px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.15)", textAlign: "center" }}>
              Nenhum atleta inscrito.
            </p>
          ) : (
            <>
              {goalkeepers.length > 0 && (
                <>
                  <div style={{ padding: "6px 14px", backgroundColor: "rgba(242,192,5,0.04)", borderBottom: "1px solid rgba(242,192,5,0.08)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#F2C005" }}>Goleiros</span>
                  </div>
                  {goalkeepers.map(a => <AthleteRow key={a.id} athlete={a} />)}
                </>
              )}
              {outfield.length > 0 && (
                <>
                  {goalkeepers.length > 0 && (
                    <div style={{ padding: "6px 14px", backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)" }}>Linha</span>
                    </div>
                  )}
                  {outfield.map(a => <AthleteRow key={a.id} athlete={a} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", paddingBottom: 80 }}>
      <SectionHeader title="Formações" subtitle="Escalação e presenças da partida" />

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16, alignItems: "flex-start" }}>
        <TeamPanel teamId={match.team_a_id} team={teamA} />
        <TeamPanel teamId={match.team_b_id} team={teamB} />
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" as const }}>
        {[
          { color: "#BFF205", label: "Capitão" },
          { color: "#F2C005", label: "Goleiro da partida" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: color }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Rodapé fixo */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: isMobile ? "12px 16px" : "12px 32px",
        backgroundColor: "rgba(10,10,10,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        zIndex: 20,
      }}>
        <button type="button" onClick={handleSaveLineups} disabled={savingLineups}
          style={{
            padding: isMobile ? "11px 0" : "11px 36px",
            width: isMobile ? "100%" : "auto",
            borderRadius: 9, border: "none",
            backgroundColor: "var(--color-brand)", color: "var(--color-background)",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
            cursor: savingLineups ? "not-allowed" : "pointer",
            opacity: savingLineups ? 0.5 : 1,
            boxShadow: "0 4px 24px rgba(191,242,5,0.15)",
          }}>
          {savingLineups ? "Salvando…" : "Salvar formações"}
        </button>
      </div>
    </div>
  );
}

// ─── MidiaTab ─────────────────────────────────────────────────────────────────

function MidiaTab({ match, motmAthleteId, setMotmAthleteId, motmTeamIdProp, setMotmTeamIdProp, highlightsUrl, setHighlightsUrl, photosUrl, setPhotosUrl, getAthletes, handleSaveInfo, saving }: {
  match: any;
  motmAthleteId: string;
  setMotmAthleteId: (v: string) => void;
  motmTeamIdProp: string;
  setMotmTeamIdProp: (v: string) => void;
  highlightsUrl: string;
  setHighlightsUrl: (v: string) => void;
  photosUrl: string;
  setPhotosUrl: (v: string) => void;
  getAthletes: (teamId: string) => Athlete[];
  handleSaveInfo: () => void;
  saving: boolean;
}) {
  const border = "1px solid var(--color-border)";
  const isMobile = useIsMobile();
  const teamA = match.teams_a;
  const teamB = match.teams_b;

  // Step: null = fechado, "team" = escolhendo time, "athlete" = escolhendo atleta
  const [motmStep, setMotmStep] = useState<null | "team" | "athlete">(null);
  const [motmTeamId, setMotmTeamId] = useState<string>(motmTeamIdProp ?? "");
  const [motmSearch, setMotmSearch] = useState("");

  const selectedMotm = [...getAthletes(match.team_a_id), ...getAthletes(match.team_b_id)]
    .find(a => a.id === motmAthleteId);

  const motmTeam = motmAthleteId
    ? (getAthletes(match.team_a_id).some(a => a.id === motmAthleteId) ? teamA : teamB)
    : null;

  const athletesForTeam = motmTeamId ? getAthletes(motmTeamId) : [];
  const filteredAthletes = motmSearch.trim()
    ? athletesForTeam.filter(a => (a.surname ?? a.full_name).toLowerCase().includes(motmSearch.toLowerCase()))
    : athletesForTeam;

  function openMotm() {
    // Pré-seleciona o time do atleta atual se houver
    if (motmAthleteId) {
      const inA = getAthletes(match.team_a_id).some(a => a.id === motmAthleteId);
      setMotmTeamId(inA ? match.team_a_id : match.team_b_id);
      setMotmStep("athlete");
    } else {
      setMotmTeamId("");
      setMotmStep("team");
    }
    setMotmSearch("");
  }

  function clearMotm(e: React.MouseEvent) {
    e.stopPropagation();
    setMotmAthleteId("");
    setMotmTeamId("");
    setMotmTeamIdProp("");
    setMotmStep(null);
  }

  function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.16em", textTransform: "uppercase" as const,
            color: "#BFF205",
          }}>{title}</span>
          {subtitle && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1, letterSpacing: "0.06em" }}>{subtitle}</p>
          )}
        </div>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, width: "100%" }}>

      {/* ══ MOTM ══ */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Melhor em Campo" subtitle="Man of the Match" />

        {/* Card de exibição / trigger */}
        <div
          onClick={openMotm}
          style={{
            borderRadius: 14, border: `1px solid ${motmAthleteId ? "rgba(191,242,5,0.25)" : "var(--color-border)"}`,
            backgroundColor: motmAthleteId ? "rgba(191,242,5,0.04)" : "var(--color-surface)",
            padding: isMobile ? "16px" : "20px 24px",
            cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = motmAthleteId ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = motmAthleteId ? "rgba(191,242,5,0.25)" : "var(--color-border)"; }}
        >
          {motmAthleteId && selectedMotm ? (
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 16 }}>
              {/* Foto grande */}
              <div style={{
                width: isMobile ? 52 : 64, height: isMobile ? 52 : 64,
                borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "2px solid rgba(191,242,5,0.3)",
              }}>
                {selectedMotm.photo_url
                  ? <img src={selectedMotm.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#555" }}>
                      {(selectedMotm.surname ?? selectedMotm.full_name).slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              {/* Nome + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1, margin: 0, letterSpacing: "0.02em" }}>
                  {selectedMotm.surname ?? selectedMotm.full_name}
                </p>
                {motmTeam && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    {motmTeam.logo_url && <img src={motmTeam.logo_url} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)" }}>
                      {motmTeam.short_name ?? motmTeam.full_name}
                    </span>
                  </div>
                )}
              </div>
              {/* Troféu */}
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(191,242,5,0.12)", border: "1px solid rgba(191,242,5,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
                  <path d="M6 8.5v2M4 10.5h4M2 1.5h8M3 1.5C3 5 1 5.5 1 7.5c0 0 .5 1 2 1M9 1.5C9 5 11 5.5 11 7.5c0 0-.5 1-2 1M3 8.5h6" stroke="#BFF205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 8.5C4.34 8.5 3 7.16 3 5.5V1.5h6v4c0 1.66-1.34 3-3 3z" stroke="#BFF205" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Limpar */}
              <button type="button" onClick={clearMotm}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "#555", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Placeholder */}
              <div style={{ width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 12 12" fill="none">
                  <path d="M6 8.5v2M4 10.5h4M2 1.5h8M3 1.5C3 5 1 5.5 1 7.5c0 0 .5 1 2 1M9 1.5C9 5 11 5.5 11 7.5c0 0-.5 1-2 1M3 8.5h6" stroke="rgba(255,255,255,0.15)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 8.5C4.34 8.5 3 7.16 3 5.5V1.5h6v4c0 1.66-1.34 3-3 3z" stroke="rgba(255,255,255,0.15)" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.25)", margin: 0 }}>Selecionar Melhor em Campo</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 3 }}>Toque para escolher o atleta</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal de seleção MOTM ── */}
        {motmStep !== null && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.82)", zIndex: 60, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}
          onClick={e => { if (e.target === e.currentTarget) setMotmStep(null); }}>
          <div style={{
            width: "100%", maxWidth: isMobile ? "100%" : 480,
            borderRadius: isMobile ? "18px 18px 0 0" : 18,
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "#0e0e0e",
            overflow: "hidden",
            boxShadow: isMobile ? "0 -24px 80px rgba(0,0,0,0.8)" : "0 32px 80px rgba(0,0,0,0.8)",
            maxHeight: isMobile ? "85vh" : "70vh",
            display: "flex", flexDirection: "column",
          }}>
            {/* Handle — só mobile */}
            {isMobile && (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)" }} />
              </div>
            )}

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {motmStep === "athlete" && motmTeamId && (
                    <button type="button" onClick={() => { setMotmStep("team"); setMotmSearch(""); }}
                      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                  )}
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>
                      {motmStep === "team" ? "Selecionar time" : "Selecionar atleta"}
                    </p>
                    {motmStep === "athlete" && motmTeamId && (() => {
                      const t = motmTeamId === match.team_a_id ? teamA : teamB;
                      return <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, marginTop: 2 }}>{t?.short_name ?? t?.full_name}</p>;
                    })()}
                  </div>
                </div>
                <button type="button" onClick={() => setMotmStep(null)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>

              {/* ── STEP: escolher time ── */}
              {motmStep === "team" && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[{ id: match.team_a_id, team: teamA }, { id: match.team_b_id, team: teamB }].map(({ id, team }) => (
                    <div key={id}
                      onClick={() => { setMotmTeamId(id); setMotmStep("athlete"); setMotmSearch(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "16px 18px", borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        cursor: "pointer", transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.05)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                    >
                      <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {team?.logo_url
                          ? <img src={team.logo_url} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
                          : <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#444" }}>
                              {(team?.short_name ?? team?.full_name ?? "?").slice(0, 2).toUpperCase()}
                            </div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "0.02em" }}>
                          {team?.short_name ?? team?.full_name ?? "—"}
                        </p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 3 }}>
                          {getAthletes(id).length} atletas
                        </p>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.25, flexShrink: 0 }}>
                        <path d="M4 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ))}
                </div>
              )}

              {/* ── STEP: escolher atleta ── */}
              {motmStep === "athlete" && (
                <>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <input autoFocus type="text" value={motmSearch} onChange={e => setMotmSearch(e.target.value)}
                      placeholder="Buscar atleta…"
                      style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)" }} />
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {filteredAthletes.length === 0 && (
                      <p style={{ padding: "24px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#444", textAlign: "center" }}>Nenhum atleta encontrado.</p>
                    )}
                    {filteredAthletes
                      .sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name))
                      .map(a => {
                        const isSelected = a.id === motmAthleteId;
                        return (
                          <div key={a.id}
                            onClick={() => {
                            setMotmAthleteId(a.id);
                            setMotmTeamId(motmTeamId);
                            setMotmTeamIdProp(motmTeamId);
                            setMotmStep(null);
                            setMotmSearch("");
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "12px 16px", cursor: "pointer",
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                              backgroundColor: isSelected ? "rgba(191,242,5,0.07)" : "transparent",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = isSelected ? "rgba(191,242,5,0.07)" : "transparent"; }}
                          >
                            <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.06)" }}>
                              {a.photo_url
                                ? <img src={a.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#555" }}>
                                    {(a.surname ?? a.full_name).slice(0, 2).toUpperCase()}
                                  </div>
                              }
                            </div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: isSelected ? "var(--color-brand)" : "var(--color-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {a.surname ?? a.full_name}
                            </span>
                            {isSelected && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7l4 4 6-6" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ LINKS DE MÍDIA ══ */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Links de Mídia" subtitle="URLs externas para fotos e vídeos" />
        <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>

          {/* Fotos */}
          <div style={{ padding: "16px 18px", borderBottom: border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="#BFF205" strokeWidth="1.2"/>
                <circle cx="4.5" cy="5" r="1.2" stroke="#BFF205" strokeWidth="1.1"/>
                <path d="M1 8.5l2.5-2.5 2 2 1.5-1.5L11 9.5" stroke="#BFF205" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-secondary)" }}>Fotos do jogo</span>
            </div>
            <input type="url" value={photosUrl} onChange={e => setPhotosUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
              style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13, color: photosUrl ? "var(--color-text-primary)" : "rgba(255,255,255,0.2)", background: "none", border: "none", outline: "none", padding: 0 }} />
            {photosUrl && (
              <a href={photosUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(191,242,5,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--color-brand)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(191,242,5,0.5)")}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6M6 1h3v3M9 1 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Abrir link
              </a>
            )}
          </div>

          {/* Vídeos */}
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2.5" width="7.5" height="7" rx="1.2" stroke="#BFF205" strokeWidth="1.2"/>
                <path d="M8.5 5l2.5-1.5v5L8.5 7" stroke="#BFF205" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-secondary)" }}>Vídeos / Highlights</span>
            </div>
            <input type="url" value={highlightsUrl} onChange={e => setHighlightsUrl(e.target.value)}
              placeholder="https://youtube.com/…"
              style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13, color: highlightsUrl ? "var(--color-text-primary)" : "rgba(255,255,255,0.2)", background: "none", border: "none", outline: "none", padding: 0 }} />
            {highlightsUrl && (
              <a href={highlightsUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(191,242,5,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--color-brand)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(191,242,5,0.5)")}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6M6 1h3v3M9 1 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Abrir link
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ══ SALVAR ══ */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={handleSaveInfo} disabled={saving}
          style={{
            padding: isMobile ? "12px 24px" : "12px 36px",
            borderRadius: 10, border: "none",
            backgroundColor: "var(--color-brand)", color: "var(--color-background)",
            fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase" as const,
            cursor: "pointer", opacity: saving ? 0.5 : 1, width: isMobile ? "100%" : "auto",
          }}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// ─── AthleteDropdown ──────────────────────────────────────────────────────────

function AthleteDropdown({ athletes, selectedId, onSelect, show, setShow, search, setSearch, dropdownRef, placeholder, optional }: {
  athletes: Athlete[]; selectedId: string;
  onSelect: (id: string) => void;
  show: boolean; setShow: (v: boolean) => void;
  search: string; setSearch: (v: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  placeholder: string; optional?: boolean;
}) {
  const selected = athletes.find(a => a.id === selectedId);
  const filtered = search.trim()
    ? athletes.filter(a => (a.surname ?? a.full_name).toLowerCase().includes(search.toLowerCase()))
    : athletes;
  const border = "1px solid var(--color-border)";

  return (
    <div style={{ position: "relative", marginTop: 4 }} ref={dropdownRef}>
      <div onClick={() => { setShow(!show); setSearch(""); }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", backgroundColor: "rgba(255,255,255,0.04)", border, borderRadius: 9, cursor: "pointer", transition: "border-color 0.12s" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}>
        {selected ? (
          <>
            <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.06)" }}>
              {selected.photo_url
                ? <img src={selected.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#555" }}>
                    {(selected.surname ?? selected.full_name).slice(0, 2).toUpperCase()}
                  </div>
              }
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
              {selected.surname ?? selected.full_name}
            </span>
            <button type="button" onClick={e => { e.stopPropagation(); onSelect(""); }}
              style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "none", color: "#555", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </>
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#444", flex: 1 }}>{placeholder}</span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>
      {show && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 200, backgroundColor: "#181818", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.7)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)" }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {optional && (
              <div onClick={() => onSelect("")}
                style={{ padding: "9px 12px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, color: "#555", borderBottom: "1px solid rgba(255,255,255,0.04)", backgroundColor: !selectedId ? "rgba(191,242,5,0.06)" : "transparent" }}
                onMouseEnter={e => { if (selectedId) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = !selectedId ? "rgba(191,242,5,0.06)" : "transparent"; }}>
                {placeholder}
              </div>
            )}
            {filtered.length === 0
              ? <p style={{ padding: "16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#444", textAlign: "center" }}>Nenhum resultado.</p>
              : filtered.sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name)).map((a, idx) => (
                <div key={a.id} onClick={() => onSelect(a.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", backgroundColor: selectedId === a.id ? "rgba(191,242,5,0.07)" : "transparent", transition: "background 0.1s" }}
                  onMouseEnter={e => { if (selectedId !== a.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = selectedId === a.id ? "rgba(191,242,5,0.07)" : "transparent"; }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.06)" }}>
                    {a.photo_url
                      ? <img src={a.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#555" }}>
                          {(a.surname ?? a.full_name).slice(0, 2).toUpperCase()}
                        </div>
                    }
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: selectedId === a.id ? "var(--color-brand)" : "var(--color-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.surname ?? a.full_name}
                  </span>
                  {selectedId === a.id && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand)" }}>✓</span>}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MinutePicker ─────────────────────────────────────────────────────────────

function MinutePicker({ value, max, onChange, onClose }: {
  value: number; max: number; onChange: (v: number) => void; onClose: () => void;
}) {
  const [sel, setSel] = useState(value);
  const items = Array.from({ length: max }, (_, i) => i + 1);
  const ITEM_H = 48;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 220, borderRadius: 18, border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555" }}>Minuto</span>
          <button type="button" onClick={onClose} style={{ width: 24, height: 24, borderRadius: 5, border: "1px solid var(--color-border)", background: "none", color: "#555", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", height: ITEM_H * 3, width: 100, overflow: "hidden" }}
            onWheel={e => { e.preventDefault(); const idx = items.indexOf(sel); const next = Math.max(0, Math.min(items.length - 1, idx + (e.deltaY > 0 ? 1 : -1))); setSel(items[next]); }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: ITEM_H, background: "linear-gradient(to bottom, var(--color-surface), transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: ITEM_H, left: 4, right: 4, height: ITEM_H, background: "rgba(191,242,5,0.07)", border: "1px solid rgba(191,242,5,0.18)", borderRadius: 10, zIndex: 1, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: ITEM_H, background: "linear-gradient(to top, var(--color-surface), transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", transform: `translateY(${-(items.indexOf(sel)) * ITEM_H + ITEM_H}px)`, transition: "transform 0.2s cubic-bezier(.4,0,.2,1)" }}>
              {items.map(v => (
                <div key={v} onClick={() => setSel(v)} style={{ height: ITEM_H, width: 100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, cursor: "pointer", color: v === sel ? "var(--color-brand)" : Math.abs(v - sel) === 1 ? "#3a3a3a" : "#1e1e1e", transition: "color 0.15s", userSelect: "none" }}>
                  {v}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--color-border)", display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 8, border: "1px solid var(--color-border)", background: "none", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
          <button type="button" onClick={() => { onChange(sel); onClose(); }} style={{ flex: 1, padding: 9, borderRadius: 8, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── ActionModal ──────────────────────────────────────────────────────────────

function ActionModal({ actionType, preselectedTeamId, match, getAthletes, halfDuration, onConfirm, onClose, editingAction, getPeriodFromMinute }: {
  actionType: string; preselectedTeamId?: string; match: any;
  getAthletes: (teamId: string) => Athlete[]; halfDuration: number;
  onConfirm: (fd: FormData) => void; onClose: () => void;
  editingAction?: any; getPeriodFromMinute: (m: number) => "first" | "second";
}) {
  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const isGoal = actionType === "goal";
  const needsAthlete = actionType !== "fifth_foul";
  const needsMiss = ["penalty_missed", "shootout_missed"].includes(actionType);
  const needsTeam = !preselectedTeamId;

  const [teamId, setTeamId] = useState<string>(editingAction?.team_id ?? preselectedTeamId ?? match.team_a_id ?? "");
  const [minute, setMinute] = useState<number>(editingAction?.minute ?? 1);
  const [showMinutePicker, setShowMinutePicker] = useState(false);
  const [athleteId, setAthleteId] = useState<string>(editingAction?.primary_athlete?.id ?? "");
  const [assistId, setAssistId] = useState<string>(editingAction?.secondary_athlete?.id ?? "");
  const [goalType, setGoalType] = useState<string>(editingAction?.goal_type ?? "normal");
  const [missResult, setMissResult] = useState<string>(editingAction?.miss_result ?? "");
  const [goalkeeperIdVal, setGoalkeeperIdVal] = useState<string>(editingAction?.goalkeeper_id ?? "");

  const [showAthleteDropdown, setShowAthleteDropdown] = useState(false);
  const [showAssistDropdown, setShowAssistDropdown] = useState(false);
  const [showGkDropdown, setShowGkDropdown] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [assistSearch, setAssistSearch] = useState("");
  const [gkSearch, setGkSearch] = useState("");
  const athleteDropRef = useRef<HTMLDivElement>(null);
  const assistDropRef = useRef<HTMLDivElement>(null);
  const gkDropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (athleteDropRef.current && !athleteDropRef.current.contains(e.target as Node)) setShowAthleteDropdown(false);
      if (assistDropRef.current && !assistDropRef.current.contains(e.target as Node)) setShowAssistDropdown(false);
      if (gkDropRef.current && !gkDropRef.current.contains(e.target as Node)) setShowGkDropdown(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const isOwnGoal = goalType === "own_goal";
  const period = getPeriodFromMinute(minute);
  const athleteTeamId = isOwnGoal ? (teamId === match.team_a_id ? match.team_b_id : match.team_a_id) : teamId;
  const athletes = getAthletes(athleteTeamId);
  const opposingTeamId = teamId === match.team_a_id ? match.team_b_id : match.team_a_id;
  const opposingAthletes = getAthletes(opposingTeamId);

  const border = "1px solid var(--color-border)";
  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", backgroundColor: "var(--color-surface)", position: "relative", transition: "background 0.12s" };
  const labelStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#555" };
  const selectStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, outline: "none", width: "100%", padding: "8px 12px", cursor: "pointer", colorScheme: "dark" as any };

  function handleConfirm() {
    const fd = new FormData();
    fd.append("action_type", actionType);
    // team_id = o time que RECEBE o gol (quem o admin clicou no +, ou selecionou no modal)
    // Para gol contra: team_id = Time A (clicado), atleta = jogador do Time B. Correto.
    fd.append("team_id", teamId);
    fd.append("minute", String(minute));
    if (needsAthlete && athleteId) fd.append("primary_athlete_id", athleteId);
    if (isGoal && !isOwnGoal && assistId) fd.append("secondary_athlete_id", assistId);
    if (isGoal) fd.append("goal_type", goalType);
    if (needsMiss && missResult) fd.append("miss_result", missResult);
    if (needsMiss && missResult === "goalkeeper_save" && goalkeeperIdVal) fd.append("goalkeeper_id", goalkeeperIdVal);
    onConfirm(fd);
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {showMinutePicker && <MinutePicker value={minute} max={halfDuration * 2} onChange={v => setMinute(v)} onClose={() => setShowMinutePicker(false)} />}
      <div style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#181818", overflow: "visible", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: border }}>
          <ActionIcon actionType={actionType} goalType={undefined} size={20} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", flex: 1 }}>{ACTION_LABELS[actionType] ?? actionType}</span>
          <button type="button" onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border, background: "none", color: "#555", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, backgroundColor: "var(--color-border)" }}>
          {needsTeam && (
            <div style={{ ...fieldStyle, flexDirection: "row" as const, gap: 10, padding: "12px 14px" }}>
              {[{ id: match.team_a_id, team: teamA }, { id: match.team_b_id, team: teamB }].map(({ id, team }) => (
                <div key={id} onClick={() => { setTeamId(id); setAthleteId(""); setAssistId(""); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 8px", borderRadius: 10, border: `1px solid ${teamId === id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.07)"}`, backgroundColor: teamId === id ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.12s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {team?.logo_url ? <img src={team.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 8 }} />}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: teamId === id ? "var(--color-brand)" : "var(--color-text-secondary)", textAlign: "center" }}>
                    {team?.short_name ?? team?.full_name ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {(
            <div style={{ ...fieldStyle, cursor: "pointer" }} onClick={() => setShowMinutePicker(true)}>
              <span style={labelStyle}>Minuto</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--color-brand)" }}>{minute}'</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", padding: "3px 8px", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {period === "first" ? "1º Tempo" : "2º Tempo"}
                </span>
              </div>
            </div>
          )}
          {isGoal && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Tipo de gol</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {[{ value: "normal", label: "Normal" }, { value: "penalty", label: "Pênalti" }, { value: "shootout", label: "Shoot-out" }, { value: "own_goal", label: "Gol contra" }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => { setGoalType(opt.value); setAthleteId(""); }}
                    style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${goalType === opt.value ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: goalType === opt.value ? "rgba(191,242,5,0.08)" : "rgba(255,255,255,0.03)", color: goalType === opt.value ? "var(--color-brand)" : "#777", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {needsAthlete && (
            <div style={fieldStyle}>
              <span style={labelStyle}>{isOwnGoal ? "Atleta (equipe oposta)" : "Atleta"}</span>
              <AthleteDropdown
                athletes={athletes}
                selectedId={athleteId}
                onSelect={id => { setAthleteId(id); setShowAthleteDropdown(false); }}
                show={showAthleteDropdown}
                setShow={setShowAthleteDropdown}
                search={athleteSearch}
                setSearch={setAthleteSearch}
                dropdownRef={athleteDropRef}
                placeholder="Selecione o atleta…"
              />
            </div>
          )}
          {isGoal && !isOwnGoal && goalType !== "penalty" && goalType !== "shootout" && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Assistência (opcional)</span>
              <AthleteDropdown
                athletes={athletes.filter(a => a.id !== athleteId)}
                selectedId={assistId}
                onSelect={id => { setAssistId(id); setShowAssistDropdown(false); }}
                show={showAssistDropdown}
                setShow={setShowAssistDropdown}
                search={assistSearch}
                setSearch={setAssistSearch}
                dropdownRef={assistDropRef}
                placeholder="Sem assistência"
                optional
              />
            </div>
          )}
          {needsMiss && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Resultado</span>
              <select value={missResult} onChange={e => setMissResult(e.target.value)} style={{ ...selectStyle, marginTop: 4 }}>
                <option value="">Selecione…</option>
                {Object.entries(MISS_RESULTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          {needsMiss && missResult === "goalkeeper_save" && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Goleiro que defendeu (opcional)</span>
              <AthleteDropdown
                athletes={opposingAthletes}
                selectedId={goalkeeperIdVal}
                onSelect={id => { setGoalkeeperIdVal(id); setShowGkDropdown(false); }}
                show={showGkDropdown}
                setShow={setShowGkDropdown}
                search={gkSearch}
                setSearch={setGkSearch}
                dropdownRef={gkDropRef}
                placeholder="Selecione o goleiro…"
                optional
              />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "14px 18px", borderTop: border }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border, background: "none", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
          <button type="button" onClick={() => { handleConfirm(); onClose(); }} style={{ flex: 1, padding: 10, borderRadius: 9, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── ShootoutModal ────────────────────────────────────────────────────────────

function ShootoutModal({ match, shootoutType, getAthletes, editingShootout, onConfirm, onClose }: {
  match: any; shootoutType: string;
  getAthletes: (teamId: string) => Athlete[];
  editingShootout?: any;
  onConfirm: (fd: FormData) => void; onClose: () => void;
}) {
  const [teamId, setTeamId] = useState<string>(editingShootout?.team_id ?? match.team_a_id ?? "");
  const [result, setResult] = useState<string>(editingShootout?.result ?? "goal");
  const [athleteId, setAthleteId] = useState<string>(editingShootout?.athlete?.id ?? "");
  const [goalkeeperIdVal, setGoalkeeperIdVal] = useState<string>(editingShootout?.goalkeeper_id ?? "");
  const athletes = getAthletes(teamId);
  const opposingTeamId = teamId === match.team_a_id ? match.team_b_id : match.team_a_id;
  const opposingAthletes = getAthletes(opposingTeamId);
  const border = "1px solid var(--color-border)";
  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", backgroundColor: "var(--color-surface)" };
  const labelStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#555" };
  const selectStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, outline: "none", width: "100%", padding: "8px 12px", cursor: "pointer", colorScheme: "dark" as any };
  const teamA = match.teams_a; const teamB = match.teams_b;

  function handleConfirm() {
    const fd = new FormData();
    fd.append("team_id", teamId);
    fd.append("shootout_type", shootoutType);
    fd.append("result", result);
    if (athleteId) fd.append("athlete_id", athleteId);
    if (result === "goalkeeper_save" && goalkeeperIdVal) fd.append("goalkeeper_id", goalkeeperIdVal);
    if (editingShootout) fd.append("editing_id", editingShootout.id);
    onConfirm(fd);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 400, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#181818", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: border }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", flex: 1 }}>
            {editingShootout ? "Editar cobrança" : `Adicionar ${shootoutType === "penalties" ? "Pênalti" : "Shoot-out"}`}
          </span>
          <button type="button" onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border, background: "none", color: "#555", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, backgroundColor: "var(--color-border)" }}>
          <div style={{ ...fieldStyle, flexDirection: "row" as const, gap: 10, padding: "12px 14px" }}>
            {[{ id: match.team_a_id, team: teamA }, { id: match.team_b_id, team: teamB }].map(({ id, team }) => (
              <div key={id} onClick={() => { setTeamId(id); setAthleteId(""); }}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "10px 8px", borderRadius: 10, border: `1px solid ${teamId === id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.07)"}`, backgroundColor: teamId === id ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.12s" }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {team?.logo_url ? <img src={team.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 7 }} />}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: teamId === id ? "var(--color-brand)" : "var(--color-text-secondary)", textAlign: "center" }}>
                  {team?.short_name ?? team?.full_name ?? "—"}
                </span>
              </div>
            ))}
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Resultado</span>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" as const }}>
              {[{ v: "goal", l: "✓ Convertido" }, { v: "goalkeeper_save", l: "Defesa" }, { v: "off_target", l: "Para fora" }, { v: "post", l: "Na trave" }].map(opt => (
                <button key={opt.v} type="button" onClick={() => setResult(opt.v)}
                  style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${result === opt.v ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: result === opt.v ? "rgba(191,242,5,0.08)" : "rgba(255,255,255,0.03)", color: result === opt.v ? "var(--color-brand)" : "#777", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap" as const }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Cobrador</span>
            <select value={athleteId} onChange={e => setAthleteId(e.target.value)} style={{ ...selectStyle, marginTop: 4 }}>
              <option value="">Selecione…</option>
              {athletes.sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name)).map(a => (
                <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>
              ))}
            </select>
          </div>
          {result === "goalkeeper_save" && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Goleiro que defendeu (opcional)</span>
              <select value={goalkeeperIdVal} onChange={e => setGoalkeeperIdVal(e.target.value)} style={{ ...selectStyle, marginTop: 4 }}>
                <option value="">Selecione…</option>
                {opposingAthletes.sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name)).map(a => (
                  <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "14px 18px", borderTop: border }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border, background: "none", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
          <button type="button" onClick={handleConfirm} style={{ flex: 1, padding: 10, borderRadius: 9, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 640); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ─── PosJogoTab ───────────────────────────────────────────────────────────────

function PosJogoTab({
  match, actions, shootout, scoreA, scoreB, status, finishType,
  teamStats, activePeriod, setActivePeriod, activeShootoutTab, setActiveShootoutTab,
  showEndModal, setShowEndModal, endFinishType, setEndFinishType,
  endAggregateWinnerId, setEndAggregateWinnerId, savingEnd, publishing, published,
  addingAction, editingAction, setEditingAction, showActionModal, setShowActionModal,
  openActionType, setOpenActionType, motmAthleteId, setMotmAthleteId,
  halfDuration, getAthletes, handleChangeFouls, getFouls,
  handleAddAction, handleDelete, handleAddShootout, handleDeleteShootout,
  handleEncerrar, handlePublish, getPeriodFromMinute,
}: any) {
  const border = "1px solid var(--color-border)";
  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const tiebreaker = match.phases?.penalty_tiebreaker_type ?? null;
  const hasShootout = finishType === "shootouts" || finishType === "penalties";

  const [openGoalTeam, setOpenGoalTeam] = useState<string | null>(null);
  const [openShootoutModal, setOpenShootoutModal] = useState(false);
  const [editingShootout, setEditingShootout] = useState<any | null>(null);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const isMobile = useIsMobile();

  const secondHalf = [...actions]
    .filter((a: any) => a.period === "second")
    .sort((a: any, b: any) => {
      const minuteDiff = (b.minute ?? 0) - (a.minute ?? 0);
      if (minuteDiff !== 0) return minuteDiff;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  const firstHalf = [...actions]
    .filter((a: any) => a.period === "first")
    .sort((a: any, b: any) => {
      const minuteDiff = (b.minute ?? 0) - (a.minute ?? 0);
      if (minuteDiff !== 0) return minuteDiff;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });

  const foulsA = getFouls(match.team_a_id, activePeriod);
  const foulsB = getFouls(match.team_b_id, activePeriod);

  const actionsWithScore = (() => {
    const sorted = [...actions].sort((a: any, b: any) => {
      if (a.period !== b.period) return a.period === "first" ? -1 : 1;
      const minuteDiff = (a.minute ?? 0) - (b.minute ?? 0);
      if (minuteDiff !== 0) return minuteDiff;
      return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    });
    let sA = 0; let sB = 0;
    const scoreMap: Record<string, string> = {};
    sorted.forEach((a: any) => {
      if (a.action_type === "goal") {
        // team_id no banco = quem marcou (já corrigido na origem)
        if (a.team_id === match.team_a_id) sA++; else sB++;
        scoreMap[a.id] = `${sA}–${sB}`;
      }
    });
    return scoreMap;
  })();

  const winnerSide = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null;

  // Label secundária para cada tipo de ação
  function getSecondaryLabel(action: any): string | null {
    if (action.action_type === "goal") {
      if (action.goal_type === "penalty") return "Pênalti";
      if (action.goal_type === "own_goal" || action.is_own_goal) return "Gol contra";
      if (action.goal_type === "shootout") return "Shoot-out";
      return null;
    }
    if (action.action_type === "penalty_missed" || action.action_type === "shootout_missed") {
      return MISS_RESULTS[action.miss_result] ?? null;
    }
    if (action.action_type === "yellow_card") return "Cartão amarelo";
    if (action.action_type === "red_card") return "Cartão vermelho";
    if (action.action_type === "red_yellow_card") return "Segundo amarelo";
    if (action.action_type === "fifth_foul") return "Quinta falta";
    if (action.action_type === "foul") return "Falta";
    return null;
  }

  // ── TimelineRow ─────────────────────────────────────────────────────────────
  function TimelineRow({ action, scoreLabel }: { action: any; scoreLabel?: string }) {
    const isA = action.team_id === match.team_a_id;
    const isGoal = action.action_type === "goal";
    const isOwnGoal = action.is_own_goal;
    const name = action.primary_athlete?.surname ?? action.primary_athlete?.full_name ?? "";
    const assistName = action.secondary_athlete?.surname ?? action.secondary_athlete?.full_name ?? "";

    // Ícone correto por tipo
    function EventIcon() {
      const type = action.action_type;
      const isCard = ["yellow_card", "red_card", "red_yellow_card"].includes(type);
      if (isCard) return <ActionIcon actionType={type} size={18} />;
      if (type === "goal" && isOwnGoal) return <ActionIcon actionType="goal" goalType="own_goal" size={18} />;
      if (type === "goal") {
        const gt = action.goal_type ?? "normal";
        return (
          <span style={{ color: "rgba(255,255,255,0.6)", display: "flex" }}>
            <ActionIcon actionType="goal" goalType={gt} size={18} />
          </span>
        );
      }
      return (
        <span style={{ color: "rgba(255,255,255,0.55)", display: "flex" }}>
          <ActionIcon actionType={type} goalType="normal" size={18} />
        </span>
      );
    }

    // Linha secundária: apenas assistência em gols, apenas miss_result em pênalti/shootout perdido
    function SecondaryLine() {
      if (isGoal) {
        if (!assistName) return null;
        return (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.38)", margin: 0, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Assist. {assistName}
          </p>
        );
      }
      if (action.action_type === "penalty_missed" || action.action_type === "shootout_missed") {
        const label = MISS_RESULTS[action.miss_result] ?? null;
        if (!label) return null;
        return (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.38)", margin: 0, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </p>
        );
      }
      return null;
    }

    function EventContent({ align }: { align: "left" | "right" }) {
      const isRight = align === "right";
      return (
        <div
          onClick={() => { setEditingAction(action); setOpenActionType(action.action_type); setShowActionModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "100%", flexDirection: isRight ? "row-reverse" : "row" }}
        >
          {/* Ícone */}
          <div style={{ flexShrink: 0, width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EventIcon />
          </div>

          {/* Placar — só em gols, sempre #BFF205 */}
          {isGoal && scoreLabel && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 900,
              color: "#BFF205", flexShrink: 0, lineHeight: 1, letterSpacing: "0.02em",
            }}>
              {scoreLabel}
            </span>
          )}

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0, textAlign: isRight ? "right" : "left" }}>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
              color: "var(--color-text-primary)", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              lineHeight: 1.3, letterSpacing: "0.02em", margin: 0,
            }}>
              {name || ACTION_LABELS[action.action_type] || "—"}
            </p>
            <SecondaryLine />
          </div>

          {/* Deletar */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleDelete(action.id, action.action_type, action.is_own_goal, action.team_id); }}
            className="tl-del-btn"
            style={{
              width: 20, height: 20, borderRadius: 4, border: "1px solid rgba(255,68,68,0.2)",
              background: "none", color: "#FF4444", cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, opacity: 0, transition: "opacity 0.15s",
            }}
          >×</button>
        </div>
      );
    }

    return (
      <div
        style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 48px 1fr" : "1fr 64px 1fr", alignItems: "center", minHeight: 46, borderBottom: "1px solid rgba(255,255,255,0.03)" }}
        onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".tl-del-btn").forEach(b => b.style.opacity = "1")}
        onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".tl-del-btn").forEach(b => b.style.opacity = "0")}
      >
        <div style={{ padding: "10px 8px 10px 0", display: "flex", alignItems: "center" }}>
          {isA ? <EventContent align="left" /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{
            fontFamily: "var(--font-mono)", fontSize: isMobile ? 13 : 18, fontWeight: 800,
            color: "rgba(255,255,255,0.45)", letterSpacing: "0.01em", lineHeight: 1,
          }}>
            {action.minute ? `${action.minute}'` : "—"}
          </span>
        </div>
        <div style={{ padding: "10px 0 10px 8px", display: "flex", alignItems: "center" }}>
          {!isA ? <EventContent align="right" /> : null}
        </div>
      </div>
    );
  }

  // ── ShootoutSection ─────────────────────────────────────────────────────────
  function ShootoutSection() {
    const shootoutType = tiebreaker ?? "shootouts";
    const teamAKicks = shootout
      .filter((s: any) => s.team_id === match.team_a_id)
      .sort((a: any, b: any) => a.kick_order - b.kick_order);
    const teamBKicks = shootout
      .filter((s: any) => s.team_id === match.team_b_id)
      .sort((a: any, b: any) => a.kick_order - b.kick_order);
    const totalA = teamAKicks.filter((s: any) => s.result === "goal").length;
    const totalB = teamBKicks.filter((s: any) => s.result === "goal").length;
    const maxKicks = Math.max(teamAKicks.length, teamBKicks.length, 0);

    function KickDot({ result }: { result: string }) {
      const isGoal = result === "goal";
      return (
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          backgroundColor: isGoal ? "rgba(191,242,5,0.1)" : "rgba(255,68,68,0.08)",
          border: `1px solid ${isGoal ? "rgba(191,242,5,0.2)" : "rgba(255,68,68,0.18)"}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {isGoal
            ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#BFF205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#FF4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
          }
        </div>
      );
    }

    return (
      <div style={{ marginTop: 8 }}>
        {/* Header placar */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 64px 1fr",
          borderRadius: 12, border, backgroundColor: "var(--color-surface)",
          overflow: "hidden", marginBottom: 8,
        }}>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            {teamA?.logo_url && <img src={teamA.logo_url} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>
              {teamA?.short_name ?? teamA?.full_name ?? "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, color: totalA > totalB ? "var(--color-brand)" : "var(--color-text-secondary)" }}>{totalA}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#2a2a2a" }}>–</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, color: totalB > totalA ? "var(--color-brand)" : "var(--color-text-secondary)" }}>{totalB}</span>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>
              {teamB?.short_name ?? teamB?.full_name ?? "—"}
            </span>
            {teamB?.logo_url && <img src={teamB.logo_url} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />}
          </div>
        </div>

        {/* Kicks */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {Array.from({ length: maxKicks }).map((_, i) => {
            const kA = teamAKicks[i];
            const kB = teamBKicks[i];
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 64px 1fr",
                alignItems: "center", minHeight: 40,
                borderBottom: i < maxKicks - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 0" }}>
                {kA && (
                    <>
                      <KickDot result={kA.result} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {kA.athlete?.surname ?? kA.athlete?.full_name ?? "—"}
                      </span>
                      <button type="button" onClick={() => { setEditingShootout(kA); setOpenShootoutModal(true); }}
                        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
                      <button type="button" onClick={() => handleDeleteShootout(kA.id)}
                        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,68,68,0.2)", background: "none", color: "#FF4444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                    </>
                  )}
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#2a2a2a" }}>{i + 1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "6px 0 6px 8px" }}>
                {kB && (
                    <>
                      <button type="button" onClick={() => handleDeleteShootout(kB.id)}
                        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,68,68,0.2)", background: "none", color: "#FF4444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                      <button type="button" onClick={() => { setEditingShootout(kB); setOpenShootoutModal(true); }}
                        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                        {kB.athlete?.surname ?? kB.athlete?.full_name ?? "—"}
                      </span>
                      <KickDot result={kB.result} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={() => setOpenShootoutModal(true)}
          style={{
            width: "100%", marginTop: 8, padding: "12px",
            border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10,
            background: "none", color: "#444", fontFamily: "var(--font-mono)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--color-brand)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >+ Adicionar cobrança</button>
      </div>
    );
  }

  // ── Render principal ────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 80, width: "100%", paddingLeft: isMobile ? 0 : 0, paddingRight: isMobile ? 0 : 0 }}>

      {/* ── Modal encerramento ── */}
      {showEndModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.78)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowEndModal(false); }}>
          <div style={{ width: "100%", maxWidth: 400, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#111", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: border }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Encerrar partida</span>
              <button type="button" onClick={() => setShowEndModal(false)} style={{ width: 28, height: 28, borderRadius: 7, border, background: "none", color: "#555", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Tipo de encerramento</p>
              {[{ v: "normal", l: "Normal" }, { v: "penalties", l: "Pênaltis" }, { v: "shootouts", l: "Shoot-outs" }, { v: "walkover", l: "W.O." }, { v: "postponed", l: "Adiada" }].map(opt => (
                <div key={opt.v} onClick={() => setEndFinishType(opt.v)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 9, border: `1px solid ${endFinishType === opt.v ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.07)"}`, backgroundColor: endFinishType === opt.v ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.12s" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${endFinishType === opt.v ? "var(--color-brand)" : "#333"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {endFinishType === opt.v && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-brand)" }} />}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: endFinishType === opt.v ? "var(--color-text-primary)" : "#555" }}>{opt.l}</span>
                </div>
              ))}
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginTop: 8, marginBottom: 4 }}>Vencedor agregado (opcional)</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ id: "", label: "Empate", logo: null }, { id: match.team_a_id, label: teamA?.short_name ?? "A", logo: teamA?.logo_url }, { id: match.team_b_id, label: teamB?.short_name ?? "B", logo: teamB?.logo_url }].map(opt => (
                  <div key={opt.id} onClick={() => setEndAggregateWinnerId(opt.id)}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "10px 8px", borderRadius: 10, border: `1px solid ${endAggregateWinnerId === opt.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.07)"}`, backgroundColor: endAggregateWinnerId === opt.id ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.02)", cursor: "pointer" }}>
                    {opt.logo ? <img src={opt.logo} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} /> : <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: "#333" }}>—</span></div>}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: endAggregateWinnerId === opt.id ? "var(--color-brand)" : "#444", textAlign: "center" }}>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderTop: border }}>
              <button type="button" onClick={() => setShowEndModal(false)} style={{ flex: 1, padding: 11, borderRadius: 9, border, background: "none", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={handleEncerrar} disabled={savingEnd || !endFinishType}
                style={{ flex: 2, padding: 11, borderRadius: 9, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", opacity: savingEnd || !endFinishType ? 0.45 : 1 }}>
                {savingEnd ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modais de ação ── */}
      {(openGoalTeam !== null || (showActionModal && openActionType)) && (
        <ActionModal
          actionType={openGoalTeam ? "goal" : openActionType!}
          preselectedTeamId={openGoalTeam ?? undefined}
          match={match}
          getAthletes={getAthletes}
          halfDuration={halfDuration}
          editingAction={editingAction}
          onConfirm={(fd) => handleAddAction(fd)}
          onClose={() => { setOpenGoalTeam(null); setOpenActionType(null); setShowActionModal(false); setEditingAction(null); }}
          getPeriodFromMinute={getPeriodFromMinute}
        />
      )}

      {/* ── Modal shootout ── */}
      {openShootoutModal && (
        <ShootoutModal
          match={match}
          shootoutType={tiebreaker ?? "shootouts"}
          getAthletes={getAthletes}
          editingShootout={editingShootout}
          onConfirm={handleAddShootout}
          onClose={() => { setOpenShootoutModal(false); setEditingShootout(null); }}
        />
      )}

      {/* ══ BLOCO 1 — STATUS ══ */}
      <div
        onClick={() => setShowEndModal(true)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 18px", borderRadius: 10, border,
          backgroundColor: "var(--color-surface)", cursor: "pointer",
          marginBottom: 10, transition: "border-color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Status da partida</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: finishType ? "var(--color-brand)" : "rgba(255,255,255,0.2)" }}>
            {finishType ? FINISH_TYPE_LABELS[finishType] ?? finishType : "Definir encerramento"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 16, lineHeight: 1 }}>›</span>
        </div>
      </div>

      {/* ══ BLOCO 2 — SCOREBOARD COM + ══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr auto 1fr" : "1fr auto 1fr",
        borderRadius: 12, border, backgroundColor: "var(--color-surface)",
        overflow: "hidden", marginBottom: 10, position: "relative",
      }}>
        {/* Underline vencedor */}
        {winnerSide && status !== "scheduled" && (
          <div style={{
            position: "absolute", bottom: 0,
            left: winnerSide === "a" ? 0 : "auto",
            right: winnerSide === "b" ? 0 : "auto",
            width: "40%", height: 2,
            backgroundColor: "var(--color-brand)", borderRadius: 1,
          }} />
        )}
        {/* Time A */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
          {teamA?.logo_url ? <img src={teamA.logo_url} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} /> : <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.05)" }} />}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: winnerSide === "a" ? "var(--color-text-primary)" : "var(--color-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {teamA?.short_name ?? teamA?.full_name ?? "—"}
          </span>
          <button type="button" onClick={() => setOpenGoalTeam(match.team_a_id)}
            style={{ marginLeft: 2, width: 28, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", fontSize: 18, color: "#444", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.1)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; e.currentTarget.style.color = "#BFF205"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#444"; }}>+</button>
        </div>
        {/* Placar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 22px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 900, lineHeight: 1, color: winnerSide === "a" ? "var(--color-brand)" : "var(--color-text-secondary)", width: 40, textAlign: "center", transition: "color 0.2s" }}>{scoreA}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "#1a1a1a", lineHeight: 1 }}>:</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 900, lineHeight: 1, color: winnerSide === "b" ? "var(--color-brand)" : "var(--color-text-secondary)", width: 40, textAlign: "center", transition: "color 0.2s" }}>{scoreB}</span>
        </div>
        {/* Time B */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 16px" }}>
          <button type="button" onClick={() => setOpenGoalTeam(match.team_b_id)}
            style={{ marginRight: 2, width: 28, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", fontSize: 18, color: "#444", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.1)"; e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; e.currentTarget.style.color = "#BFF205"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#444"; }}>+</button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: winnerSide === "b" ? "var(--color-text-primary)" : "var(--color-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {teamB?.short_name ?? teamB?.full_name ?? "—"}
          </span>
          {teamB?.logo_url ? <img src={teamB.logo_url} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} /> : <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.05)" }} />}
        </div>
      </div>

      {/* ══ BLOCO 3 — FALTAS ══ */}
      <div style={{ borderRadius: 12, border, backgroundColor: "var(--color-surface)", overflow: "hidden", marginBottom: 10 }}>
        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: border }}>
          {(["first", "second"] as const).map(p => (
            <button key={p} type="button" onClick={() => setActivePeriod(p)}
              style={{
                padding: "9px 0", border: "none",
                backgroundColor: activePeriod === p ? "rgba(191,242,5,0.05)" : "transparent",
                color: activePeriod === p ? "var(--color-brand)" : "rgba(255,255,255,0.25)",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: "pointer", borderRight: p === "first" ? border : "none",
                transition: "all 0.12s",
              }}>
              {p === "first" ? "1º Tempo" : "2º Tempo"}
            </button>
          ))}
        </div>
        {/* Contadores */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr" }}>
          {([
            { teamId: match.team_a_id, fouls: foulsA, align: "left" as const },
            { teamId: match.team_b_id, fouls: foulsB, align: "right" as const },
          ]).map(({ teamId, fouls, align }) => {
            const isDanger = fouls >= 5;
            return (
              <div key={teamId} style={{
                display: "flex", alignItems: "center",
                padding: "14px 18px", gap: 12,
                flexDirection: align === "right" ? "row-reverse" : "row",
                borderLeft: align === "right" ? border : "none",
              }}>
                <button type="button" onClick={() => handleChangeFouls(teamId, -1)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)", fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                >−</button>
                <div style={{ textAlign: "center", minWidth: 44 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 900, lineHeight: 1, color: isDanger ? "#FF4444" : "var(--color-text-primary)", transition: "color 0.2s", display: "block" }}>{fouls}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: isDanger ? "rgba(255,68,68,0.6)" : "rgba(255,255,255,0.2)", marginTop: 2, display: "block" }}>
                    {isDanger ? "5ª FALTA" : "Faltas"}
                  </span>
                </div>
                <button type="button" onClick={() => handleChangeFouls(teamId, 1)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)", fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                >+</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ BLOCO 4 — BOTÕES DE AÇÃO ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 6, marginBottom: 20 }}>
        {[
          { type: "yellow_card",     label: "Amarelo" },
          { type: "red_card",        label: "Vermelho" },
          { type: "red_yellow_card", label: "Amar-Verm." },
          { type: "penalty_missed",  label: "Pênalti" },
          { type: "shootout_missed", label: "Shoot-out" },
          { type: "fifth_foul",      label: "5ª Falta" },
        ].map(({ type, label }) => (
          <button key={type} type="button"
            onClick={() => { setOpenActionType(type); setShowActionModal(true); setEditingAction(null); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "16px 8px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.07)",
              backgroundColor: "var(--color-surface)", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--color-surface)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <ActionIcon actionType={type} size={28} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              textAlign: "center", lineHeight: 1.4,
            }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ══ BLOCO 5 — ABAS TIMELINE / SHOOTOUT ══ */}
      {hasShootout && (
        <div style={{ display: "flex", borderBottom: border, marginBottom: 16 }}>
          {[
            { key: "timeline", label: "Período FT" },
            { key: "shootout", label: tiebreaker === "penalties" ? "Pênaltis" : "Shoot-outs" },
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveShootoutTab(tab.key as any)}
              style={{
                padding: "10px 20px", border: "none",
                borderBottom: `2px solid ${activeShootoutTab === tab.key ? "var(--color-brand)" : "transparent"}`,
                backgroundColor: "transparent",
                color: activeShootoutTab === tab.key ? "var(--color-brand)" : "rgba(255,255,255,0.25)",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: "pointer", transition: "color 0.12s", marginBottom: -1,
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ══ BLOCO 6 — TIMELINE ══ */}
      {(!hasShootout || activeShootoutTab === "timeline") && (
        <div>
          {actions.length === 0 ? (
            <div style={{ padding: "64px 0", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.12)" }}>Sem ações registradas</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 8 }}>Use os botões acima para registrar eventos da partida.</p>
            </div>
          ) : (
            <>
              {secondHalf.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  {/* Separador 2º tempo */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 48px 1fr" : "1fr 64px 1fr", marginBottom: 8, alignItems: "center" }}>
                    <div style={{ height: 1, backgroundColor: "rgba(191,242,5,0.25)" }} />
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#BFF205" }}>2º T</span>
                    </div>
                    <div style={{ height: 1, backgroundColor: "rgba(191,242,5,0.25)" }} />
                  </div>
                  {secondHalf.map((a: any) => <TimelineRow key={a.id} action={a} scoreLabel={actionsWithScore[a.id]} />)}
                </div>
              )}
              {firstHalf.length > 0 && (
                <div style={{ marginTop: secondHalf.length > 0 ? 16 : 0 }}>
                  {/* Separador 1º tempo */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 1fr", marginBottom: 8, alignItems: "center" }}>
                    <div style={{ height: 1, backgroundColor: "rgba(191,242,5,0.25)" }} />
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#BFF205" }}>1º T</span>
                    </div>
                    <div style={{ height: 1, backgroundColor: "rgba(191,242,5,0.25)" }} />
                  </div>
                  {firstHalf.map((a: any) => <TimelineRow key={a.id} action={a} scoreLabel={actionsWithScore[a.id]} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Shootout tab */}
      {hasShootout && activeShootoutTab === "shootout" && <ShootoutSection />}

      {/* ══ MODAL PÓS-PUBLICAÇÃO ══ */}
      {showPublishModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.78)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPublishModal(false); }}>
          <div style={{ width: "100%", maxWidth: 380, borderRadius: 16, border: "1px solid rgba(191,242,5,0.25)", backgroundColor: "#111", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "rgba(191,242,5,0.1)", border: "1px solid rgba(191,242,5,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 11l5 5 9-9" stroke="#BFF205" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "0.04em", marginBottom: 10 }}>
                Resultado publicado!
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 4 }}>
                As estatísticas foram atualizadas.
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-brand)", lineHeight: 1.6 }}>
                Lembre-se de atualizar o status da partida para "Finalizada".
              </p>
            </div>
            <div style={{ padding: "0 24px 24px" }}>
              <button type="button" onClick={() => { setShowPublishModal(false); setShowEndModal(true); }}
                style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", backgroundColor: "var(--color-brand)", color: "var(--color-background)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginBottom: 8 }}>
                Atualizar status agora
              </button>
              <button type="button" onClick={() => setShowPublishModal(false)}
                style={{ width: "100%", padding: "11px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ RODAPÉ FIXO ══ */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: isMobile ? "12px 16px" : "12px 32px",
        backgroundColor: "rgba(10,10,10,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 12, zIndex: 20,
      }}>
        {published && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(191,242,5,0.45)", textTransform: "uppercase" }}>✓ Publicado</span>
        )}
        <button type="button"
          onClick={async () => {
            if (published) return;
            await handlePublish();
            setShowPublishModal(true);
          }}
          disabled={publishing}
          style={{
            padding: "11px 32px", borderRadius: 9,
            border: published ? "1px solid rgba(191,242,5,0.25)" : "none",
            backgroundColor: published ? "rgba(191,242,5,0.05)" : "var(--color-brand)",
            color: published ? "var(--color-brand)" : "var(--color-background)",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: publishing || published ? "default" : "pointer",
            opacity: publishing ? 0.5 : 1, transition: "all 0.15s",
          }}>
          {publishing ? "Publicando…" : published ? "✓ Publicado" : "Publicar resultado"}
        </button>
      </div>
    </div>
  );
}