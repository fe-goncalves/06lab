// fase-client

"use client";

import {
  editarFase, deletarFase, criarRodada, editarRodada, deletarRodada,
  adicionarEquipeFase, removerEquipeFase,
  criarGrupo, editarGrupo, deletarGrupo,
  adicionarEquipeGrupo, removerEquipeGrupo,
  salvarFaseComoTemplate,
  atualizarPartidaLogistica,
  atualizarArbitrosPartida,
} from "../actions";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { gerarSumulasPDF } from "@/lib/pdf/sumula";

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

const STATUS_LABEL: Record<string, { label: string; colors: { bg: string; text: string } }> = {
  scheduled: { label: "Agendada",   colors: { bg: "rgba(166,166,166,0.12)", text: "#A6A6A6" } },
  live:       { label: "Ao vivo",   colors: { bg: "rgba(255,80,80,0.12)",   text: "#FF5050" } },
  finished:   { label: "Encerrada", colors: { bg: "rgba(191,242,5,0.12)",   text: "#BFF205" } },
  postponed:  { label: "Adiada",    colors: { bg: "rgba(255,165,0,0.12)",   text: "#FFA500" } },
  cancelled:  { label: "Cancelada", colors: { bg: "rgba(255,80,80,0.12)",   text: "#FF5050" } },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "—";
  return timeStr.slice(0, 5);
}

interface RefereeEntry {
  referee_id: string;
  referee_role_id: string;
}

