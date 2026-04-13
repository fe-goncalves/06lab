"use client";

import { adicionarAcao, deletarAcao, editarPartida } from "./actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  match: any;
  actions: any[];
  lineups: any[];
  editionTeamsWithAthletes: any[];
  venues: any[];
  competitionId: string;
  edicaoId: string;
  faseId: string;
};

export default function PartidaClient({
  match,
  actions: initialActions,
  lineups,
  editionTeamsWithAthletes,
  venues,
  competitionId,
  edicaoId,
  faseId,
}: Props) {
  const router = useRouter();
  const [actions, setActions] = useState(initialActions);
  const [scoreA, setScoreA] = useState(match.score_a ?? 0);
  const [scoreB, setScoreB] = useState(match.score_b ?? 0);
  const [status, setStatus] = useState(match.status ?? "scheduled");
  const [finishType, setFinishType] = useState(match.finish_type ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Ação ativa
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState("goal");
  const [actionTeamId, setActionTeamId] = useState(match.team_a_id ?? "");
  const [actionPeriod, setActionPeriod] = useState("first");
  const [actionMinute, setActionMinute] = useState("");
  const [actionAthleteId, setActionAthleteId] = useState("");
  const [actionAssistId, setActionAssistId] = useState("");
  const [goalType, setGoalType] = useState("normal");
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [missResult, setMissResult] = useState("goalkeeper_save");
  const [addingAction, setAddingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const teamA = match.teams_a;
  const teamB = match.teams_b;
  const halfDuration = match.phases?.half_duration_minutes ?? 25;

  const actionTypeLabel: Record<string, string> = {
    goal: "Gol",
    yellow_card: "Cartão Amarelo",
    red_card: "Cartão Vermelho",
    red_yellow_card: "Amarelo-Vermelho",
    penalty_missed: "Pênalti Perdido",
    shootout_missed: "Shoot-out Perdido",
    foul: "Falta",
    fifth_foul: "Quinta Falta",
  };

  // Atletas por equipe
  function getAthletesForTeam(teamId: string) {
    const et = editionTeamsWithAthletes.find((et: any) => et.team_id === teamId);
    if (!et) return [];
    return (et.edition_roster_entries ?? [])
      .filter((e: any) => e.member_type === "athlete" && e.status === "approved" && e.athletes)
      .map((e: any) => e.athletes);
  }

  const actionAthletes = getAthletesForTeam(actionTeamId);
  const needsMinute = !["foul", "fifth_foul"].includes(actionType);
  const needsAthlete = !["fifth_foul"].includes(actionType);
  const needsGoalType = actionType === "goal";
  const needsMissResult = ["penalty_missed", "shootout_missed"].includes(actionType);

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("status", status);
    fd.append("finish_type", finishType);
    fd.append("score_a", String(scoreA));
    fd.append("score_b", String(scoreB));
    const result = await editarPartida(match.id, fd);
    setSaving(false);
    if ("error" in result) { setFeedback(result.error); return; }
    setFeedback("Salvo com sucesso.");
    router.refresh();
  }

  async function handleAddAction() {
    setActionError(null);
    setAddingAction(true);
    const fd = new FormData();
    fd.append("team_id", actionTeamId);
    fd.append("action_type", actionType);
    fd.append("period", actionPeriod);
    if (needsMinute && actionMinute) fd.append("minute", actionMinute);
    if (needsAthlete && actionAthleteId) fd.append("primary_athlete_id", actionAthleteId);
    if (actionType === "goal" && actionAssistId) fd.append("secondary_athlete_id", actionAssistId);
    if (needsGoalType) {
      fd.append("goal_type", isOwnGoal ? "own_goal" : goalType);
      fd.append("is_own_goal", String(isOwnGoal));
    }
    if (needsMissResult) fd.append("miss_result", missResult);

    const result = await adicionarAcao(match.id, fd);
    setAddingAction(false);
    if ("error" in result) { setActionError(result.error); return; }

    // Atualiza placar local se for gol
    if (actionType === "goal") {
      const isTeamA = actionTeamId === match.team_a_id;
      if (!isOwnGoal) {
        if (isTeamA) setScoreA(p => p + 1);
        else setScoreB(p => p + 1);
      } else {
        if (isTeamA) setScoreB(p => p + 1);
        else setScoreA(p => p + 1);
      }
    }

    setActions(prev => [...prev, { id: result.id, action_type: actionType, team_id: actionTeamId, period: actionPeriod, minute: actionMinute ? Number(actionMinute) : null, is_own_goal: isOwnGoal, goal_type: isOwnGoal ? "own_goal" : goalType }]);
    setShowActionForm(false);
    setActionMinute(""); setActionAthleteId(""); setActionAssistId("");
    router.refresh();
  }

  async function handleDeleteAction(actionId: string, actionType: string, isOwnGoal: boolean, teamId: string) {
    if (!confirm("Remover esta ação?")) return;
    const result = await deletarAcao(actionId, match.id);
    if ("error" in result) { alert(result.error); return; }
    if (actionType === "goal") {
      const isTeamA = teamId === match.team_a_id;
      if (!isOwnGoal) {
        if (isTeamA) setScoreA(p => Math.max(0, p - 1));
        else setScoreB(p => Math.max(0, p - 1));
      } else {
        if (isTeamA) setScoreB(p => Math.max(0, p - 1));
        else setScoreA(p => Math.max(0, p - 1));
      }
    }
    setActions(prev => prev.filter(a => a.id !== actionId));
  }

  const roundName = match.rounds?.custom_label ?? match.rounds?.name ?? "Rodada";
  const competitionName = match.phases?.competition_editions?.competitions?.full_name ?? "Competição";

  return (
    <div className="p-6 md:p-8">
      {/* Cabeçalho */}
      <header className="mb-6 flex items-center gap-3">
        <Link href={`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${faseId}`}
          className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ← {competitionName}
        </Link>
        <span style={{ color: "var(--color-text-secondary)" }}>·</span>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{roundName}</span>
      </header>

      {/* Placar */}
      <div className="mb-6 rounded-xl border p-6 text-center" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            {teamA?.logo_url && <img src={teamA.logo_url} alt="" className="h-12 w-12 object-contain" />}
            <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{teamA?.full_name ?? "A definir"}</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="number" value={scoreA} onChange={e => setScoreA(Number(e.target.value))}
              className="w-16 rounded-lg border px-2 py-2 text-center text-2xl font-display font-bold outline-none"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-brand)" }} />
            <span className="text-2xl font-display" style={{ color: "var(--color-text-secondary)" }}>×</span>
            <input type="number" value={scoreB} onChange={e => setScoreB(Number(e.target.value))}
              className="w-16 rounded-lg border px-2 py-2 text-center text-2xl font-display font-bold outline-none"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-brand)" }} />
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            {teamB?.logo_url && <img src={teamB.logo_url} alt="" className="h-12 w-12 object-contain" />}
            <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{teamB?.full_name ?? "A definir"}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputClass} text-xs`} style={inputStyle}>
            <option value="scheduled">Agendada</option>
            <option value="ongoing">Em andamento</option>
            <option value="finished">Finalizada</option>
            <option value="postponed">Adiada</option>
          </select>
          <select value={finishType} onChange={e => setFinishType(e.target.value)} className={`${inputClass} text-xs`} style={inputStyle}>
            <option value="">Tipo de encerramento</option>
            <option value="normal">Normal</option>
            <option value="walkover">W.O.</option>
            <option value="penalties">Pênaltis</option>
            <option value="shootouts">Shoot-outs</option>
          </select>
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {feedback && <p className="mt-2 text-xs" style={{ color: "var(--color-success)" }}>{feedback}</p>}
      </div>

      {/* Ações */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Ações do jogo</h2>
          <button type="button" onClick={() => setShowActionForm(v => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {showActionForm ? "Cancelar" : "Adicionar ação"}
          </button>
        </div>

        {showActionForm && (
          <div className="mb-4 rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo</span>
                <select value={actionType} onChange={e => setActionType(e.target.value)} className={inputClass} style={inputStyle}>
                  {Object.entries(actionTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe</span>
                <select value={actionTeamId} onChange={e => { setActionTeamId(e.target.value); setActionAthleteId(""); }} className={inputClass} style={inputStyle}>
                  {teamA && <option value={teamA.id}>{teamA.full_name}</option>}
                  {teamB && <option value={teamB.id}>{teamB.full_name}</option>}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Período</span>
                <select value={actionPeriod} onChange={e => setActionPeriod(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="first">1º Tempo (0-{halfDuration})</option>
                  <option value="second">2º Tempo ({halfDuration+1}-{halfDuration*2})</option>
                </select>
              </label>
              {needsMinute && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Minuto</span>
                  <input type="number" value={actionMinute} onChange={e => setActionMinute(e.target.value)} min={1} max={halfDuration * 2} className={inputClass} style={inputStyle} />
                </label>
              )}
              {needsAthlete && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Atleta</span>
                  <select value={actionAthleteId} onChange={e => setActionAthleteId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Selecione…</option>
                    {actionAthletes.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.full_name}{a.surname ? ` (${a.surname})` : ""}</option>
                    ))}
                  </select>
                </label>
              )}
              {actionType === "goal" && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo de gol</span>
                    <select value={isOwnGoal ? "own_goal" : goalType} onChange={e => {
                      if (e.target.value === "own_goal") { setIsOwnGoal(true); setGoalType("normal"); }
                      else { setIsOwnGoal(false); setGoalType(e.target.value); }
                    }} className={inputClass} style={inputStyle}>
                      <option value="normal">Normal</option>
                      <option value="penalty">Pênalti</option>
                      <option value="own_goal">Gol Contra</option>
                    </select>
                  </label>
                  {!isOwnGoal && (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Assistência</span>
                      <select value={actionAssistId} onChange={e => setActionAssistId(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Sem assistência</option>
                        {actionAthletes.filter((a: any) => a.id !== actionAthleteId).map((a: any) => (
                          <option key={a.id} value={a.id}>{a.full_name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}
              {needsMissResult && (
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
            </div>
            {actionError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{actionError}</p>}
            <button type="button" onClick={handleAddAction} disabled={addingAction}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {addingAction ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
        )}

        {actions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma ação registrada.</p>
        ) : (
          <ul className="space-y-1">
            {actions.map((a: any) => {
              const isTeamA = a.team_id === match.team_a_id;
              const teamName = isTeamA ? teamA?.abbreviation : teamB?.abbreviation;
              const athleteName = a.primary_athlete?.surname ?? a.primary_athlete?.full_name ?? "";
              return (
                <li key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: "var(--color-background)" }}>
                  <div className="flex items-center gap-3">
                    {a.minute && (
                      <span className="font-mono text-xs w-8 text-right" style={{ color: "var(--color-text-secondary)" }}>
                        {a.minute}'
                      </span>
                    )}
                    <span className="text-xs font-medium" style={{ color: "var(--color-brand)" }}>{teamName}</span>
                    <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {actionTypeLabel[a.action_type] ?? a.action_type}
                      {athleteName ? ` — ${athleteName}` : ""}
                      {a.is_own_goal ? " (contra)" : ""}
                    </span>
                  </div>
                  <button type="button" onClick={() => handleDeleteAction(a.id, a.action_type, a.is_own_goal, a.team_id)}
                    className="rounded border px-2 py-0.5 text-xs"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}