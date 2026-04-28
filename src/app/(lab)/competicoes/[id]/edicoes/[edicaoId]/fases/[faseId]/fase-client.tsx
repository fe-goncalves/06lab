"use client";

import {
  editarFase, deletarFase, criarRodada, editarRodada, deletarRodada,
  adicionarEquipeFase, removerEquipeFase,
  criarGrupo, editarGrupo, deletarGrupo,
  adicionarEquipeGrupo, removerEquipeGrupo,
  salvarFaseComoTemplate,
} from "../actions";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

type Props = {
  phase: any;
  rounds: any[];
  editionTeams: any[];
  phaseTeams: any[];
  groups: any[];
  groupTeams: any[];
  competitionId: string;
  edicaoId: string;
  competitionName: string;
  seasonName: string;
};

const PHASE_TYPE_LABEL: Record<string, string> = {
  knockout: "Mata-mata",
  round_robin: "Pontos Corridos",
  group_stage: "Fase de Grupos",
  conference: "Conferência",
};

const KNOCKOUT_ROUND_LABELS = [
  "Final",
  "Disputa de Terceiro Lugar",
  "Semifinal",
  "Quartas de Final",
  "Oitavas de Final",
  "Décimas de Final",
  "Fase de Grupos",
];

export default function FaseClient({
  phase,
  rounds: initialRounds,
  editionTeams,
  phaseTeams: initialPhaseTeams,
  groups: initialGroups,
  groupTeams: initialGroupTeams,
  competitionId,
  edicaoId,
  competitionName,
  seasonName,
}: Props) {
  const router = useRouter();
  const isKnockout = phase.phase_type === "knockout";
  const isConference = phase.phase_type === "conference";
  const isGroupStage = phase.phase_type === "group_stage";
  const isRoundRobin = phase.phase_type === "round_robin";
  const isClassificatory = isRoundRobin || isGroupStage;
  const hasGroups = isGroupStage || isConference;
  const hasMatchups = isKnockout || isConference;

  const tabs = [
    { key: "informacoes", label: "INFORMAÇÕES" },
    { key: "equipes", label: "EQUIPES" },
    ...(hasGroups ? [{ key: "grupos", label: isConference ? "CONFERÊNCIAS" : "GRUPOS" }] : []),
    { key: "rodadas", label: "RODADAS" },
  ];

  const [activeTab, setActiveTab] = useState<string>("informacoes");
  const [rounds, setRounds] = useState(initialRounds);
  const [phaseTeams, setPhaseTeams] = useState(initialPhaseTeams);
  const [groups, setGroups] = useState(initialGroups);
  const [groupTeams, setGroupTeams] = useState(initialGroupTeams);

  // Informações
  const [fullName, setFullName] = useState(phase.full_name ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(phase.display_order ?? 0));
  const [halfDuration, setHalfDuration] = useState(String(phase.half_duration_minutes ?? ""));
  const [isCurrent, setIsCurrent] = useState(phase.is_current ?? false);
  const [legs, setLegs] = useState(phase.legs ?? false);
  const [aggregateScore, setAggregateScore] = useState(phase.aggregate_score ?? false);
  const [tiebreakerType, setTiebreakerType] = useState(phase.penalty_tiebreaker_type ?? "penalties");
  const [pointsWin, setPointsWin] = useState(String(phase.points_win ?? 3));
  const [pointsDraw, setPointsDraw] = useState(String(phase.points_draw ?? 1));
  const [pointsLoss, setPointsLoss] = useState(String(phase.points_loss ?? 0));
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Rodadas
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundOrder, setRoundOrder] = useState("");
  const [savingRound, setSavingRound] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editRoundName, setEditRoundName] = useState("");
  const [editRoundOrder, setEditRoundOrder] = useState("");
  const [editRoundCurrent, setEditRoundCurrent] = useState(false);

  // Grupos
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const phaseTeamIds = new Set(phaseTeams.map((pt: any) => pt.edition_team_id));
  const teamsInPhase = editionTeams.filter((et: any) => phaseTeamIds.has(et.id));
  const teamsNotInPhase = editionTeams.filter((et: any) => !phaseTeamIds.has(et.id));

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("custom_label", "");
    fd.append("phase_type", phase.phase_type);
    fd.append("display_order", displayOrder);
    fd.append("half_duration_minutes", halfDuration);
    fd.append("is_current", String(isCurrent));
    if (isKnockout || isConference) {
      fd.append("legs", String(legs));
      fd.append("aggregate_score", String(aggregateScore));
      fd.append("penalty_tiebreaker_type", tiebreakerType);
    }
    if (isClassificatory) {
      fd.append("points_win", pointsWin);
      fd.append("points_draw", pointsDraw);
      fd.append("points_loss", pointsLoss);
    }
    const result = await editarFase(phase.id, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Fase salva.");
  }

  async function handleDelete() {
    if (!confirm("Excluir esta fase? Esta ação não pode ser desfeita.")) return;
    const result = await deletarFase(phase.id);
    if ("error" in result) { toast("error", result.error); return; }
    router.push(`/competicoes/${competitionId}`);
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    const result = await salvarFaseComoTemplate(phase.id, competitionId);
    setSavingTemplate(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Fase salva como template.");
  }

  async function handleCreateRound() {
    if (!roundName.trim()) { setRoundError("Nome é obrigatório."); return; }
    setRoundError(null); setSavingRound(true);
    const fd = new FormData();
    fd.append("name", roundName.trim());
    fd.append("custom_label", "");
    fd.append("display_order", roundOrder || String(rounds.length + 1));
    const result = await criarRodada(phase.id, fd);
    setSavingRound(false);
    if ("error" in result) { setRoundError(result.error); return; }
    setRounds(prev => [...prev, { id: result.id, name: roundName.trim(), custom_label: null, display_order: Number(roundOrder || rounds.length + 1), is_current: false }]);
    setShowRoundForm(false); setRoundName(""); setRoundOrder("");
  }

  async function handleUpdateRound(roundId: string) {
    const fd = new FormData();
    fd.append("name", editRoundName.trim());
    fd.append("custom_label", "");
    fd.append("display_order", editRoundOrder);
    fd.append("is_current", String(editRoundCurrent));
    const result = await editarRodada(roundId, fd);
    if ("error" in result) { toast("error", result.error); return; }
    setRounds(prev => prev.map(r => r.id === roundId
      ? { ...r, name: editRoundName.trim(), display_order: Number(editRoundOrder), is_current: editRoundCurrent }
      : editRoundCurrent ? { ...r, is_current: false } : r
    ));
    setEditingRoundId(null);
    toast("success", "Rodada atualizada.");
  }

  async function handleDeleteRound(roundId: string) {
    if (!confirm("Excluir esta rodada?")) return;
    const result = await deletarRodada(roundId);
    if ("error" in result) { toast("error", result.error); return; }
    setRounds(prev => prev.filter(r => r.id !== roundId));
    toast("success", "Rodada excluída.");
  }

  async function handleAddTeamToPhase(editionTeamId: string) {
    setProcessing(editionTeamId);
    const result = await adicionarEquipeFase(phase.id, editionTeamId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    setPhaseTeams(prev => [...prev, { edition_team_id: editionTeamId }]);
    toast("success", "Equipe adicionada à fase.");
  }

  async function handleRemoveTeamFromPhase(editionTeamId: string) {
    setProcessing(editionTeamId);
    const result = await removerEquipeFase(phase.id, editionTeamId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    setPhaseTeams(prev => prev.filter((pt: any) => pt.edition_team_id !== editionTeamId));
    toast("success", "Equipe removida da fase.");
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) return;
    setSavingGroup(true);
    const result = await criarGrupo(phase.id, groupName.trim(), groups.length + 1);
    setSavingGroup(false);
    if ("error" in result) { toast("error", result.error); return; }
    setGroups(prev => [...prev, { id: result.id, name: groupName.trim(), custom_label: null, display_order: groups.length + 1 }]);
    setShowGroupForm(false); setGroupName("");
    toast("success", "Grupo criado.");
  }

  async function handleUpdateGroup(groupId: string) {
    const result = await editarGrupo(groupId, editGroupName.trim(), null, 0);
    if ("error" in result) { toast("error", result.error); return; }
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: editGroupName.trim() } : g));
    setEditingGroupId(null);
    toast("success", "Grupo atualizado.");
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm("Excluir este grupo?")) return;
    const result = await deletarGrupo(groupId);
    if ("error" in result) { toast("error", result.error); return; }
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setGroupTeams(prev => prev.filter((gt: any) => gt.group_id !== groupId));
    toast("success", "Grupo excluído.");
  }

  async function handleAddTeamToGroup(groupId: string, editionTeamId: string) {
    setProcessing(`${groupId}-${editionTeamId}`);
    const result = await adicionarEquipeGrupo(groupId, editionTeamId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    setGroupTeams(prev => [...prev, { group_id: groupId, edition_team_id: editionTeamId }]);
  }

  async function handleRemoveTeamFromGroup(groupId: string, editionTeamId: string) {
    setProcessing(`${groupId}-${editionTeamId}`);
    const result = await removerEquipeGrupo(groupId, editionTeamId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    setGroupTeams(prev => prev.filter((gt: any) => !(gt.group_id === groupId && gt.edition_team_id === editionTeamId)));
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competitionName, href: `/competicoes/${competitionId}` },
            { label: seasonName, href: `/competicoes/${competitionId}` },
            { label: fullName || "Fase" },
          ]} />

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {fullName || "Fase"}
              </h1>
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--color-brand)" }}>
                {PHASE_TYPE_LABEL[phase.phase_type] ?? phase.phase_type}
                {phase.template_id && <span className="ml-2 opacity-60">· via template</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={handleSaveTemplate} disabled={savingTemplate}
                className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                {savingTemplate ? "Salvando…" : "Salvar como template"}
              </button>
              <button type="button" onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                <Trash2 size={13} /> Excluir
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
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

      <div className="flex-1 px-8 py-6">

        {/* INFORMAÇÕES */}
        {activeTab === "informacoes" && (
          <div className="max-w-lg space-y-4">
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações gerais</h2>
              <div className="space-y-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome da fase</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ordem</span>
                    <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} className={inputClass} style={inputStyle} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Duração de cada tempo (min)</span>
                    <input type="number" value={halfDuration} onChange={e => setHalfDuration(e.target.value)} className={inputClass} style={inputStyle} />
                  </label>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isCurrent} onChange={e => setIsCurrent(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Fase atual da competição</span>
                </label>
              </div>
            </div>

            {(isKnockout || isConference) && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações do mata-mata</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={legs} onChange={e => setLegs(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Jogos de ida e volta</span>
                  </label>
                  {legs && (
                    <label className="flex items-center gap-3 cursor-pointer ml-6">
                      <input type="checkbox" checked={aggregateScore} onChange={e => setAggregateScore(e.target.checked)} className="h-4 w-4" />
                      <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Placar agregado</span>
                    </label>
                  )}
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo de desempate final</span>
                    <select value={tiebreakerType} onChange={e => setTiebreakerType(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="penalties">Pênaltis</option>
                      <option value="shootouts">Shoot-outs</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {isClassificatory && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Pontuação</h2>
                <div className="grid grid-cols-3 gap-4">
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
        )}

        {/* EQUIPES */}
        {activeTab === "equipes" && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Participantes da fase ({teamsInPhase.length})
                </h2>
              </div>
              {teamsInPhase.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe adicionada.</p>
              ) : (
                teamsInPhase.map((et: any, idx: number) => (
                  <div key={et.id} className="flex items-center gap-3 px-5 py-3 group"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {et.teams?.logo_url ? (
                      <img src={et.teams.logo_url} alt="" className="h-8 w-8 rounded object-contain shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-bold"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                      </div>
                    )}
                    <p className="flex-1 font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {et.teams?.full_name ?? "—"}
                    </p>
                    <button type="button" onClick={() => handleRemoveTeamFromPhase(et.id)}
                      disabled={processing === et.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded border px-2 py-1 font-mono text-xs disabled:opacity-50"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>

            {teamsNotInPhase.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Disponíveis ({teamsNotInPhase.length})
                  </h2>
                </div>
                {teamsNotInPhase.map((et: any, idx: number) => (
                  <div key={et.id} className="flex items-center gap-3 px-5 py-3 group"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: 0.55, transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}>
                    {et.teams?.logo_url ? (
                      <img src={et.teams.logo_url} alt="" className="h-8 w-8 rounded object-contain shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-bold"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                      </div>
                    )}
                    <p className="flex-1 font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {et.teams?.full_name ?? "—"}
                    </p>
                    <button type="button" onClick={() => handleAddTeamToPhase(et.id)}
                      disabled={processing === et.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs disabled:opacity-50"
                      style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
                      <Plus size={11} /> Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GRUPOS / CONFERÊNCIAS */}
        {activeTab === "grupos" && (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {groups.length} {isConference ? "conferência" : "grupo"}{groups.length !== 1 ? "s" : ""}
              </p>
              <button type="button" onClick={() => setShowGroupForm(v => !v)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                <Plus size={12} /> {isConference ? "Nova conferência" : "Novo grupo"}
              </button>
            </div>

            {showGroupForm && (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nome *</span>
                  <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                    placeholder={isConference ? "Ex: Conferência Leste" : "Ex: Grupo A"}
                    className={inputClass} style={inputStyle} />
                </label>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowGroupForm(false); setGroupName(""); }}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCreateGroup} disabled={savingGroup || !groupName.trim()}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                    {savingGroup ? "Criando…" : "Criar"}
                  </button>
                </div>
              </div>
            )}

            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>
                  Sem {isConference ? "conferências" : "grupos"}
                </p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Crie e distribua as equipes nos {isConference ? "conferências" : "grupos"}.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {groups.sort((a, b) => a.display_order - b.display_order).map(group => {
                  const teamsInGroup = groupTeams.filter((gt: any) => gt.group_id === group.id);
                  const teamIdsInGroup = new Set(teamsInGroup.map((gt: any) => gt.edition_team_id));
                  const teamsAvailable = teamsInPhase.filter((et: any) => !teamIdsInGroup.has(et.id));

                  return (
                    <div key={group.id} className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                        {editingGroupId === group.id ? (
                          <>
                            <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)}
                              className="flex-1 rounded-lg border px-2 py-1 text-sm outline-none" style={inputStyle} autoFocus />
                            <button type="button" onClick={() => handleUpdateGroup(group.id)}
                              className="rounded border px-2 py-1" style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
                              <Check size={12} />
                            </button>
                            <button type="button" onClick={() => setEditingGroupId(null)} style={{ color: "var(--color-text-secondary)" }}>
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="flex-1 font-mono text-xs uppercase tracking-widest font-bold" style={{ color: "var(--color-brand)" }}>
                              {group.custom_label ?? group.name}
                            </p>
                            <button type="button" onClick={() => { setEditingGroupId(group.id); setEditGroupName(group.name); }}
                              className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                              <Pencil size={11} />
                            </button>
                            <button type="button" onClick={() => handleDeleteGroup(group.id)}
                              className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>

                      {teamsInGroup.length === 0 ? (
                        <p className="px-5 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe.</p>
                      ) : (
                        teamsInGroup.map((gt: any, idx: number) => {
                          const et = teamsInPhase.find((e: any) => e.id === gt.edition_team_id);
                          if (!et) return null;
                          return (
                            <div key={gt.edition_team_id} className="flex items-center gap-3 px-5 py-2.5 group"
                              style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                              {et.teams?.logo_url ? (
                                <img src={et.teams.logo_url} alt="" className="h-6 w-6 rounded object-contain shrink-0" />
                              ) : (
                                <div className="h-6 w-6 shrink-0 rounded border text-xs flex items-center justify-center"
                                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                                  {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                                </div>
                              )}
                              <p className="flex-1 text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                                {et.teams?.full_name ?? "—"}
                              </p>
                              <button type="button" onClick={() => handleRemoveTeamFromGroup(group.id, gt.edition_team_id)}
                                disabled={processing === `${group.id}-${gt.edition_team_id}`}
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded border px-1.5 py-0.5 font-mono text-xs"
                                style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })
                      )}

                      {teamsAvailable.length > 0 && (
                        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                          <select defaultValue=""
                            onChange={e => { if (e.target.value) handleAddTeamToGroup(group.id, e.target.value); e.target.value = ""; }}
                            className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none" style={inputStyle}>
                            <option value="">+ Adicionar equipe…</option>
                            {teamsAvailable.map((et: any) => (
                              <option key={et.id} value={et.id}>{et.teams?.full_name ?? "—"}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RODADAS — unificado para todos os tipos */}
        {activeTab === "rodadas" && (
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {rounds.length} rodada{rounds.length !== 1 ? "s" : ""}
              </p>
              <button type="button" onClick={() => setShowRoundForm(v => !v)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                <Plus size={12} /> Nova rodada
              </button>
            </div>

            {showRoundForm && (
              <div className="mb-4 rounded-xl border p-4 space-y-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nome *</span>
                    {hasMatchups ? (
                      <select value={roundName} onChange={e => setRoundName(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Selecione…</option>
                        {KNOCKOUT_ROUND_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={roundName} onChange={e => setRoundName(e.target.value)}
                        placeholder={`Rodada ${rounds.length + 1}`} className={inputClass} style={inputStyle} />
                    )}
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Ordem</span>
                    <input type="number" value={roundOrder} onChange={e => setRoundOrder(e.target.value)}
                      placeholder={String(rounds.length + 1)} className={inputClass} style={inputStyle} />
                  </label>
                </div>
                {roundError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{roundError}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowRoundForm(false); setRoundName(""); setRoundOrder(""); }}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCreateRound} disabled={savingRound || !roundName.trim()}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                    {savingRound ? "Criando…" : "Criar rodada"}
                  </button>
                </div>
              </div>
            )}

            {rounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem rodadas</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  {hasMatchups
                    ? "Adicione os estágios: Final, Semifinal, Quartas de Final…"
                    : "Crie a primeira rodada para começar."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                {rounds.sort((a, b) => a.display_order - b.display_order).map((r: any, idx: number) => (
                  <div key={r.id} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {editingRoundId === r.id ? (
                      <div className="flex items-center gap-3 px-5 py-3">
                        {hasMatchups ? (
                          <select value={editRoundName} onChange={e => setEditRoundName(e.target.value)}
                            className="flex-1 rounded-lg border px-2 py-1.5 text-sm outline-none" style={inputStyle} autoFocus>
                            {KNOCKOUT_ROUND_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        ) : (
                          <input type="text" value={editRoundName} onChange={e => setEditRoundName(e.target.value)}
                            className="flex-1 rounded-lg border px-2 py-1.5 text-sm outline-none" style={inputStyle} autoFocus />
                        )}
                        <input type="number" value={editRoundOrder} onChange={e => setEditRoundOrder(e.target.value)}
                          className="w-16 rounded-lg border px-2 py-1.5 text-sm outline-none" style={inputStyle} placeholder="Ordem" />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={editRoundCurrent} onChange={e => setEditRoundCurrent(e.target.checked)} className="h-3 w-3" />
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>atual</span>
                        </label>
                        <button type="button" onClick={() => handleUpdateRound(r.id)}
                          className="rounded border px-2 py-1.5" style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
                          <Check size={13} />
                        </button>
                        <button type="button" onClick={() => setEditingRoundId(null)} style={{ color: "var(--color-text-secondary)" }}>
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-5 py-3 group hover:bg-[rgba(255,255,255,0.02)]">
                        <span className="font-mono text-xs w-6 text-right shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                          {r.display_order}
                        </span>
                        <p className="flex-1 font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                          {r.custom_label ?? r.name}
                        </p>
                        {r.is_current && (
                          <span className="font-mono text-xs rounded px-2 py-0.5"
                            style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
                            atual
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {isClassificatory && (
                            <Link href={`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${phase.id}/rodadas/${r.id}`}
                              className="rounded border px-2 py-1 font-mono text-xs"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                              Ver partidas →
                            </Link>
                          )}
                          <button type="button"
                            onClick={() => { setEditingRoundId(r.id); setEditRoundName(r.custom_label ?? r.name); setEditRoundOrder(String(r.display_order)); setEditRoundCurrent(r.is_current ?? false); }}
                            className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            <Pencil size={11} />
                          </button>
                          <button type="button" onClick={() => handleDeleteRound(r.id)}
                            className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}