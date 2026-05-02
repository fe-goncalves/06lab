// APROVAÇÕES / CLIENT COMPONENT

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ChevronRight, Users, FileText } from "lucide-react";
import { aprovarInscricoes, rejeitarInscricoes, aprovarRelatorio, rejeitarRelatorio } from "./actions";
import { toast } from "@/app/(lab)/components/toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type RosterEntry = {
  id: string;
  memberType: string;
  memberName: string;
  memberSurname: string | null;
  memberPhoto: string | null;
  positionAbbr: string | null;
  positionFull: string | null;
  roleLabel: string | null;
  birthDate: string | null;
  submitterType: string;
  submittedAt: string;
};

type RosterGroup = {
  competitionId: string;
  competitionName: string;
  editionId: string;
  seasonName: string;
  editionTeamId: string;
  teamId: string;
  teamName: string;
  teamShortName: string | null;
  teamAbbr: string | null;
  teamLogo: string | null;
  teamColor: string | null;
  entries: RosterEntry[];
};

type Report = {
  id: string;
  matchId: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  matchDate: string | null;
  competitionName: string;
  seasonName: string;
  submitterType: string;
  submittedAt: string;
};

type Props = {
  rosterGroups: RosterGroup[];
  reports: Report[];
};

// ─── Motivos de rejeição prontos ──────────────────────────────────────────────

