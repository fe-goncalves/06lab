"use client";

import { editarFase, deletarFase, criarRodada, criarConfrontoEliminatorio } from "../actions";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  phase: any;
  rounds: any[];
  matchups: any[];
  editionTeams: any[];
  roundLabels: any[];
  competitionId: string;
  edicaoId: string;
  competitionName: string;
  seasonName: string;
};

export default function FaseClient({
  phase,
  rounds: initialRounds,
  matchups: initialMatchups,
  editionTeams,
  roundLabels,
  competitionId,
  edicaoId,
  competitionName,
  seasonName,
}: Props) {
  const router = useRouter();
  const isKnockout = phase.phase_type === "knockout" || phase.phase_type === "conference";
  const isClassificatory = phase.phase_type === "round_robin" || phase.phase_type === "group_stage";

  const [rounds, setRounds] = useState(initialRounds);
  const [matchups, setMatchups] = useState(initialMatchups);

  // Edição da fase
  const [fullName, setFullName] = useState(phase.full_name ?? "");
  const [customLabel, setCustomLabel] = useState(phase.custom_label ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(phase.display_order ?? 0));
  const [halfDuration, setHalfDuration] = useState(String(phase.half_duration_minutes ?? ""));
  const [isCurrent, setIsCurrent] = useState(phase.is_current ?? false);
  const [legs, setLegs] = useState(phase.legs ?? false);
  const [aggregateScore, setAggregateScore] = useState(phase.aggregate_score ?? false);
  const [thirdPlace, setThirdPlace] = useState(phase.third_place_match ?? false);
  const [tiebreakerType, setTiebreakerType] = useState(phase.penalty_tiebreaker_type ?? "penalties");
  const [pointsWin, setPointsWin] = useState(String(phase.points_win ?? 3));
  const [pointsDraw, setPointsDraw] = useState(String(phase.points_draw ?? 1));
  const [pointsLoss, setPointsLoss] = useState(String(phase.points_loss ?? 0));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Nova rodada
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundCustomLabel, setRoundCustomLabel] = useState("");
  const [roundOrder, setRoundOrder] = useState("0");
  const [savingRound, setSavingRound] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);

  // Novo confronto
  const [showMatchupForm, setShowMatchupForm] = useState(false);
  const [matchupRoundLabel, setMatchupRoundLabel] = useState(roundLabels[0]?.label ?? "");
  const [matchupTeamA, setMatchupTeamA] = useState("");
  const [matchupTeamB, setMatchupTeamB] = useState("");
  const [matchupOrder, setMatchupOrder] = useState("0");
  const [savingMatchup, setSavingMatchup] = useState(false);
  const [matchupError, setMatchupError] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const teams = editionTeams.map((et: any) => et.teams).filter(Boolean);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("custom_label", customLabel.trim());
    fd.append("phase_type", phase.phase_type);
    fd.append("display_order", displayOrder);
    fd.append("half_duration_minutes", halfDuration);
    fd.append("is_current", String(isCurrent));
    if (isKnockout) {
      fd.append("legs", String(legs));
      fd.append("aggregate_score", String(aggregateScore));
      fd.append("third_place_match", String(thirdPlace));
      fd.append("penalty_tiebreaker_type", tiebreakerType);
    }
    if (isClassificatory) {
      fd.append("points_win", pointsWin);
      fd.append("points_draw", pointsDraw);
      fd.append("points_loss", pointsLoss);
    }
    const result = await editarFase(phase.id, fd);
    setSaving(false);
    if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
    setFeedback({ type: "success", text: "Fase salva." });
  }

  async function handleDelete() {
    if (!confirm("Excluir esta fase? Esta ação não pode ser desfeita.")) return;
    const result = await deletarFase(phase.id);
    if ("error" in result) { alert(result.error); return; }
    router.push(`/competicoes/${competitionId}/edicoes/${edicaoId}`);
  }

  async function handleCreateRound() {
    setRoundError(null);
    setSavingRound(true);
    const fd = new FormData();
    fd.append("name", roundName.trim());
    fd.append("custom_label", roundCustomLabel.trim());
    fd.append("display_order", roundOrder);
    const result = await criarRodada(phase.id, fd);
    setSavingRound(false);
    if ("error" in result) { setRoundError(result.error); return; }
    setRounds(prev => [...prev, { id: result.id, name: roundName, custom_label: roundCustomLabel || null, display_order: Number(roundOrder) }]);
    setShowRoundForm(false);
    setRoundName(""); setRoundCustomLabel(""); setRoundOrder("0");
  }

  async function handleCreateMatchup() {
    setMatchupError(null);
    setSavingMatchup(true);
    const fd = new FormData();
    fd.append("round_label", matchupRoundLabel);
    fd.append("team_a_id", matchupTeamA);
    fd.append("team_b_id", matchupTeamB);
    fd.append("display_order", matchupOrder);
    const result = await criarConfrontoEliminatorio(phase.id, fd);
    setSavingMatchup(false);
    if ("error" in result) { setMatchupError(result.error); return; }
    const teamA = teams.find((t: any) => t.id === matchupTeamA);
    const teamB = teams.find((t: any) => t.id === matchupTeamB);
    setMatchups(prev => [...prev, {
      id: result.id, round_label: matchupRoundLabel,
      team_a_id: matchupTeamA || null, team_b_id: matchupTeamB || null,
      is_completed: false, display_order: Number(matchupOrder),
      teams_a: teamA, teams_b: teamB,
    }]);
    setShowMatchupForm(false);
    setMatchupTeamA(""); setMatchupTeamB(""); setMatchupOrder("0");
  }

  const phaseTypeLabel: Record<string, string> = {
    knockout: "Mata-mata",
    round_robin: "Pontos Corridos",
    group_stage: "Fase de Grupos",
    conference: "Conferência",
  };

  return (
    <div className="p-6 md:p-8">
      <Breadcrumb
        items={[
          { label: "Competições", href: "/competicoes" },
          { label: competitionName || "Competição", href: `/competicoes/${competitionId}` },
          { label: seasonName || "Temporada", href: `/competicoes/${competitionId}/edicoes/${edicaoId}` },
          { label: customLabel || fullName || "Fase" },
        ]}
      />
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/competicoes/${competitionId}/edicoes/${edicaoId}`}
            className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            ← Edição
          </Link>
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>
              {customLabel || fullName}
            </h1>
            <p className="text-xs font-mono" style={{ color: "var(--color-brand)" }}>
              {phaseTypeLabel[phase.phase_type] ?? phase.phase_type}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleDelete}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
            Excluir fase
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </header>

      {feedback && (
        <div className="mb-6 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: feedback.type === "error" ? "var(--color-danger)" : "var(--color-success)" }}>
          {feedback.text}
        </div>
      )}

      {/* Configurações da fase */}
      <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome</span>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Apelido</span>
            <input type="text" value={customLabel} onChange={e => setCustomLabel(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ordem</span>
            <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Duração de cada tempo (min)</span>
            <input type="number" value={halfDuration} onChange={e => setHalfDuration(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isCurrent} onChange={e => setIsCurrent(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Fase atual</span>
          </label>
        </div>

        {isKnockout && (
          <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={legs} onChange={e => setLegs(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Jogos de ida e volta</span>
            </label>
            {legs && (
              <label className="flex items-center gap-3 cursor-pointer ml-7">
                <input type="checkbox" checked={aggregateScore} onChange={e => setAggregateScore(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Placar agregado</span>
              </label>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={thirdPlace} onChange={e => setThirdPlace(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Disputa de terceiro lugar</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo de desempate</span>
              <select value={tiebreakerType} onChange={e => setTiebreakerType(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="penalties">Pênaltis</option>
                <option value="shootouts">Shoot-outs</option>
              </select>
            </label>
          </div>
        )}

        {isClassificatory && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Vitória</span>
                <input type="number" value={pointsWin} onChange={e => setPointsWin(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Empate</span>
                <input type="number" value={pointsDraw} onChange={e => setPointsDraw(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Derrota</span>
                <input type="number" value={pointsLoss} onChange={e => setPointsLoss(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Rodadas (fases classificatórias) */}
      {isClassificatory && (
        <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
              Rodadas ({rounds.length})
            </h2>
            <button type="button" onClick={() => setShowRoundForm(v => !v)}
              className="rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {showRoundForm ? "Cancelar" : "Nova rodada"}
            </button>
          </div>
          {showRoundForm && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nome *</span>
                <input type="text" value={roundName} onChange={e => setRoundName(e.target.value)} placeholder="Rodada 1" className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Apelido</span>
                <input type="text" value={roundCustomLabel} onChange={e => setRoundCustomLabel(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Ordem</span>
                <input type="number" value={roundOrder} onChange={e => setRoundOrder(e.target.value)} className={`${inputClass} w-24`} style={inputStyle} />
              </label>
              <button type="button" onClick={handleCreateRound} disabled={savingRound || !roundName}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {savingRound ? "Criando…" : "Criar"}
              </button>
              {roundError && <p className="w-full text-sm" style={{ color: "var(--color-danger)" }}>{roundError}</p>}
            </div>
          )}
          {rounds.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma rodada cadastrada.</p>
          ) : (
            <ul className="space-y-2">
              {rounds.sort((a, b) => a.display_order - b.display_order).map((r: any) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{r.custom_label ?? r.name}</p>
                    {r.custom_label && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{r.name}</p>}
                  </div>
                  <Link href={`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${phase.id}/rodadas/${r.id}`}
                    className="rounded border px-3 py-1 text-xs"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    Ver partidas
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confrontos (fases eliminatórias) */}
      {isKnockout && (
        <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
              Confrontos ({matchups.length})
            </h2>
            <button type="button" onClick={() => setShowMatchupForm(v => !v)}
              className="rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {showMatchupForm ? "Cancelar" : "Novo confronto"}
            </button>
          </div>
          {showMatchupForm && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Rótulo *</span>
                <select value={matchupRoundLabel} onChange={e => setMatchupRoundLabel(e.target.value)} className={inputClass} style={inputStyle}>
                  {roundLabels.map((rl: any) => <option key={rl.id} value={rl.label}>{rl.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe A</span>
                <select value={matchupTeamA} onChange={e => setMatchupTeamA(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">A definir</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe B</span>
                <select value={matchupTeamB} onChange={e => setMatchupTeamB(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">A definir</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Ordem</span>
                <input type="number" value={matchupOrder} onChange={e => setMatchupOrder(e.target.value)} className={`${inputClass} w-24`} style={inputStyle} />
              </label>
              <button type="button" onClick={handleCreateMatchup} disabled={savingMatchup || !matchupRoundLabel}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {savingMatchup ? "Criando…" : "Criar"}
              </button>
              {matchupError && <p className="w-full text-sm" style={{ color: "var(--color-danger)" }}>{matchupError}</p>}
            </div>
          )}
          {matchups.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum confronto cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {matchups.sort((a, b) => a.display_order - b.display_order).map((m: any) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  <div>
                    <p className="text-xs font-mono mb-1" style={{ color: "var(--color-brand)" }}>{m.round_label}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {m.teams_a?.full_name ?? "A definir"} × {m.teams_b?.full_name ?? "A definir"}
                    </p>
                  </div>
                  {m.is_completed && (
                    <span className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Concluído
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}