interface EditState {
  match_date: string;
  match_time: string;
  venue_id: string;
  refereesList: RefereeEntry[];
  newRefereeId: string;
  newRefereeRoleId: string;
  showReferees: boolean;
}

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

  // ── Partidas ────────────────────────────────────────────────────────────────
  const [partidas, setPartidas] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [referees, setReferees] = useState<any[]>([]);
  const [refereeRoles, setRefereeRoles] = useState<any[]>([]);
  const [loadingPartidas, setLoadingPartidas] = useState(false);
  const [editingMatches, setEditingMatches] = useState<Record<string, EditState>>({});
  const [savingMatches, setSavingMatches] = useState<Set<string>>(new Set());

  // ── Seleção múltipla ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportingPDF, setExportingPDF] = useState(false);
  const [groupAddSelect, setGroupAddSelect] = useState<Record<string, string>>({});

  async function loadPartidas() {
    setLoadingPartidas(true);
    const supabase = createClient();
    const [
      { data: matchesRaw },
      { data: venuesRaw },
      { data: refereesRaw },
      { data: rolesRaw },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(`
          id, phase_id, round_id, match_date, match_time, venue_id,
          status, score_a, score_b,
          team_a:teams!matches_team_a_id_fkey(id, full_name, short_name, abbreviation, logo_url),
          team_b:teams!matches_team_b_id_fkey(id, full_name, short_name, abbreviation, logo_url),
          match_referees(id, referee_id, referee_role_id)
        `)
        .eq("phase_id", phase.id)
        .order("match_date", { ascending: true }),
      supabase.from("venues").select("id, full_name, short_name").order("full_name"),
      supabase.from("referees").select("id, full_name").order("full_name"),
      supabase.from("referee_roles").select("id, full_name").order("full_name"),
    ]);
    setPartidas(matchesRaw ?? []);
    setVenues(venuesRaw ?? []);
    setReferees(refereesRaw ?? []);
    setRefereeRoles(rolesRaw ?? []);
    setLoadingPartidas(false);
  }

  useEffect(() => {
    loadPartidas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.id]);

  // ── Helpers de seleção ──────────────────────────────────────────────────────
  function toggleSelect(matchId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  function toggleSelectGroup(matchIds: string[], allSelected: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) matchIds.forEach(id => next.delete(id));
      else matchIds.forEach(id => next.add(id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleExportarSumulas() {
    if (selectedIds.size === 0) return;
    setExportingPDF(true);
    try {
      const doc = await gerarSumulasPDF(Array.from(selectedIds));
      doc.save(`sumulas-${phase.full_name ?? "fase"}.pdf`);
      toast("success", `${selectedIds.size} súmula${selectedIds.size !== 1 ? "s" : ""} exportada${selectedIds.size !== 1 ? "s" : ""}.`);
      clearSelection();
    } catch (err) {
      toast("error", "Erro ao gerar súmulas. Tente novamente.");
    } finally {
      setExportingPDF(false);
    }
  }

  // ── Edição inline ───────────────────────────────────────────────────────────
  function startEditing(m: any) {
    const existing: RefereeEntry[] = (m.match_referees ?? []).map((mr: any) => ({
      referee_id: mr.referee_id,
      referee_role_id: mr.referee_role_id,
    }));
    setEditingMatches(prev => ({
      ...prev,
      [m.id]: {
        match_date: m.match_date ?? "",
        match_time: m.match_time ? m.match_time.slice(0, 5) : "",
        venue_id: m.venue_id ?? "",
        refereesList: existing,
        newRefereeId: "",
        newRefereeRoleId: "",
        showReferees: false,
      },
    }));
  }

  function cancelEditing(matchId: string) {
    setEditingMatches(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  }

  function updateEditField(matchId: string, fields: Partial<EditState>) {
    setEditingMatches(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], ...fields },
    }));
  }

  function addRefereeToList(matchId: string) {
    const state = editingMatches[matchId];
    if (!state.newRefereeId || !state.newRefereeRoleId) return;
    if (state.refereesList.some(r => r.referee_id === state.newRefereeId)) return;
    updateEditField(matchId, {
      refereesList: [
        ...state.refereesList,
        { referee_id: state.newRefereeId, referee_role_id: state.newRefereeRoleId },
      ],
      newRefereeId: "",
      newRefereeRoleId: "",
    });
  }

  function removeRefereeFromList(matchId: string, refereeId: string) {
    const state = editingMatches[matchId];
    updateEditField(matchId, {
      refereesList: state.refereesList.filter(r => r.referee_id !== refereeId),
    });
  }

  async function saveMatch(matchId: string) {
    const editState = editingMatches[matchId];
    if (!editState) return;
    setSavingMatches(prev => new Set(prev).add(matchId));
    const [logResult, refResult] = await Promise.all([
      atualizarPartidaLogistica(matchId, {
        match_date: editState.match_date || null,
        match_time: editState.match_time || null,
        venue_id: editState.venue_id || null,
      }),
      atualizarArbitrosPartida(matchId, editState.refereesList),
    ]);
    setSavingMatches(prev => {
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });
    if ("error" in logResult) { toast("error", logResult.error); return; }
    if ("error" in refResult) { toast("error", refResult.error); return; }
    setPartidas(prev => prev.map(p =>
      p.id === matchId
        ? {
            ...p,
            match_date: editState.match_date || null,
            match_time: editState.match_time || null,
            venue_id: editState.venue_id || null,
            match_referees: editState.refereesList.map(r => ({
              referee_id: r.referee_id,
              referee_role_id: r.referee_role_id,
            })),
          }
        : p
    ));
    cancelEditing(matchId);
    toast("success", "Partida atualizada.");
  }

  // Informações
  const [fullName, setFullName] = useState(phase.full_name ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(phase.display_order ?? 0));
  const [halfDuration, setHalfDuration] = useState(String(phase.half_duration_minutes ?? ""));
  const [isCurrent, setIsCurrent] = useState(phase.is_current ?? false);
  const [tiebreakerType, setTiebreakerType] = useState(phase.penalty_tiebreaker_type ?? "penalties");
  const [pointsWin, setPointsWin] = useState(String(phase.points_win ?? 3));
  const [pointsDraw, setPointsDraw] = useState(String(phase.points_draw ?? 1));
  const [pointsLoss, setPointsLoss] = useState(String(phase.points_loss ?? 0));
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Rodadas — create
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundCustomLabel, setRoundCustomLabel] = useState("");
  const [roundOrder, setRoundOrder] = useState("");
  const [roundLegs, setRoundLegs] = useState(false);
  const [roundAggregate, setRoundAggregate] = useState(false);
  const [savingRound, setSavingRound] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);

  // Rodadas — edit
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editRoundName, setEditRoundName] = useState("");
  const [editRoundCustomLabel, setEditRoundCustomLabel] = useState("");
  const [editRoundOrder, setEditRoundOrder] = useState("");
  const [editRoundCurrent, setEditRoundCurrent] = useState(false);
  const [editRoundLegs, setEditRoundLegs] = useState(false);
  const [editRoundAggregate, setEditRoundAggregate] = useState(false);

  // Grupos
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmAddTeam, setConfirmAddTeam] = useState<{ id: string; name: string } | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };
  const inputSmClass = "rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const inputSmStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const phaseTeamIds = new Set(phaseTeams.map((pt: any) => pt.edition_team_id));
  const teamsInPhase = editionTeams.filter((et: any) => phaseTeamIds.has(et.id));
  const teamsNotInPhase = editionTeams.filter((et: any) => !phaseTeamIds.has(et.id));

  // ── Agrupamento ─────────────────────────────────────────────────────────────
  const partidasAgrupadas: { roundId: string | null; roundLabel: string; displayOrder: number; matches: any[] }[] = [];
  const roundMap = new Map(rounds.map((r: any) => [r.id, r]));
  const grouped = new Map<string | null, any[]>();
  for (const m of partidas) {
    const key = m.round_id ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }
  for (const [roundId, matches] of grouped.entries()) {
    if (roundId === null) continue;
    const round = roundMap.get(roundId);
    const label = round ? (round.custom_label ?? round.name) : "Rodada desconhecida";
    const order = round ? round.display_order : 9999;
    const sorted = [...matches].sort((a, b) => {
      const da = a.match_date ?? "9999-99-99";
      const db = b.match_date ?? "9999-99-99";
      if (da !== db) return da.localeCompare(db);
      return (a.match_time ?? "").localeCompare(b.match_time ?? "");
    });
    partidasAgrupadas.push({ roundId, roundLabel: label, displayOrder: order, matches: sorted });
  }
  partidasAgrupadas.sort((a, b) => a.displayOrder - b.displayOrder);
  if (grouped.has(null)) {
    const semRodada = [...(grouped.get(null) ?? [])].sort((a, b) => {
      const da = a.match_date ?? "9999-99-99";
      const db = b.match_date ?? "9999-99-99";
      if (da !== db) return da.localeCompare(db);
      return (a.match_time ?? "").localeCompare(b.match_time ?? "");
    });
    partidasAgrupadas.push({ roundId: null, roundLabel: "Sem rodada", displayOrder: 99999, matches: semRodada });
  }

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("custom_label", "");
    fd.append("phase_type", phase.phase_type);
    fd.append("display_order", displayOrder);
    fd.append("half_duration_minutes", halfDuration);
    fd.append("is_current", String(isCurrent));
    if (isKnockout || isConference) fd.append("penalty_tiebreaker_type", tiebreakerType);
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
    if (!roundName.trim()) { setRoundError("Tipo é obrigatório."); return; }
    setRoundError(null); setSavingRound(true);
    const fd = new FormData();
    fd.append("name", roundName.trim());
    fd.append("custom_label", roundCustomLabel.trim());
    fd.append("display_order", roundOrder || String(rounds.length + 1));
    fd.append("legs", String(roundLegs));
    fd.append("aggregate_score", String(roundAggregate));
    const result = await criarRodada(phase.id, fd);
    setSavingRound(false);
    if ("error" in result) { setRoundError(result.error); return; }
    setRounds(prev => [...prev, {
      id: result.id, name: roundName.trim(),
      custom_label: roundCustomLabel.trim() || null,
      display_order: Number(roundOrder || rounds.length + 1),
      is_current: false, legs: roundLegs, aggregate_score: roundAggregate,
    }]);
    setShowRoundForm(false);
    setRoundName(""); setRoundCustomLabel(""); setRoundOrder("");
    setRoundLegs(false); setRoundAggregate(false);
  }

  async function handleUpdateRound(roundId: string) {
    const fd = new FormData();
    fd.append("name", editRoundName.trim());
    fd.append("custom_label", editRoundCustomLabel.trim());
    fd.append("display_order", editRoundOrder);
    fd.append("is_current", String(editRoundCurrent));
    fd.append("legs", String(editRoundLegs));
    fd.append("aggregate_score", String(editRoundAggregate));
    const result = await editarRodada(roundId, fd);
    if ("error" in result) { toast("error", result.error); return; }
    setRounds(prev => prev.map(r => r.id === roundId
      ? { ...r, name: editRoundName.trim(), custom_label: editRoundCustomLabel.trim() || null, display_order: Number(editRoundOrder), is_current: editRoundCurrent, legs: editRoundLegs, aggregate_score: editRoundAggregate }
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
    if ("deactivated" in result && result.deactivated) {
      toast("success", "Equipe desativada. Ela possui partidas nesta fase e não pôde ser removida completamente.");
      setPhaseTeams(prev => prev.map((pt: any) =>
        pt.edition_team_id === editionTeamId ? { ...pt, is_active: false } : pt
      ));
      return;
    }
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
            { label: seasonName, href: `/competicoes/${competitionId}?edicao=${edicaoId}&aba=competicao&comp=fases` },
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
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Configurações de ida/volta e placar agregado são definidas por rodada.</p>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo de desempate final</span>
                    <LabSelect value={tiebreakerType} onChange={setTiebreakerType} options={[
                      { value: "penalties", label: "Pênaltis" },
                      { value: "shootouts", label: "Shoot-outs" },
                    ]} />
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
          <div className="max-w-2xl space-y-6">
            {teamsInPhase.length > 0 && (
              <div>
                <h2 className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Na fase ({teamsInPhase.length})</h2>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  {teamsInPhase.map((et: any, idx: number) => (
                    <div key={et.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-[rgba(255,255,255,0.02)]"
                      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                      {et.teams?.logo_url && <img src={et.teams.logo_url} alt="" className="h-7 w-7 rounded object-contain" />}
                      <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{et.teams?.full_name ?? "Equipe"}</span>
                      {phaseTeams.find((pt: any) => pt.edition_team_id === et.id)?.is_active === false && (
                        <span className="font-mono text-xs rounded px-2 py-0.5" style={{ backgroundColor: "rgba(255,80,80,0.1)", color: "var(--color-danger)" }}>inativa</span>
                      )}
                      <button type="button" onClick={() => handleRemoveTeamFromPhase(et.id)} disabled={processing === et.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded border px-1.5 py-1 disabled:opacity-50"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {teamsNotInPhase.length > 0 && (
              <div>
                <h2 className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Disponíveis para adicionar</h2>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  {teamsNotInPhase.map((et: any, idx: number) => (
                    <div key={et.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-[rgba(255,255,255,0.02)]"
                      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                      {et.teams?.logo_url && <img src={et.teams.logo_url} alt="" className="h-7 w-7 rounded object-contain" />}
                      <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{et.teams?.full_name ?? "Equipe"}</span>
                      <button type="button"
                        onClick={() => setConfirmAddTeam({ id: et.id, name: et.teams?.full_name ?? "Equipe" })}
                        disabled={processing === et.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded border px-2 py-1 text-xs disabled:opacity-50"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        <Plus size={11} /> Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editionTeams.length === 0 && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe inscrita nesta edição.</p>}
          </div>
        )}

        {/* GRUPOS / CONFERÊNCIAS */}
        {activeTab === "grupos" && hasGroups && (
          <div className="max-w-2xl space-y-6">
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowGroupForm(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                <Plus size={14} /> {isConference ? "Nova conferência" : "Novo grupo"}
              </button>
            </div>
            {showGroupForm && (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nome</span>
                  <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                    placeholder={isConference ? "Ex: Conferência Leste" : "Ex: Grupo A"}
                    className={inputClass} style={inputStyle} autoFocus />
                </label>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowGroupForm(false); setGroupName(""); }}
                    className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Cancelar</button>
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
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>{isConference ? "Sem conferências" : "Sem grupos"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.sort((a, b) => a.display_order - b.display_order).map((g: any) => {
                  const memberIds = new Set(groupTeams.filter((gt: any) => gt.group_id === g.id).map((gt: any) => gt.edition_team_id));
                  const members = editionTeams.filter((et: any) => memberIds.has(et.id));
                  const available = editionTeams.filter((et: any) => !memberIds.has(et.id));
                  return (
                    <div key={g.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                        {editingGroupId === g.id ? (
                          <>
                            <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className={inputClass + " flex-1"} style={inputStyle} autoFocus />
                            <button type="button" onClick={() => handleUpdateGroup(g.id)} className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}><Check size={12} /></button>
                            <button type="button" onClick={() => setEditingGroupId(null)} className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}><X size={12} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{g.name}</span>
                            <button type="button" onClick={() => { setEditingGroupId(g.id); setEditGroupName(g.name); }} className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}><Pencil size={11} /></button>
                            <button type="button" onClick={() => handleDeleteGroup(g.id)} className="rounded border px-1.5 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}><Trash2 size={11} /></button>
                          </>
                        )}
                      </div>
                      {members.map((et: any, idx: number) => (
                        <div key={et.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-[rgba(255,255,255,0.02)]"
                          style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                          {et.teams?.logo_url && <img src={et.teams.logo_url} alt="" className="h-6 w-6 rounded object-contain" />}
                          <span className="flex-1 text-sm" style={{ color: "var(--color-text-primary)" }}>{et.teams?.full_name}</span>
                          <button type="button" onClick={() => handleRemoveTeamFromGroup(g.id, et.id)} disabled={processing === `${g.id}-${et.id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded border px-1.5 py-1 disabled:opacity-50"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}><X size={11} /></button>
                        </div>
                      ))}
                      {available.length > 0 && (
                        <div className="px-4 py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                          <LabSelect
                            value={groupAddSelect[g.id] ?? ""}
                            onChange={(v) => {
                              if (v) {
                                handleAddTeamToGroup(g.id, v);
                                setGroupAddSelect((prev) => ({ ...prev, [g.id]: "" }));
                              } else {
                                setGroupAddSelect((prev) => ({ ...prev, [g.id]: v }));
                              }
                            }}
                            placeholder="+ Adicionar equipe ao grupo"
                            options={available.map((et: any) => ({
                              value: et.id,
                              label: et.teams?.full_name ?? et.id,
                            }))}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RODADAS */}
        {activeTab === "rodadas" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex justify-end">
              <button type="button" onClick={() => { setRoundOrder(String(rounds.length + 1)); setShowRoundForm(true); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                <Plus size={14} /> {hasMatchups ? "Novo estágio" : "Nova rodada"}
              </button>
            </div>
            {roundError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{roundError}</p>}
            {showRoundForm && (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{hasMatchups ? "Tipo" : "Nome"}</span>
                    {hasMatchups ? (
                      <LabSelect value={roundName} onChange={setRoundName} autoFocus placeholder="Selecione…"
                        options={KNOCKOUT_ROUND_LABELS.map((l) => ({ value: l, label: l }))} />
                    ) : (
                      <input type="text" value={roundName} onChange={e => setRoundName(e.target.value)} placeholder="Ex: Rodada 1" className={inputClass} style={inputStyle} autoFocus />
                    )}
                  </label>
                  {hasMatchups && (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Apelido</span>
                      <input type="text" value={roundCustomLabel} onChange={e => setRoundCustomLabel(e.target.value)} placeholder="Ex: ROUND OF 16" className={inputClass} style={inputStyle} />
                    </label>
                  )}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{hasMatchups ? "Ordem" : "Ordem de exibição"}</span>
                  <input type="number" min={1} value={roundOrder} onChange={e => setRoundOrder(e.target.value)} placeholder="Ordem de exibição" className={inputClass} style={inputStyle} />
                </label>
                {hasMatchups && (
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={roundLegs} onChange={e => { setRoundLegs(e.target.checked); if (!e.target.checked) setRoundAggregate(false); }} className="h-3 w-3" />
                      <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Ida e volta</span>
                    </label>
                    {roundLegs && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={roundAggregate} onChange={e => setRoundAggregate(e.target.checked)} className="h-3 w-3" />
                        <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Placar agregado</span>
                      </label>
                    )}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowRoundForm(false); setRoundName(""); setRoundCustomLabel(""); setRoundOrder(""); setRoundLegs(false); setRoundAggregate(false); }}
                    className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Cancelar</button>
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
                  {hasMatchups ? "Adicione os estágios: Final, Semifinal, Quartas de Final…" : "Crie a primeira rodada para começar."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                {rounds.sort((a, b) => a.display_order - b.display_order).map((r: any, idx: number) => (
                  <div key={r.id} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {editingRoundId === r.id ? (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{hasMatchups ? "Tipo" : "Nome"}</span>
                            {hasMatchups ? (
                              <LabSelect value={editRoundName} onChange={setEditRoundName} autoFocus
                                options={KNOCKOUT_ROUND_LABELS.map((l) => ({ value: l, label: l }))} />
                            ) : (
                              <input type="text" value={editRoundName} onChange={e => setEditRoundName(e.target.value)} className={inputClass} style={inputStyle} autoFocus />
                            )}
                          </label>
                          {hasMatchups && (
                            <label className="flex flex-col gap-1">
                              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Apelido</span>
                              <input type="text" value={editRoundCustomLabel} onChange={e => setEditRoundCustomLabel(e.target.value)} placeholder="Ex: ROUND OF 16" className={inputClass} style={inputStyle} />
                            </label>
                          )}
                        </div>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{hasMatchups ? "Ordem" : "Ordem de exibição"}</span>
                          <input type="number" min={1} value={editRoundOrder} onChange={e => setEditRoundOrder(e.target.value)} className={inputClass} style={inputStyle} />
                        </label>
                        {hasMatchups && (
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={editRoundLegs} onChange={e => { setEditRoundLegs(e.target.checked); if (!e.target.checked) setEditRoundAggregate(false); }} className="h-3 w-3" />
                              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Ida e volta</span>
                            </label>
                            {editRoundLegs && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editRoundAggregate} onChange={e => setEditRoundAggregate(e.target.checked)} className="h-3 w-3" />
                                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Placar agregado</span>
                              </label>
                            )}
                          </div>
                        )}
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={editRoundCurrent} onChange={e => setEditRoundCurrent(e.target.checked)} className="h-3 w-3" />
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Rodada atual</span>
                        </label>
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setEditingRoundId(null)}
                            className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Cancelar</button>
                          <button type="button" onClick={() => handleUpdateRound(r.id)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium"
                            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-5 py-3 group hover:bg-[rgba(255,255,255,0.02)]">
                        <span className="font-mono text-xs w-6 text-right shrink-0" style={{ color: "var(--color-text-secondary)" }}>{r.display_order}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{r.custom_label ?? r.name}</p>
                          {hasMatchups && (r.legs || r.aggregate_score) && (
                            <p className="font-mono text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                              {r.legs ? "Ida e volta" : ""}{r.legs && r.aggregate_score ? " · " : ""}{r.aggregate_score ? "Agregado" : ""}
                            </p>
                          )}
                        </div>
                        {r.is_current && (
                          <span className="font-mono text-xs rounded px-2 py-0.5" style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>atual</span>
                        )}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button type="button"
                            onClick={() => { setEditingRoundId(r.id); setEditRoundName(r.name); setEditRoundCustomLabel(r.custom_label ?? ""); setEditRoundOrder(String(r.display_order)); setEditRoundCurrent(r.is_current ?? false); setEditRoundLegs(r.legs ?? false); setEditRoundAggregate(r.aggregate_score ?? false); }}
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

      {/* Modal de confirmação — adicionar equipe à fase */}
      {confirmAddTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmAddTeam(null); }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="px-5 py-5">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Confirmar adição</p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Adicionar <strong style={{ color: "var(--color-text-primary)" }}>{confirmAddTeam.name}</strong> a esta fase?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setConfirmAddTeam(null)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button"
                onClick={async () => {
                  const t = confirmAddTeam;
                  setConfirmAddTeam(null);
                  await handleAddTeamToPhase(t.id);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