const REJECTION_REASONS = [
  "Documento inválido ou ilegível",
  "Documento não corresponde ao atleta",
  "Atleta fora da faixa etária permitida",
  "Limite de atletas da equipe atingido",
  "Atleta já inscrito em outra equipe nesta edição",
  "Informações cadastrais incompletas",
  "Foto de perfil inadequada ou ausente",
  "Outro motivo",
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AprovacoesClient({ rosterGroups: initialGroups, reports: initialReports }: Props) {
  const [groups, setGroups] = useState<RosterGroup[]>(initialGroups);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [activeTab, setActiveTab] = useState<"atletas" | "comissao" | "relatorios">("atletas");

  // Seleção
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Rejeição
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectCustom, setRejectCustom] = useState("");

  // Processando
  const [processing, setProcessing] = useState(false);

  // Relatório — rejeição individual
  const [rejectReportId, setRejectReportId] = useState<string | null>(null);
  const [reportRejectNote, setReportRejectNote] = useState("");

  // ── Filtra grupos por aba ──────────────────────────────────────────────────

  const filteredGroups = useMemo(() => {
    return groups.map(g => ({
      ...g,
      entries: g.entries.filter(e =>
        activeTab === "atletas" ? e.memberType === "athlete" : e.memberType === "staff"
      ),
    })).filter(g => g.entries.length > 0);
  }, [groups, activeTab]);

  const totalAthletes = useMemo(() =>
    groups.reduce((acc, g) => acc + g.entries.filter(e => e.memberType === "athlete").length, 0),
    [groups]
  );
  const totalStaff = useMemo(() =>
    groups.reduce((acc, g) => acc + g.entries.filter(e => e.memberType === "staff").length, 0),
    [groups]
  );

  // ── Seleção ────────────────────────────────────────────────────────────────

  function toggleEntry(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGroup(entries: RosterEntry[]) {
    const ids = entries.map(e => e.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) { ids.forEach(id => next.delete(id)); }
      else { ids.forEach(id => next.add(id)); }
      return next;
    });
  }

  function toggleAll() {
    const allIds = filteredGroups.flatMap(g => g.entries.map(e => e.id));
    const allSelected = allIds.every(id => selected.has(id));
    if (allSelected) { setSelected(new Set()); }
    else { setSelected(new Set(allIds)); }
  }

  // ── Aprovar lote ───────────────────────────────────────────────────────────

  async function handleAprovar() {
    if (selected.size === 0) return;
    setProcessing(true);
    const ids = Array.from(selected);
    const result = await aprovarInscricoes(ids);
    setProcessing(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", `${result.count} inscrição${result.count > 1 ? "ões" : ""} aprovada${result.count > 1 ? "s" : ""}.`);
    setGroups(prev => prev.map(g => ({
      ...g,
      entries: g.entries.filter(e => !ids.includes(e.id)),
    })).filter(g => g.entries.length > 0));
    setSelected(new Set());
  }

  // ── Rejeitar lote ──────────────────────────────────────────────────────────

  function openRejectModal() {
    if (selected.size === 0) return;
    setRejectReason("");
    setRejectCustom("");
    setShowRejectModal(true);
  }

  async function handleRejeitar() {
    const ids = Array.from(selected);
    const finalReason = rejectReason === "Outro motivo" ? rejectCustom : rejectReason;
    setProcessing(true);
    const result = await rejeitarInscricoes(ids, finalReason);
    setProcessing(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", `${result.count} inscrição${result.count > 1 ? "ões" : ""} rejeitada${result.count > 1 ? "s" : ""}.`);
    setGroups(prev => prev.map(g => ({
      ...g,
      entries: g.entries.filter(e => !ids.includes(e.id)),
    })).filter(g => g.entries.length > 0));
    setSelected(new Set());
    setShowRejectModal(false);
  }

  // ── Relatórios ─────────────────────────────────────────────────────────────

  async function handleAprovarRelatorio(id: string) {
    setProcessing(true);
    const result = await aprovarRelatorio(id);
    setProcessing(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Relatório aprovado.");
    setReports(prev => prev.filter(r => r.id !== id));
  }

  async function handleRejeitarRelatorio() {
    if (!rejectReportId) return;
    setProcessing(true);
    const result = await rejeitarRelatorio(rejectReportId, reportRejectNote);
    setProcessing(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Relatório rejeitado.");
    setReports(prev => prev.filter(r => r.id !== rejectReportId));
    setRejectReportId(null);
    setReportRejectNote("");
  }

  // ── Formatação ─────────────────────────────────────────────────────────────

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return iso; }
  }

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `há ${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
  }

  // ── Estado vazio ───────────────────────────────────────────────────────────

  const isEmpty = groups.length === 0 && reports.length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center rounded-xl border px-6 py-16 text-center"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div>
          <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Tudo em dia</p>
          <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhum item aguardando aprovação.
          </p>
        </div>
      </div>
    );
  }

  const allFilteredIds = filteredGroups.flatMap(g => g.entries.map(e => e.id));
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Abas principais */}
      <div className="flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
        {[
          { key: "atletas", label: "ATLETAS", count: totalAthletes, icon: <Users size={13} strokeWidth={2.5} /> },
          { key: "comissao", label: "COMISSÃO", count: totalStaff, icon: <Users size={13} strokeWidth={2.5} /> },
          { key: "relatorios", label: "RELATÓRIOS", count: reports.length, icon: <FileText size={13} strokeWidth={2.5} /> },
        ].map(tab => (
          <button key={tab.key} type="button"
            onClick={() => { setActiveTab(tab.key as any); setSelected(new Set()); }}
            className="flex items-center gap-2 border-b-2 pb-3 font-mono text-xs transition-colors"
            style={{
              borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent",
              color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6",
            }}>
            {tab.label}
            {tab.count > 0 && (
              <span className="rounded-full px-1.5 py-0.5 font-mono text-xs"
                style={{
                  backgroundColor: activeTab === tab.key ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                  color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6",
                }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ABA ATLETAS / COMISSÃO ── */}
      {(activeTab === "atletas" || activeTab === "comissao") && (
        <div>
          {filteredGroups.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border px-6 py-12 text-center"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Nenhuma inscrição de {activeTab === "atletas" ? "atleta" : "comissão"} pendente.
              </p>
            </div>
          ) : (
            <>
              {/* Barra de ações do lote */}
              <div className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                {/* Checkbox selecionar todos */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={toggleAll}
                    className="flex h-4 w-4 items-center justify-center rounded border transition-colors"
                    style={{
                      borderColor: allSelected ? "var(--color-brand)" : "var(--color-border)",
                      backgroundColor: allSelected ? "var(--color-brand)" : "transparent",
                    }}>
                    {allSelected && <Check size={10} strokeWidth={3} style={{ color: "var(--color-background)" }} />}
                  </button>
                  <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {someSelected ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}` : "Selecionar todos"}
                  </span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {someSelected && (
                    <>
                      <button type="button" onClick={handleAprovar} disabled={processing}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                        <Check size={12} strokeWidth={2.5} />
                        Aprovar {selected.size > 1 ? `(${selected.size})` : ""}
                      </button>
                      <button type="button" onClick={openRejectModal} disabled={processing}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs disabled:opacity-50"
                        style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
                        <X size={12} strokeWidth={2.5} />
                        Rejeitar {selected.size > 1 ? `(${selected.size})` : ""}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Grupos por competição → equipe */}
              <div className="space-y-3">
                {filteredGroups.map(group => {
                  const groupIds = group.entries.map(e => e.id);
                  const allGroupSelected = groupIds.every(id => selected.has(id));
                  const someGroupSelected = groupIds.some(id => selected.has(id));
                  const teamColor = group.teamColor ?? "var(--color-brand)";

                  return (
                    <div key={group.editionTeamId} className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>

                      {/* Cabeçalho do grupo */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                        {/* Checkbox do grupo */}
                        <button type="button" onClick={() => toggleGroup(group.entries)}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                          style={{
                            borderColor: allGroupSelected ? "var(--color-brand)" : someGroupSelected ? "var(--color-brand)" : "var(--color-border)",
                            backgroundColor: allGroupSelected ? "var(--color-brand)" : someGroupSelected ? "rgba(191,242,5,0.2)" : "transparent",
                          }}>
                          {allGroupSelected && <Check size={10} strokeWidth={3} style={{ color: "var(--color-background)" }} />}
                          {someGroupSelected && !allGroupSelected && <div style={{ width: 6, height: 2, backgroundColor: "var(--color-brand)", borderRadius: 1 }} />}
                        </button>

                        {/* Logo da equipe */}
                        {group.teamLogo ? (
                          <img src={group.teamLogo} alt="" className="h-6 w-6 rounded object-contain shrink-0" />
                        ) : (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-xs font-bold"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            {(group.teamAbbr ?? group.teamName).slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                              {group.teamShortName ?? group.teamName}
                            </span>
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>·</span>
                            <span className="font-mono text-xs" style={{ color: teamColor }}>
                              {group.competitionName}
                            </span>
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {group.seasonName}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-xs shrink-0 rounded px-2 py-0.5"
                          style={{ backgroundColor: "rgba(191,242,5,0.1)", color: "var(--color-brand)" }}>
                          {group.entries.length} pendente{group.entries.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Entries do grupo */}
                      {group.entries.map((entry, idx) => {
                        const isSelected = selected.has(entry.id);
                        const displayName = (entry.memberSurname ?? entry.memberName.split(" ")[0]).toUpperCase();

                        return (
                          <div key={entry.id}
                            className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                            style={{
                              borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                              backgroundColor: isSelected ? "rgba(191,242,5,0.04)" : "transparent",
                            }}
                            onClick={() => toggleEntry(entry.id)}>

                            {/* Checkbox */}
                            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                              style={{
                                borderColor: isSelected ? "var(--color-brand)" : "var(--color-border)",
                                backgroundColor: isSelected ? "var(--color-brand)" : "transparent",
                              }}>
                              {isSelected && <Check size={10} strokeWidth={3} style={{ color: "var(--color-background)" }} />}
                            </div>

                            {/* Foto */}
                            {entry.memberPhoto ? (
                              <img src={entry.memberPhoto} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
                                style={{ backgroundColor: `${teamColor}22`, color: teamColor }}>
                                {displayName.slice(0, 2)}
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                                  {displayName}
                                </span>
                                {entry.positionAbbr && (
                                  <span className="font-mono text-xs rounded px-1.5 py-0.5"
                                    style={{ backgroundColor: `${teamColor}22`, color: teamColor, fontSize: 10 }}>
                                    {entry.positionAbbr}
                                  </span>
                                )}
                                {entry.roleLabel && (
                                  <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                    {entry.roleLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                                  {entry.memberName}
                                </span>
                                {entry.birthDate && (
                                  <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
                                    {formatDate(entry.birthDate)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Meta */}
                            <div className="shrink-0 text-right">
                              <span className="font-mono text-xs block" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
                                {entry.submitterType === "admin" ? "Admin" : "Representante"}
                              </span>
                              <span className="font-mono text-xs block" style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}>
                                {relativeTime(entry.submittedAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ABA RELATÓRIOS ── */}
      {activeTab === "relatorios" && (
        <div>
          {reports.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border px-6 py-12 text-center"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Nenhum relatório pendente.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              {reports.map((r, idx) => (
                <div key={r.id} className="px-5 py-4"
                  style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {r.teamA} <span style={{ color: "var(--color-brand)" }}>{r.scoreA} × {r.scoreB}</span> {r.teamB}
                      </p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        {r.competitionName} · {r.seasonName}
                        {r.matchDate ? ` · ${new Date(r.matchDate + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                        <span className="ml-2 opacity-60">· {r.submitterType === "admin" ? "Admin" : "Relator"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.matchId && (
                        <Link href={`/partidas/${r.matchId}`}
                          className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors hover:border-[var(--color-brand)]"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                          onClick={e => e.stopPropagation()}>
                          Ver
                        </Link>
                      )}
                      <button type="button" onClick={() => handleAprovarRelatorio(r.id)} disabled={processing}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs font-medium disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                        Aprovar
                      </button>
                      <button type="button"
                        onClick={() => { setRejectReportId(r.id); setReportRejectNote(""); }}
                        disabled={processing}
                        className="rounded-lg border px-3 py-1.5 font-mono text-xs disabled:opacity-50"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        Rejeitar
                      </button>
                    </div>
                  </div>
                  {/* Campo de motivo inline para o relatório */}
                  {rejectReportId === r.id && (
                    <div className="mt-3 rounded-lg border p-3 space-y-3"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Motivo da rejeição</p>
                      <input type="text" placeholder="Descreva o motivo (opcional)"
                        value={reportRejectNote}
                        onChange={e => setReportRejectNote(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setRejectReportId(null)}
                          className="rounded-lg border px-3 py-1.5 font-mono text-xs"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                          Cancelar
                        </button>
                        <button type="button" onClick={handleRejeitarRelatorio} disabled={processing}
                          className="rounded-lg px-3 py-1.5 font-mono text-xs font-medium disabled:opacity-50"
                          style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
                          {processing ? "Rejeitando…" : "Confirmar"}
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

      {/* ── MODAL DE REJEIÇÃO EM LOTE ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-display text-base" style={{ color: "var(--color-text-primary)" }}>
                Rejeitar {selected.size} inscrição{selected.size > 1 ? "ões" : ""}
              </h2>
              <button type="button" onClick={() => setShowRejectModal(false)}
                style={{ color: "var(--color-text-secondary)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Selecione o motivo:
              </p>
              <div className="space-y-2">
                {REJECTION_REASONS.map(reason => (
                  <button key={reason} type="button"
                    onClick={() => setRejectReason(reason)}
                    className="flex items-center gap-2 w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={{
                      borderColor: rejectReason === reason ? "var(--color-brand)" : "var(--color-border)",
                      backgroundColor: rejectReason === reason ? "rgba(191,242,5,0.06)" : "transparent",
                      color: rejectReason === reason ? "var(--color-brand)" : "var(--color-text-primary)",
                    }}>
                    <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: rejectReason === reason ? "var(--color-brand)" : "var(--color-border)" }}>
                      {rejectReason === reason && (
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-brand)" }} />
                      )}
                    </div>
                    <span className="font-mono text-xs">{reason}</span>
                  </button>
                ))}
              </div>

              {rejectReason === "Outro motivo" && (
                <input type="text" placeholder="Descreva o motivo…"
                  value={rejectCustom}
                  onChange={e => setRejectCustom(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }} />
              )}
            </div>

            <div className="flex gap-2 justify-end border-t px-5 py-4"
              style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setShowRejectModal(false)}
                className="rounded-lg border px-4 py-2 font-mono text-xs"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleRejeitar}
                disabled={processing || !rejectReason}
                className="rounded-lg px-4 py-2 font-mono text-xs font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
                {processing ? "Rejeitando…" : "Confirmar rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}