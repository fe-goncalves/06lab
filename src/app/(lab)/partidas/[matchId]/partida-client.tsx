"use client";

import { adicionarAcao, deletarAcao, editarPartida, salvarFormacoes } from "./actions";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import Link from "next/link";
import { useState } from "react";

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
  is_starter: boolean;
  is_captain: boolean;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

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

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  ongoing: "Em andamento",
  finished: "Finalizada",
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
}: {
  match: any;
  actions: any[];
  lineups: any[];
  editionTeamsWithAthletes: any[];
  venues: any[];
  competitionId: string;
  edicaoId: string;
  faseId: string;
}) {
  const [activeTab, setActiveTab] = useState<"informacao" | "formacoes" | "posjogo" | "midia">("posjogo");
  const [actions, setActions] = useState<any[]>(initialActions);
  const [scoreA, setScoreA] = useState<number>(match.score_a ?? 0);
  const [scoreB, setScoreB] = useState<number>(match.score_b ?? 0);
  const [status, setStatus] = useState<string>(match.status ?? "scheduled");
  const [finishType, setFinishType] = useState<string>(match.finish_type ?? "");
  const [saving, setSaving] = useState(false);
  const [matchDate, setMatchDate] = useState<string>(match.match_date ?? "");
  const [matchTime, setMatchTime] = useState<string>(match.match_time?.slice(0, 5) ?? "");
  const [venueId, setVenueId] = useState<string>(match.venue_id ?? "");
  const [motmAthleteId, setMotmAthleteId] = useState<string>(match.motm_athlete_id ?? "");

  // Ação
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState("goal");
  const [actionTeamId, setActionTeamId] = useState<string>(match.team_a_id ?? "");
  const [actionPeriod, setActionPeriod] = useState("first");
  const [actionMinute, setActionMinute] = useState("");
  const [actionAthleteId, setActionAthleteId] = useState("");
  const [actionAssistId, setActionAssistId] = useState("");
  const [goalType, setGoalType] = useState("normal");
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [missResult, setMissResult] = useState("goalkeeper_save");
  const [addingAction, setAddingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Formações
  const [lineups, setLineups] = useState<Record<string, LineupEntry>>(() => {
    const map: Record<string, LineupEntry> = {};
    initialLineups.forEach((l: any) => {
      map[l.athlete_id] = {
        athlete_id: l.athlete_id,
        is_present: l.is_present ?? false,
        is_starter: l.is_starter ?? false,
        is_captain: l.is_captain ?? false,
      };
    });
    return map;
  });

  // Capitões por equipe
  const [captainA, setCaptainA] = useState<string>(() => {
    return initialLineups.find((l: any) => l.is_captain && true)?.athlete_id ?? "";
  });
  const [captainB, setCaptainB] = useState<string>("");
  const [savingLineups, setSavingLineups] = useState(false);

  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };
  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";

  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const halfDuration: number = match.phases?.half_duration_minutes ?? 25;
  const roundName: string = match.rounds?.custom_label ?? match.rounds?.name ?? "Rodada";
  const competitionName: string = match.phases?.competition_editions?.competitions?.full_name ?? "Competição";

  function getEditionTeam(teamId: string) {
    return editionTeamsWithAthletes.find((e: any) => e.team_id === teamId);
  }

  function getAthletes(teamId: string): Athlete[] {
    const et = getEditionTeam(teamId);
    if (!et) return [];
    return (et.edition_roster_entries ?? [])
      .filter((e: any) => e.member_type === "athlete" && e.status === "approved" && e.athletes)
      .map((e: any) => e.athletes);
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
    const r = await editarPartida(match.id, fd);
    setSaving(false);
    if ("error" in r) { toast("error", r.error); return; }
    toast("success", "Informações salvas.");
  }

  async function handleSaveLineups() {
    setSavingLineups(true);
    const entries = Object.values(lineups).map(l => ({
      ...l,
      is_captain: l.athlete_id === captainA || l.athlete_id === captainB,
    }));
    const r = await salvarFormacoes(match.id, entries);
    setSavingLineups(false);
    if ("error" in r) { toast("error", r.error); return; }
    toast("success", "Formações salvas.");
  }

  const athletes = getAthletes(actionTeamId);
  const needsMinute = !["foul", "fifth_foul"].includes(actionType);
  const needsAthlete = actionType !== "fifth_foul";
  const isGoal = actionType === "goal";
  const needsMiss = ["penalty_missed", "shootout_missed"].includes(actionType);

  async function handleAddAction() {
    setActionError(null);
    setAddingAction(true);
    const fd = new FormData();
    fd.append("team_id", actionTeamId);
    fd.append("action_type", actionType);
    fd.append("period", actionPeriod);
    if (needsMinute && actionMinute) fd.append("minute", actionMinute);
    if (needsAthlete && actionAthleteId) fd.append("primary_athlete_id", actionAthleteId);
    if (isGoal && !isOwnGoal && actionAssistId) fd.append("secondary_athlete_id", actionAssistId);
    if (isGoal) { fd.append("goal_type", isOwnGoal ? "own_goal" : goalType); fd.append("is_own_goal", String(isOwnGoal)); }
    if (needsMiss) fd.append("miss_result", missResult);
    const r = await adicionarAcao(match.id, fd);
    setAddingAction(false);
    if ("error" in r) { setActionError(r.error); return; }
    if (actionType === "goal") {
      const isA = actionTeamId === match.team_a_id;
      if (!isOwnGoal) { if (isA) setScoreA(p => p + 1); else setScoreB(p => p + 1); }
      else { if (isA) setScoreB(p => p + 1); else setScoreA(p => p + 1); }
    }
    const athlete = athletes.find((a: any) => a.id === actionAthleteId);
    setActions(prev => [...prev, {
      id: r.id, action_type: actionType, team_id: actionTeamId,
      period: actionPeriod, minute: actionMinute ? Number(actionMinute) : null,
      is_own_goal: isOwnGoal, goal_type: isOwnGoal ? "own_goal" : goalType,
      primary_athlete: athlete ?? null,
    }]);
    setShowActionModal(false);
    setActionMinute(""); setActionAthleteId(""); setActionAssistId("");
    setIsOwnGoal(false); setGoalType("normal");
  }

  async function handleDelete(actionId: string, aType: string, own: boolean, teamId: string) {
    if (!confirm("Remover esta ação?")) return;
    const r = await deletarAcao(actionId, match.id);
    if ("error" in r) { toast("error", r.error); return; }
    if (aType === "goal") {
      const isA = teamId === match.team_a_id;
      if (!own) { if (isA) setScoreA(p => Math.max(0, p - 1)); else setScoreB(p => Math.max(0, p - 1)); }
      else { if (isA) setScoreB(p => Math.max(0, p - 1)); else setScoreA(p => Math.max(0, p - 1)); }
    }
    setActions(prev => prev.filter((a: any) => a.id !== actionId));
  }

  const firstHalf = [...actions].filter(a => a.period === "first").sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  const secondHalf = [...actions].filter(a => a.period === "second").sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competitionName, href: `/competicoes/${competitionId}` },
            { label: roundName },
          ]} />

          {/* Placar */}
          <div className="mb-4 flex items-center justify-between gap-4">
            {/* Time A */}
            <div className="flex items-center gap-3 min-w-0">
              {teamA?.logo_url ? (
                <img src={teamA.logo_url} alt="" className="h-10 w-10 shrink-0 object-contain" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded border" style={{ borderColor: "var(--color-border)" }} />
              )}
              <span className="font-display text-lg font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {teamA?.full_name ?? "A definir"}
              </span>
            </div>

            {/* Placar central */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-display text-4xl font-bold" style={{ color: "var(--color-brand)" }}>{scoreA}</span>
              <span className="font-display text-2xl" style={{ color: "var(--color-text-secondary)" }}>—</span>
              <span className="font-display text-4xl font-bold" style={{ color: "var(--color-brand)" }}>{scoreB}</span>
            </div>

            {/* Time B */}
            <div className="flex items-center gap-3 min-w-0 justify-end">
              <span className="font-display text-lg font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {teamB?.full_name ?? "A definir"}
              </span>
              {teamB?.logo_url ? (
                <img src={teamB.logo_url} alt="" className="h-10 w-10 shrink-0 object-contain" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded border" style={{ borderColor: "var(--color-border)" }} />
              )}
            </div>
          </div>

          {/* Info da partida */}
          <div className="mb-3 flex items-center justify-center gap-3 flex-wrap">
            <span className="font-mono text-xs rounded px-2 py-0.5"
              style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
              {STATUS_LABELS[status] ?? status}
            </span>
            {match.match_date && (
              <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {new Date(match.match_date + "T00:00:00").toLocaleDateString("pt-BR")}
                {match.match_time ? ` · ${match.match_time.slice(0, 5)}` : ""}
              </span>
            )}
            {match.venues?.full_name && (
              <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                · {match.venues.full_name}
              </span>
            )}
          </div>

          {/* Abas */}
          <div className="flex gap-6">
          {[
              { key: "informacao", label: "INFORMAÇÃO" },
              { key: "formacoes", label: "FORMAÇÕES" },
              { key: "posjogo", label: "PÓS-JOGO" },
              { key: "midia", label: "MÍDIA" },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors"
                style={{
                  borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent",
                  color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6">

        {/* ABA INFORMAÇÃO */}
        {activeTab === "informacao" && (
          <div className="max-w-lg space-y-4">
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Dados da partida
              </h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data</span>
                    <input type="date" defaultValue={match.match_date ?? ""}
                      onChange={e => setMatchDate(e.target.value)}
                      className={inputClass} style={inputStyle} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Horário</span>
                    <input type="time" defaultValue={match.match_time?.slice(0, 5) ?? ""}
                      onChange={e => setMatchTime(e.target.value)}
                      className={inputClass} style={inputStyle} />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Local</span>
                  <select defaultValue={match.venue_id ?? ""}
                    onChange={e => setVenueId(e.target.value)}
                    className={inputClass} style={inputStyle}>
                    <option value="">Nenhum</option>
                    {(match.venues_list ?? []).map((v: any) => (
                      <option key={v.id} value={v.id}>{v.full_name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Status</span>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass} style={inputStyle}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Encerramento</span>
                  <select value={finishType} onChange={e => setFinishType(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">—</option>
                    <option value="normal">Normal</option>
                    <option value="walkover">W.O.</option>
                    <option value="penalties">Pênaltis</option>
                    <option value="shootouts">Shoot-outs</option>
                  </select>
                </label>
              </div>
            </div>

            {/* MOTM */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Man of the Match
              </h2>
              <select value={motmAthleteId} onChange={e => setMotmAthleteId(e.target.value)}
                className={inputClass} style={inputStyle}>
                <option value="">Nenhum</option>
                {[...getAthletes(match.team_a_id), ...getAthletes(match.team_b_id)]
                  .sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name))
                  .map(a => (
                    <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>
                  ))}
              </select>
            </div>

            <button type="button" onClick={handleSaveInfo} disabled={saving}
              className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        )}

        {/* ABA FORMAÇÕES */}
        {activeTab === "formacoes" && (
          <div>
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                { teamId: match.team_a_id, team: teamA, captain: captainA, setCaptain: setCaptainA },
                { teamId: match.team_b_id, team: teamB, captain: captainB, setCaptain: setCaptainB },
              ].map(({ teamId, team, captain, setCaptain }) => {
                const posGroups = getAthletesByPosition(teamId);
                const allAthletes = getAthletes(teamId);
                return (
                  <div key={teamId} className="rounded-xl border overflow-hidden"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                    {/* Header equipe */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                      {team?.logo_url && <img src={team.logo_url} alt="" className="h-7 w-7 object-contain" />}
                      <h2 className="font-mono text-xs uppercase tracking-widest flex-1" style={{ color: "var(--color-text-secondary)" }}>
                        {team?.full_name ?? "Equipe"}
                      </h2>
                    </div>

                    {/* Capitão */}
                    <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Capitão</span>
                        <select value={captain} onChange={e => setCaptain(e.target.value)}
                          className="rounded-lg border px-3 py-2 text-sm outline-none"
                          style={inputStyle}>
                          <option value="">Nenhum</option>
                          {allAthletes.sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name)).map(a => (
                            <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Header colunas */}
                    <div className="flex items-center px-5 py-2 gap-2 border-b" style={{ borderColor: "var(--color-border)" }}>
                      <span className="flex-1 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Atleta</span>
                      <span className="w-16 text-center font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Presente</span>
                      <span className="w-16 text-center font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Titular</span>
                    </div>

                    {/* Atletas por posição */}
                    <div className="px-2 py-1">
                      {posGroups.length === 0 ? (
                        <p className="px-3 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          Nenhum atleta inscrito.
                        </p>
                      ) : (
                        posGroups.map(group => (
                          <div key={group.label}>
                            <p className="px-3 py-1.5 font-mono text-xs uppercase" style={{ color: "var(--color-brand)" }}>
                              {group.label}
                            </p>
                            {group.athletes
                              .sort((a, b) => (a.surname ?? a.full_name).localeCompare(b.surname ?? b.full_name))
                              .map(athlete => {
                                const entry = lineups[athlete.id] ?? { is_present: false, is_starter: false, is_captain: false };
                                return (
                                  <div key={athlete.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.03)]">
                                    <div className="flex flex-1 items-center gap-2 min-w-0">
                                      {athlete.photo_url ? (
                                        <img src={athlete.photo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                                      ) : (
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                          style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                                          {(athlete.surname ?? athlete.full_name).slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="truncate text-sm" style={{ color: "var(--color-text-primary)" }}>
                                        {athlete.surname ?? athlete.full_name}
                                      </span>
                                      {captain === athlete.id && (
                                        <span className="shrink-0 font-mono text-xs rounded px-1"
                                          style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
                                          C
                                        </span>
                                      )}
                                    </div>
                                    <div className="w-16 flex justify-center">
                                      <input type="checkbox" checked={entry.is_present}
                                        onChange={() => toggleLineup(athlete.id, "is_present")}
                                        className="h-4 w-4 cursor-pointer" />
                                    </div>
                                    <div className="w-16 flex justify-center">
                                      <input type="checkbox" checked={entry.is_starter}
                                        onChange={() => toggleLineup(athlete.id, "is_starter")}
                                        className="h-4 w-4 cursor-pointer" />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6">
              <button type="button" onClick={handleSaveLineups} disabled={savingLineups}
                className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {savingLineups ? "Salvando…" : "Salvar formações"}
              </button>
            </div>
          </div>
        )}

        {/* ABA PÓS-JOGO */}
        {activeTab === "posjogo" && (
          <div>
            {/* Botões de ação rápida */}
            <div className="mb-6 grid grid-cols-4 gap-3 sm:grid-cols-8">
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <button key={key} type="button"
                  onClick={() => { setActionType(key); setShowActionModal(true); setActionError(null); }}
                  className="flex flex-col items-center gap-2 rounded-xl border p-3 transition-all hover:scale-105"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: "var(--color-surface)",
                  }}>
                  <span className="text-2xl">{ACTION_EMOJI[key]}</span>
                  <span className="font-mono text-xs text-center leading-tight"
                    style={{ color: ACTION_COLORS[key] ?? "var(--color-text-secondary)" }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Linha do tempo */}
            {actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem ações</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Use os botões acima para registrar ações da partida.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {firstHalf.length > 0 && (
                  <>
                    <p className="font-mono text-xs uppercase tracking-widest pb-1" style={{ color: "var(--color-text-secondary)" }}>
                      1º Tempo
                    </p>
                    {firstHalf.map(a => (
                      <ActionTimeline key={a.id} action={a} teamA={teamA} teamB={teamB}
                        matchTeamAId={match.team_a_id}
                        onDelete={() => handleDelete(a.id, a.action_type, a.is_own_goal, a.team_id)} />
                    ))}
                  </>
                )}
                {secondHalf.length > 0 && (
                  <>
                    <p className="font-mono text-xs uppercase tracking-widest pb-1 pt-4" style={{ color: "var(--color-text-secondary)" }}>
                      2º Tempo
                    </p>
                    {secondHalf.map(a => (
                      <ActionTimeline key={a.id} action={a} teamA={teamA} teamB={teamB}
                        matchTeamAId={match.team_a_id}
                        onDelete={() => handleDelete(a.id, a.action_type, a.is_own_goal, a.team_id)} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      {/* ABA MÍDIA */}
      {activeTab === "midia" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Mídia</p>
            <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
              Em construção — links de vídeos e fotos serão adicionados aqui.
            </p>
          </div>
        )}
      </div>

      {/* Modal de ação */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-xl border shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ACTION_EMOJI[actionType]}</span>
                <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>
                  {ACTION_LABELS[actionType]}
                </h2>
              </div>
              <button type="button" onClick={() => setShowActionModal(false)}
                style={{ color: "var(--color-text-secondary)" }}>✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Seletor de tipo */}
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo de ação</span>
                <select value={actionType} onChange={e => { setActionType(e.target.value); setIsOwnGoal(false); }} className={inputClass} style={inputStyle}>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe</span>
                <select value={actionTeamId} onChange={e => { setActionTeamId(e.target.value); setActionAthleteId(""); setActionAssistId(""); }} className={inputClass} style={inputStyle}>
                  {teamA && <option value={teamA.id}>{teamA.full_name}</option>}
                  {teamB && <option value={teamB.id}>{teamB.full_name}</option>}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Período</span>
                <select value={actionPeriod} onChange={e => setActionPeriod(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="first">1º Tempo</option>
                  <option value="second">2º Tempo</option>
                </select>
              </label>

              {needsMinute && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Minuto</span>
                  <input type="number" min={1} max={halfDuration * 2} value={actionMinute}
                    onChange={e => setActionMinute(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
              )}

              {needsAthlete && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Atleta</span>
                  <select value={actionAthleteId} onChange={e => setActionAthleteId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Selecione…</option>
                    {athletes.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>
                    ))}
                  </select>
                </label>
              )}

              {isGoal && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo de gol</span>
                  <select value={isOwnGoal ? "own_goal" : goalType}
                    onChange={e => { if (e.target.value === "own_goal") { setIsOwnGoal(true); setGoalType("normal"); } else { setIsOwnGoal(false); setGoalType(e.target.value); } }}
                    className={inputClass} style={inputStyle}>
                    <option value="normal">Normal</option>
                    <option value="penalty">Pênalti</option>
                    <option value="own_goal">Gol Contra</option>
                  </select>
                </label>
              )}

              {isGoal && !isOwnGoal && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Assistência</span>
                  <select value={actionAssistId} onChange={e => setActionAssistId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Sem assistência</option>
                    {athletes.filter((a: any) => a.id !== actionAthleteId).map((a: any) => (
                      <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>
                    ))}
                  </select>
                </label>
              )}

              {needsMiss && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Resultado</span>
                  <select value={missResult} onChange={e => setMissResult(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="goalkeeper_save">Defesa do goleiro</option>
                    <option value="off_target">Para fora</option>
                    <option value="post">Na trave</option>
                    <option value="foul">Irregularidade</option>
                  </select>
                </label>
              )}

              {actionError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{actionError}</p>}
            </div>

            <div className="flex gap-3 border-t px-6 py-4 justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setShowActionModal(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleAddAction} disabled={addingAction}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {addingAction ? "Adicionando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Linha do tempo ───────────────────────────────────────────────────────────

function ActionTimeline({ action, teamA, teamB, matchTeamAId, onDelete }: {
  action: any; teamA: any; teamB: any; matchTeamAId: string; onDelete: () => void;
}) {
  const isTeamA = action.team_id === matchTeamAId;
  const team = isTeamA ? teamA : teamB;
  const name = action.primary_athlete?.surname ?? action.primary_athlete?.full_name ?? "";
  const color = ACTION_COLORS[action.action_type] ?? "#A6A6A6";

  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
      <span className="w-8 font-mono text-xs text-right shrink-0" style={{ color: "var(--color-text-secondary)" }}>
        {action.minute ? `${action.minute}'` : "—"}
      </span>
      <span className="text-lg shrink-0">{ACTION_EMOJI[action.action_type] ?? "·"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
          {name || ACTION_LABELS[action.action_type]}
          {action.is_own_goal ? " (contra)" : ""}
        </p>
        <p className="font-mono text-xs" style={{ color }}>
          {team?.abbreviation ?? team?.full_name ?? "—"}
          {name ? ` · ${ACTION_LABELS[action.action_type]}` : ""}
        </p>
      </div>
      <button type="button" onClick={onDelete}
        className="shrink-0 rounded border px-2 py-0.5 text-xs transition-colors hover:border-[var(--color-danger)]"
        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
        ×
      </button>
    </div>
  );
}