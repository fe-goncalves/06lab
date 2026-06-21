// APROVAÇÕES / CLIENT COMPONENT

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Check, X, Users, FileText, Shield, ClipboardCheck } from "lucide-react";
import { aprovarInscricoes, rejeitarInscricoes, aprovarRelatorio, rejeitarRelatorio, decidirSolicitacaoRepresentante } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import RepRequestDetailModal from "./rep-request-detail-modal";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import { LabCheckbox } from "@/app/(lab)/components/lab-checkbox";
import type { RepRosterRequest } from "./admin-roster-rpc-errors";
import { isNewMemberRequestType } from "@/app/(rep)/lib/roster-request-types";
import styles from "@/app/(lab)/components/entity-hub.module.css";

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
  repRequests: RepRosterRequest[];
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

export default function AprovacoesClient({
  rosterGroups: initialGroups,
  reports: initialReports,
  repRequests: initialRepRequests,
}: Props) {
  const [groups, setGroups] = useState<RosterGroup[]>(initialGroups);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [repRequests, setRepRequests] = useState<RepRosterRequest[]>(initialRepRequests);
  const [activeTab, setActiveTab] = useState<"atletas" | "comissao" | "relatorios" | "representantes">("atletas");

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

  const [detailRequest, setDetailRequest] = useState<RepRosterRequest | null>(null);
  const [quickRejectId, setQuickRejectId] = useState<string | null>(null);
  const [quickRejectNote, setQuickRejectNote] = useState("");

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

  // ── Solicitações de representantes ─────────────────────────────────────────

  function removeRepRequest(id: string) {
    setRepRequests(prev => prev.filter(r => r.id !== id));
  }

  function handleQuickAprovarRep(req: RepRosterRequest) {
    if (isNewMemberRequestType(req.requestType)) {
      setDetailRequest(req);
      return;
    }
    if (!confirm(`Aprovar solicitação de ${req.typeLabel.toLowerCase()} para ${req.personName}?`)) return;
    void (async () => {
      setProcessing(true);
      const result = await decidirSolicitacaoRepresentante({
        requestId: req.id,
        decision: "approved",
      });
      setProcessing(false);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Solicitação aprovada.");
      removeRepRequest(req.id);
    })();
  }

  async function handleQuickRejeitarRep() {
    if (!quickRejectId) return;
    setProcessing(true);
    const result = await decidirSolicitacaoRepresentante({
      requestId: quickRejectId,
      decision: "rejected",
      decisionNote: quickRejectNote.trim() || null,
    });
    setProcessing(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Solicitação rejeitada.");
    removeRepRequest(quickRejectId);
    setQuickRejectId(null);
    setQuickRejectNote("");
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

  const totalPending = groups.reduce((acc, g) => acc + g.entries.length, 0) + reports.length + repRequests.length;

  const TABS = [
    { key: "atletas" as const, label: "ATLETAS", count: totalAthletes },
    { key: "comissao" as const, label: "COMISSÃO", count: totalStaff },
    { key: "relatorios" as const, label: "RELATÓRIOS", count: reports.length },
    { key: "representantes" as const, label: "REPRESENTANTES", count: repRequests.length },
  ];

  const tabSubtitle: Record<typeof activeTab, string> = {
    atletas: "Inscrições de atletas aguardando validação.",
    comissao: "Inscrições de comissão técnica aguardando validação.",
    relatorios: "Relatórios de partida enviados por relatores.",
    representantes: "Solicitações enviadas pelos representantes de equipe.",
  };

  // ── Estado vazio ───────────────────────────────────────────────────────────

  const isEmpty = groups.length === 0 && reports.length === 0 && repRequests.length === 0;

  const tabsHeader = (
    <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
      <div className={styles.headerGlow} />
      <div className={styles.headerSurface} />
      <div className={styles.headerInner}>
        <div className={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            >
              {tab.label}
              {tab.count > 0 && <span className={styles.tabBadge}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isEmpty) {
    return (
      <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.adminHub} ${styles.aprovacoesHub} ${styles.adminHubTabs}`}>
        {tabsHeader}
        <div className={`${styles.content} ${styles.hubListContent}`}>
          <main className={styles.hallMain}>
            <h2 className={styles.hallCategoryTitle}>Aprovações</h2>
            <p className={styles.sectionSubtitle}>Nenhum item aguardando validação no momento.</p>
            <div className={styles.listPanelEmpty}>
              <ClipboardCheck size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>Tudo em dia</p>
              <p className={styles.newsEmptyDesc}>Nenhum item aguardando aprovação.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const allFilteredIds = filteredGroups.flatMap(g => g.entries.map(e => e.id));
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.adminHub} ${styles.aprovacoesHub} ${styles.adminHubTabs}`}>
      {tabsHeader}

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={styles.hallMain}>
          <h2 className={styles.hallCategoryTitle}>Aprovações</h2>
          <p className={styles.sectionSubtitle}>
            {tabSubtitle[activeTab]} · {totalPending} pendente{totalPending !== 1 ? "s" : ""} no total
          </p>

        {(activeTab === "atletas" || activeTab === "comissao") && (
          <>
            {filteredGroups.length === 0 ? (
              <div className={styles.listPanelEmpty}>
                <Users size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                <p className={styles.listPanelEmptyTitle}>
                  Nenhuma inscrição de {activeTab === "atletas" ? "atleta" : "comissão"} pendente
                </p>
              </div>
            ) : (
              <>
                <div className={styles.adminToolbarBlock}>
                <div className={styles.hubBatchBar}>
                  <LabCheckbox
                    checked={allSelected}
                    onChange={toggleAll}
                    label={
                      <span className={styles.hubBatchBarMeta}>
                        {someSelected ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}` : "Selecionar todos"}
                      </span>
                    }
                  />
                  {someSelected && (
                    <div className={styles.hubBatchBarActions}>
                      <button type="button" onClick={() => void handleAprovar()} disabled={processing} className={styles.hubApproveBtn}>
                        <Check size={12} strokeWidth={2.5} />
                        Aprovar {selected.size > 1 ? `(${selected.size})` : ""}
                      </button>
                      <button type="button" onClick={openRejectModal} disabled={processing} className={styles.hubRejectBtn}>
                        <X size={12} strokeWidth={2.5} />
                        Rejeitar {selected.size > 1 ? `(${selected.size})` : ""}
                      </button>
                    </div>
                  )}
                </div>
                </div>

                <div className={styles.adminListSection}>
                {filteredGroups.map((group) => {
                  const groupIds = group.entries.map((e) => e.id);
                  const allGroupSelected = groupIds.every((id) => selected.has(id));
                  const teamLabel = (group.teamShortName ?? group.teamName).toUpperCase();
                  const logoFallback = (group.teamAbbr ?? group.teamName).slice(0, 2).toUpperCase();

                  return (
                    <div key={group.editionTeamId} className={styles.hubGroupBlock}>
                      <div className={styles.hubGroupHeader}>
                        <LabCheckbox checked={allGroupSelected} onChange={() => toggleGroup(group.entries)} />
                        <div className={styles.hubListTeamLogoMain} title={group.teamShortName ?? group.teamName}>
                          {group.teamLogo ? (
                            <img src={group.teamLogo} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span className={styles.hubListTeamLogoFallback}>{logoFallback}</span>
                          )}
                        </div>
                        <div className={styles.hubGroupHeaderText}>
                          <p className={styles.hubGroupHeaderTitle}>{teamLabel}</p>
                          <p className={styles.hubGroupHeaderMeta}>
                            {group.competitionName} · {group.seasonName}
                          </p>
                        </div>
                        <span className={styles.hubGroupBadge}>
                          {group.entries.length} pendente{group.entries.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
                        {group.entries.map((entry) => {
                          const isSelected = selected.has(entry.id);
                          const displayName = (entry.memberSurname ?? entry.memberName.split(" ")[0]).toUpperCase();

                          return (
                            <div
                              key={entry.id}
                              className={`${styles.athleteListRow} ${isSelected ? styles.hubListRowSelected : ""}`}
                              onClick={() => toggleEntry(entry.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleEntry(entry.id); }}
                            >
                              <div className={styles.athleteListRowInner}>
                                <div className={styles.athleteListRowLink} onClick={(e) => e.stopPropagation()}>
                                  <LabCheckbox checked={isSelected} onChange={() => toggleEntry(entry.id)} />
                                  {entry.memberPhoto ? (
                                    <img src={entry.memberPhoto} alt="" className={styles.athleteListAvatar} />
                                  ) : (
                                    <PersonAvatar size={36} className={styles.athleteListAvatar} />
                                  )}
                                  <div className={styles.athleteListDetails}>
                                    <div className={styles.hubChipRow}>
                                      <p className={styles.athleteListNickname}>{displayName}</p>
                                      {entry.positionAbbr && (
                                        <span className={`${styles.hubChip} ${styles.hubChipBrand}`}>{entry.positionAbbr}</span>
                                      )}
                                      {entry.roleLabel && <span className={styles.hubChip}>{entry.roleLabel}</span>}
                                    </div>
                                    <p className={styles.hubRowMetaPrimary}>{entry.memberName}</p>
                                    {entry.birthDate && (
                                      <span className={styles.hubChip}>{formatDate(entry.birthDate)}</span>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.hubRowMetaCol}>
                                  <span className={styles.hubRowMetaPrimary}>
                                    {entry.submitterType === "admin" ? "Admin" : "Representante"}
                                  </span>
                                  <span className={styles.hubRowMetaSecondary}>{relativeTime(entry.submittedAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "relatorios" && (
          <>
            {reports.length === 0 ? (
              <div className={styles.listPanelEmpty}>
                <FileText size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                <p className={styles.listPanelEmptyTitle}>Nenhum relatório pendente</p>
              </div>
            ) : (
              <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
                {reports.map((r) => (
                  <div key={r.id} className={styles.athleteListRow}>
                    <div className={styles.athleteListRowInner} style={{ alignItems: "flex-start" }}>
                      <div className={styles.athleteListDetails} style={{ flex: 1, minWidth: 0 }}>
                        <p className={styles.athleteListNickname}>
                          {r.teamA} {r.scoreA} × {r.scoreB} {r.teamB}
                        </p>
                        <div className={styles.hubChipRow}>
                          <span className={styles.hubChip}>{r.competitionName}</span>
                          <span className={styles.hubChip}>{r.seasonName}</span>
                          {r.matchDate && (
                            <span className={styles.hubChip}>
                              {new Date(`${r.matchDate}T00:00:00`).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <span className={styles.hubChip}>
                            {r.submitterType === "admin" ? "Admin" : "Relator"}
                          </span>
                        </div>
                        {rejectReportId === r.id && (
                          <div className={styles.hubRejectPanel}>
                            <p className={styles.hubRejectPanelLabel}>Motivo da rejeição</p>
                            <input
                              type="text"
                              placeholder="Descreva o motivo (opcional)"
                              value={reportRejectNote}
                              onChange={(e) => setReportRejectNote(e.target.value)}
                              className={styles.hubEditInlineInput}
                            />
                            <div className={styles.hubRejectPanelActions}>
                              <button type="button" onClick={() => setRejectReportId(null)} className={styles.hubInlineBtn}>
                                Cancelar
                              </button>
                              <button type="button" onClick={() => void handleRejeitarRelatorio()} disabled={processing} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}>
                                {processing ? "Rejeitando…" : "Confirmar"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.hubRowActionsInline}>
                        {r.matchId && (
                          <Link href={`/partidas/${r.matchId}`} className={styles.hubInlineBtn}>Ver</Link>
                        )}
                        <button type="button" onClick={() => void handleAprovarRelatorio(r.id)} disabled={processing} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnBrand}`}>
                          Aprovar
                        </button>
                        <button type="button" onClick={() => { setRejectReportId(r.id); setReportRejectNote(""); }} disabled={processing} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "representantes" && (
          <>
            {repRequests.length === 0 ? (
              <div className={styles.listPanelEmpty}>
                <Shield size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                <p className={styles.listPanelEmptyTitle}>Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
                {repRequests.map((req) => (
                  <div key={req.id} className={styles.athleteListRow}>
                    <div className={styles.athleteListRowInner} style={{ alignItems: "flex-start" }}>
                      <div className={styles.athleteListRowLink}>
                        {req.personPhoto ? (
                          <img src={req.personPhoto} alt="" className={styles.athleteListAvatar} />
                        ) : (
                          <PersonAvatar size={36} className={styles.athleteListAvatar} />
                        )}
                        <div className={styles.athleteListDetails}>
                          <div className={styles.hubChipRow}>
                            <p className={styles.athleteListNickname}>{req.personName.toUpperCase()}</p>
                            <span className={`${styles.hubChip} ${styles.hubChipBrand}`}>{req.typeLabel}</span>
                            {req.requiresCounterparty && (
                              <span className={`${styles.hubChip} ${req.counterpartyApproved ? styles.hubChipBrand : styles.hubChipWarning}`}>
                                {req.counterpartyApproved ? "Contraparte OK" : "Contraparte pendente"}
                              </span>
                            )}
                          </div>
                          <p className={styles.hubRowMetaPrimary}>
                            Rep: {req.repName} · {req.requestingTeamAbbr ?? req.requestingTeamName} · {req.contextLabel}
                          </p>
                          {req.personSubtitle && (
                            <span className={styles.hubChip}>{req.personSubtitle}</span>
                          )}
                          <span className={styles.hubRowMetaSecondary}>{relativeTime(req.createdAt)}</span>
                          {quickRejectId === req.id && (
                            <div className={styles.hubRejectPanel}>
                              <p className={styles.hubRejectPanelLabel}>Motivo da rejeição (opcional)</p>
                              <input
                                type="text"
                                placeholder="Observação…"
                                value={quickRejectNote}
                                onChange={(e) => setQuickRejectNote(e.target.value)}
                                className={styles.hubEditInlineInput}
                              />
                              <div className={styles.hubRejectPanelActions}>
                                <button type="button" onClick={() => setQuickRejectId(null)} className={styles.hubInlineBtn}>
                                  Cancelar
                                </button>
                                <button type="button" onClick={() => void handleQuickRejeitarRep()} disabled={processing} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}>
                                  {processing ? "Rejeitando…" : "Confirmar"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.hubRowActionsInline}>
                        <button type="button" onClick={() => setDetailRequest(req)} disabled={processing} className={styles.hubInlineBtn}>
                          Ver detalhes
                        </button>
                        <button type="button" onClick={() => handleQuickAprovarRep(req)} disabled={processing} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnBrand}`}>
                          Aprovar
                        </button>
                        <button type="button" onClick={() => { setQuickRejectId(req.id); setQuickRejectNote(""); }} disabled={processing} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </main>
      </div>

      {detailRequest && (
        <RepRequestDetailModal
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
          onDecided={removeRepRequest}
        />
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border shadow-xl" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
              <h2 className={styles.hallCategoryTitle} style={{ fontSize: 16 }}>
                Rejeitar {selected.size} inscrição{selected.size > 1 ? "ões" : ""}
              </h2>
              <button type="button" onClick={() => setShowRejectModal(false)} className={styles.hubIconActionBtn}>
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className={styles.hubRejectPanelLabel}>Selecione o motivo:</p>
              <div className="space-y-2">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className={`${styles.hubInlineBtn} w-full justify-start`}
                    style={{
                      borderColor: rejectReason === reason ? "var(--color-brand)" : undefined,
                      backgroundColor: rejectReason === reason ? "var(--color-brand-hover-bg)" : undefined,
                      color: rejectReason === reason ? "var(--color-brand)" : undefined,
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              {rejectReason === "Outro motivo" && (
                <input
                  type="text"
                  placeholder="Descreva o motivo…"
                  value={rejectCustom}
                  onChange={(e) => setRejectCustom(e.target.value)}
                  className={styles.hubEditInlineInput}
                />
              )}
            </div>
            <div className={`${styles.hubRejectPanelActions} px-5 py-4 border-t`} style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setShowRejectModal(false)} className={styles.hubInlineBtn}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleRejeitar()} disabled={processing || !rejectReason} className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}>
                {processing ? "Rejeitando…" : "Confirmar rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}