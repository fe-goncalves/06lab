"use client";

import { adicionarAcao, deletarAcao, editarPartida } from "./actions";
import Link from "next/link";
import { useState } from "react";

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

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  ongoing: "Em andamento",
  finished: "Finalizada",
  postponed: "Adiada",
};

const ACTION_ICONS: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  red_yellow_card: "🟧",
  penalty_missed: "✗",
  shootout_missed: "✗",
  foul: "⚠",
  fifth_foul: "5ª",
};

function ActionRow({
  action,
  teamA,
  teamB,
  matchTeamAId,
  onDelete,
}: {
  action: any;
  teamA: any;
  teamB: any;
  matchTeamAId: string;
  onDelete: () => void;
}) {
  const isTeamA = action.team_id === matchTeamAId;
  const abbr = isTeamA
    ? (teamA?.abbreviation ?? teamA?.full_name ?? "A")
    : (teamB?.abbreviation ?? teamB?.full_name ?? "B");
  const name =
    action.primary_athlete?.surname ??
    action.primary_athlete?.full_name ??
    "";

  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2 gap-3"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="font-mono text-xs w-8 text-right shrink-0"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {action.minute ? `${action.minute}'` : "—"}
        </span>
        <span className="text-base shrink-0">
          {ACTION_ICONS[action.action_type] ?? "·"}
        </span>
        <span
          className="text-xs font-medium shrink-0"
          style={{ color: "var(--color-brand)" }}
        >
          {abbr}
        </span>
        <span
          className="text-sm truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {ACTION_LABELS[action.action_type] ?? action.action_type}
          {name ? ` — ${name}` : ""}
          {action.is_own_goal ? " (contra)" : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded border px-2 py-0.5 text-xs"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-danger)",
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function PartidaClient({
  match,
  actions: initialActions,
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
  const [actions, setActions] = useState<any[]>(initialActions);
  const [scoreA, setScoreA] = useState<number>(match.score_a ?? 0);
  const [scoreB, setScoreB] = useState<number>(match.score_b ?? 0);
  const [status, setStatus] = useState<string>(match.status ?? "scheduled");
  const [finishType, setFinishType] = useState<string>(match.finish_type ?? "");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState("goal");
  const [actionTeamId, setActionTeamId] = useState<string>(
    match.team_a_id ?? ""
  );
  const [actionPeriod, setActionPeriod] = useState("first");
  const [actionMinute, setActionMinute] = useState("");
  const [actionAthleteId, setActionAthleteId] = useState("");
  const [actionAssistId, setActionAssistId] = useState("");
  const [goalType, setGoalType] = useState("normal");
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [missResult, setMissResult] = useState("goalkeeper_save");
  const [addingAction, setAddingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const inputStyle = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-background)",
    color: "var(--color-text-primary)",
  };
  const inputClass =
    "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";

  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const halfDuration: number = match.phases?.half_duration_minutes ?? 25;
  const roundName: string =
    match.rounds?.custom_label ?? match.rounds?.name ?? "Rodada";
  const competitionName: string =
    match.phases?.competition_editions?.competitions?.full_name ??
    "Competição";

  function getAthletes(teamId: string) {
    const et = editionTeamsWithAthletes.find(
      (e: any) => e.team_id === teamId
    );
    if (!et) return [];
    return (et.edition_roster_entries ?? [])
      .filter(
        (e: any) =>
          e.member_type === "athlete" &&
          e.status === "approved" &&
          e.athletes
      )
      .map((e: any) => e.athletes);
  }

  const athletes = getAthletes(actionTeamId);
  const needsMinute = !["foul", "fifth_foul"].includes(actionType);
  const needsAthlete = actionType !== "fifth_foul";
  const isGoal = actionType === "goal";
  const needsMiss = ["penalty_missed", "shootout_missed"].includes(actionType);

  async function handleSave() {
    setSaving(true);
    setSaveFeedback(null);
    const fd = new FormData();
    fd.append("status", status);
    fd.append("finish_type", finishType);
    fd.append("score_a", String(scoreA));
    fd.append("score_b", String(scoreB));
    const r = await editarPartida(match.id, fd);
    setSaving(false);
    if ("error" in r) {
      setSaveFeedback(r.error);
      return;
    }
    setSaveFeedback("Salvo.");
    setTimeout(() => setSaveFeedback(null), 2000);
  }

  async function handleAddAction() {
    setActionError(null);
    setAddingAction(true);
    const fd = new FormData();
    fd.append("team_id", actionTeamId);
    fd.append("action_type", actionType);
    fd.append("period", actionPeriod);
    if (needsMinute && actionMinute) fd.append("minute", actionMinute);
    if (needsAthlete && actionAthleteId)
      fd.append("primary_athlete_id", actionAthleteId);
    if (isGoal && !isOwnGoal && actionAssistId)
      fd.append("secondary_athlete_id", actionAssistId);
    if (isGoal) {
      fd.append("goal_type", isOwnGoal ? "own_goal" : goalType);
      fd.append("is_own_goal", String(isOwnGoal));
    }
    if (needsMiss) fd.append("miss_result", missResult);
    const r = await adicionarAcao(match.id, fd);
    setAddingAction(false);
    if ("error" in r) {
      setActionError(r.error);
      return;
    }
    if (actionType === "goal") {
      const isA = actionTeamId === match.team_a_id;
      if (!isOwnGoal) {
        if (isA) setScoreA((p) => p + 1);
        else setScoreB((p) => p + 1);
      } else {
        if (isA) setScoreB((p) => p + 1);
        else setScoreA((p) => p + 1);
      }
    }
    const athlete = athletes.find((a: any) => a.id === actionAthleteId);
    setActions((prev) => [
      ...prev,
      {
        id: r.id,
        action_type: actionType,
        team_id: actionTeamId,
        period: actionPeriod,
        minute: actionMinute ? Number(actionMinute) : null,
        is_own_goal: isOwnGoal,
        goal_type: isOwnGoal ? "own_goal" : goalType,
        primary_athlete: athlete ?? null,
      },
    ]);
    setShowActionForm(false);
    setActionMinute("");
    setActionAthleteId("");
    setActionAssistId("");
    setIsOwnGoal(false);
    setGoalType("normal");
  }

  async function handleDelete(
    actionId: string,
    aType: string,
    own: boolean,
    teamId: string
  ) {
    if (!confirm("Remover esta ação?")) return;
    const r = await deletarAcao(actionId, match.id);
    if ("error" in r) {
      alert(r.error);
      return;
    }
    if (aType === "goal") {
      const isA = teamId === match.team_a_id;
      if (!own) {
        if (isA) setScoreA((p) => Math.max(0, p - 1));
        else setScoreB((p) => Math.max(0, p - 1));
      } else {
        if (isA) setScoreB((p) => Math.max(0, p - 1));
        else setScoreA((p) => Math.max(0, p - 1));
      }
    }
    setActions((prev) => prev.filter((a: any) => a.id !== actionId));
  }

  const firstHalf = [...actions]
    .filter((a) => a.period === "first")
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const secondHalf = [...actions]
    .filter((a) => a.period === "second")
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  return (
    <div className="p-6 md:p-8">
      <div
        className="mb-6 flex items-center gap-2 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <Link
          href={`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${faseId}`}
          style={{ color: "var(--color-text-secondary)" }}
        >
          ← {competitionName}
        </Link>
        <span>·</span>
        <span>{roundName}</span>
      </div>

      <div
        className="mb-6 rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="flex flex-col items-center gap-2 min-w-[100px]">
            {teamA?.logo_url && (
              <img
                src={teamA.logo_url}
                alt=""
                className="h-12 w-12 object-contain"
              />
            )}
            <p
              className="text-sm font-medium text-center"
              style={{ color: "var(--color-text-primary)" }}
            >
              {teamA?.full_name ?? "A definir"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={scoreA}
              onChange={(e) => setScoreA(Number(e.target.value))}
              className="w-16 rounded-lg border px-2 py-2 text-center text-3xl font-display font-bold outline-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-background)",
                color: "var(--color-brand)",
              }}
            />
            <span
              className="text-2xl font-display"
              style={{ color: "var(--color-text-secondary)" }}
            >
              ×
            </span>
            <input
              type="number"
              min={0}
              value={scoreB}
              onChange={(e) => setScoreB(Number(e.target.value))}
              className="w-16 rounded-lg border px-2 py-2 text-center text-3xl font-display font-bold outline-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-background)",
                color: "var(--color-brand)",
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[100px]">
            {teamB?.logo_url && (
              <img
                src={teamB.logo_url}
                alt=""
                className="h-12 w-12 object-contain"
              />
            )}
            <p
              className="text-sm font-medium text-center"
              style={{ color: "var(--color-text-primary)" }}
            >
              {teamB?.full_name ?? "A definir"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={finishType}
            onChange={(e) => setFinishType(e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">Encerramento…</option>
            <option value="normal">Normal</option>
            <option value="walkover">W.O.</option>
            <option value="penalties">Pênaltis</option>
            <option value="shootouts">Shoot-outs</option>
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-brand)",
              color: "var(--color-background)",
            }}
          >
            {saving ? "Salvando…" : "Salvar partida"}
          </button>
          {saveFeedback && (
            <span className="text-xs" style={{ color: "var(--color-success)" }}>
              {saveFeedback}
            </span>
          )}
        </div>
        {match.match_date && (
          <p
            className="mt-4 text-center text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {new Date(match.match_date + "T00:00:00").toLocaleDateString(
              "pt-BR"
            )}
            {match.match_time ? ` às ${match.match_time.slice(0, 5)}` : ""}
          </p>
        )}
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Ações do jogo ({actions.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowActionForm((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {showActionForm ? "Cancelar" : "Adicionar ação"}
          </button>
        </div>

        {showActionForm && (
          <div
            className="mb-4 rounded-lg border p-4 space-y-3"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-background)",
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Tipo
                </span>
                <select
                  value={actionType}
                  onChange={(e) => {
                    setActionType(e.target.value);
                    setIsOwnGoal(false);
                  }}
                  className={inputClass}
                  style={inputStyle}
                >
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Equipe
                </span>
                <select
                  value={actionTeamId}
                  onChange={(e) => {
                    setActionTeamId(e.target.value);
                    setActionAthleteId("");
                    setActionAssistId("");
                  }}
                  className={inputClass}
                  style={inputStyle}
                >
                  {teamA && (
                    <option value={teamA.id}>{teamA.full_name}</option>
                  )}
                  {teamB && (
                    <option value={teamB.id}>{teamB.full_name}</option>
                  )}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Período
                </span>
                <select
                  value={actionPeriod}
                  onChange={(e) => setActionPeriod(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="first">1º Tempo (1-{halfDuration})</option>
                  <option value="second">
                    2º Tempo ({halfDuration + 1}-{halfDuration * 2})
                  </option>
                </select>
              </label>
              {needsMinute && (
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Minuto
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={halfDuration * 2}
                    value={actionMinute}
                    onChange={(e) => setActionMinute(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </label>
              )}
              {needsAthlete && (
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Atleta
                  </span>
                  <select
                    value={actionAthleteId}
                    onChange={(e) => setActionAthleteId(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">Selecione…</option>
                    {athletes.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                        {a.surname ? ` (${a.surname})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {isGoal && (
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Tipo de gol
                  </span>
                  <select
                    value={isOwnGoal ? "own_goal" : goalType}
                    onChange={(e) => {
                      if (e.target.value === "own_goal") {
                        setIsOwnGoal(true);
                        setGoalType("normal");
                      } else {
                        setIsOwnGoal(false);
                        setGoalType(e.target.value);
                      }
                    }}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="normal">Normal</option>
                    <option value="penalty">Pênalti</option>
                    <option value="own_goal">Gol Contra</option>
                  </select>
                </label>
              )}
              {isGoal && !isOwnGoal && (
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Assistência
                  </span>
                  <select
                    value={actionAssistId}
                    onChange={(e) => setActionAssistId(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">Sem assistência</option>
                    {athletes
                      .filter((a: any) => a.id !== actionAthleteId)
                      .map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {needsMiss && (
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Resultado
                  </span>
                  <select
                    value={missResult}
                    onChange={(e) => setMissResult(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="goalkeeper_save">Defesa do goleiro</option>
                    <option value="off_target">Para fora</option>
                    <option value="post">Na trave</option>
                    <option value="foul">Irregularidade</option>
                  </select>
                </label>
              )}
            </div>
            {actionError && (
              <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                {actionError}
              </p>
            )}
            <button
              type="button"
              onClick={handleAddAction}
              disabled={addingAction}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-brand)",
                color: "var(--color-background)",
              }}
            >
              {addingAction ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
        )}

        {actions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhuma ação registrada.
          </p>
        ) : (
          <div className="space-y-1">
            {firstHalf.length > 0 && (
              <>
                <p
                  className="pt-2 pb-1 text-xs font-mono uppercase"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  1º Tempo
                </p>
                {firstHalf.map((a: any) => (
                  <ActionRow
                    key={a.id}
                    action={a}
                    teamA={teamA}
                    teamB={teamB}
                    matchTeamAId={match.team_a_id}
                    onDelete={() =>
                      handleDelete(
                        a.id,
                        a.action_type,
                        a.is_own_goal,
                        a.team_id
                      )
                    }
                  />
                ))}
              </>
            )}
            {secondHalf.length > 0 && (
              <>
                <p
                  className="pt-4 pb-1 text-xs font-mono uppercase"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  2º Tempo
                </p>
                {secondHalf.map((a: any) => (
                  <ActionRow
                    key={a.id}
                    action={a}
                    teamA={teamA}
                    teamB={teamB}
                    matchTeamAId={match.team_a_id}
                    onDelete={() =>
                      handleDelete(
                        a.id,
                        a.action_type,
                        a.is_own_goal,
                        a.team_id
                      )
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
