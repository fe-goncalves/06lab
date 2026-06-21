"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { LabCheckbox } from "@/app/(lab)/components/lab-checkbox";
import {
  fieldLabelStyle,
  inputBaseStyle,
  modalCloseButtonStyle,
  modalHeaderDividerStyle,
  modalOverlayStyle,
  modalPanelStyle,
  primaryDangerButtonStyle,
  secondaryButtonStyle,
} from "@/lib/lab-ui-styles";
import {
  type FreePeriodRecord,
  type StintRecord,
  type StintTeam,
  addDay,
  applyDateMask,
  buildTimelineItems,
  formatDateToBR,
  formatFreeRange,
  formatStintRange,
  getNextStintForFreePeriod,
  getPrevStintForFreePeriod,
  isCurrentStint,
  parseDateToISO,
  parsePastFreePeriodId,
  teamShortLabel,
  validateFreePeriodRemoval,
  validateStintPeriod,
  validateStintDeletion,
  validateTransferDate,
} from "./stint-timeline-utils";

const inputStyle: React.CSSProperties = inputBaseStyle;

const labelStyle: React.CSSProperties = {
  ...fieldLabelStyle,
  display: "block",
  marginBottom: 6,
};

function ModalShell({
  title,
  accentColor,
  onClose,
  children,
}: {
  title: string;
  accentColor: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div
        style={{ ...modalPanelStyle, maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "16px 20px",
          ...modalHeaderDividerStyle,
          background: `linear-gradient(135deg, ${accentColor}14 0%, transparent 60%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--color-text-primary)", margin: 0,
          }}>
            {title}
          </p>
          <button type="button" onClick={onClose} style={{
            ...modalCloseButtonStyle, cursor: "pointer",
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TeamLogo({ url, label, size = 28 }: { url: string | null; label: string; size?: number }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      backgroundColor: "var(--color-surface-raised)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)" }}>
        {label.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

function ConfirmDeleteModal({
  teamLabel,
  dateRange,
  accentColor,
  saving,
  error,
  onClose,
  onConfirm,
  title = "Excluir vínculo",
  promptVerb = "Remover",
}: {
  teamLabel: string;
  dateRange: string;
  accentColor: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  promptVerb?: string;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "var(--color-modal-scrim-heavy)", padding: 16,
      }}
      onClick={saving ? undefined : onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 400,
          borderRadius: 16,
          border: "1px solid var(--color-danger-muted-border)",
          backgroundColor: "var(--color-modal-bg)",
          overflow: "hidden",
          boxShadow: "var(--color-modal-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "18px 20px",
          borderBottom: "1px solid var(--color-divider-strong)",
          background: "linear-gradient(135deg, var(--color-danger-muted-bg) 0%, transparent 60%)",
        }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--color-danger)", margin: 0, marginBottom: 6,
          }}>
            {title}
          </p>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
            color: "var(--color-text-primary)", margin: 0, lineHeight: 1.35,
          }}>
            {promptVerb} {teamLabel}?
          </p>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-icon-muted)", margin: "6px 0 0",
          }}>
            {dateRange}
          </p>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-text-subtle)", margin: 0, lineHeight: 1.6,
          }}>
            Esta ação é permanente. O registro será removido da linha do tempo; inscrições e estatísticas de competições não são afetadas.
          </p>
          {error && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)", margin: "12px 0 0" }}>{error}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 20px 18px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-input-border-strong)", background: "none", color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={saving}
            style={{ ...primaryDangerButtonStyle, backgroundColor: saving ? "var(--color-danger-disabled-bg)" : "var(--color-danger)", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  stints: StintRecord[];
  teams: StintTeam[];
  accentColor: string;
  onEditStint: (
    stintId: string,
    data: {
      startedAt: string;
      endedAt: string | null;
      isCurrent: boolean;
      isActive: boolean;
      hideFreeAfter?: boolean;
    },
  ) => Promise<{ error?: string }>;
  onTransfer: (
    startedAt: string,
    teamId: string | null,
    leaveFree: boolean,
  ) => Promise<{ error?: string }>;
  onDeleteStint: (stintId: string) => Promise<{ error?: string }>;
};

export function StintTimelinePanel({ stints, teams, accentColor, onEditStint, onTransfer, onDeleteStint }: Props) {
  const timelineItems = useMemo(() => buildTimelineItems(stints), [stints]);

  const [editStint, setEditStint] = useState<StintRecord | null>(null);
  const [editStarted, setEditStarted] = useState("");
  const [editEnded, setEditEnded] = useState("");
  const [editIsCurrent, setEditIsCurrent] = useState(false);
  const [editHidden, setEditHidden] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDate, setTransferDate] = useState("");
  const [transferTeamId, setTransferTeamId] = useState("");
  const [leaveFree, setLeaveFree] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [savingTransfer, setSavingTransfer] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingStint, setDeletingStint] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editFree, setEditFree] = useState<FreePeriodRecord | null>(null);
  const [editFreeStart, setEditFreeStart] = useState("");
  const [editFreeEnd, setEditFreeEnd] = useState("");
  const [editFreeHidden, setEditFreeHidden] = useState(false);
  const [editFreeError, setEditFreeError] = useState<string | null>(null);
  const [savingFreeEdit, setSavingFreeEdit] = useState(false);
  const [deleteFreeConfirmOpen, setDeleteFreeConfirmOpen] = useState(false);
  const [deletingFree, setDeletingFree] = useState(false);
  const [deleteFreeError, setDeleteFreeError] = useState<string | null>(null);

  const deleteFreeBlockReason = editFree ? validateFreePeriodRemoval(stints, editFree) : null;
  const canDeleteFree = editFree ? !deleteFreeBlockReason : false;

  const deleteBlockReason = editStint ? validateStintDeletion(stints, editStint.id) : null;
  const canDelete = editStint ? !deleteBlockReason : false;

  const canMarkCurrent = editStint
    ? !validateStintPeriod(
        stints,
        editStint.id,
        parseDateToISO(editStarted) ?? "",
        editEnded ? parseDateToISO(editEnded) : null,
        true,
      )
    : false;

  function openEdit(stint: StintRecord) {
    setEditStint(stint);
    setEditStarted(formatDateToBR(stint.started_at));
    setEditEnded(formatDateToBR(stint.ended_at));
    setEditIsCurrent(isCurrentStint(stint));
    setEditHidden(stint.is_active === false);
    setEditError(null);
  }

  function openTransfer() {
    setTransferOpen(true);
    setTransferDate(formatDateToBR(new Date().toISOString().slice(0, 10)));
    setTransferTeamId("");
    setLeaveFree(false);
    setTeamSearch("");
    setTransferError(null);
  }

  function openEditFree(free: FreePeriodRecord) {
    setEditFree(free);
    setEditFreeStart(formatDateToBR(free.started_at));
    setEditFreeEnd(free.ended_at ? formatDateToBR(free.ended_at) : "");
    setEditFreeHidden(free.isHidden);
    setEditFreeError(null);
  }

  async function handleSaveFreeEdit() {
    if (!editFree) return;

    if (editFree.isCurrent) {
      const prev = getPrevStintForFreePeriod(editFree, stints);
      if (!prev) {
        setEditFreeError("Vínculo anterior não encontrado.");
        return;
      }

      const newFreeStart = parseDateToISO(editFreeStart);
      if (!newFreeStart) {
        setEditFreeError("Informe início válido (DD/MM/AAAA).");
        return;
      }
      if (newFreeStart <= prev.started_at) {
        setEditFreeError("O início do período sem clube deve ser após o início do vínculo anterior.");
        return;
      }

      const errPrev = validateStintPeriod(stints, prev.id, prev.started_at, newFreeStart, false);
      if (errPrev) { setEditFreeError(errPrev); return; }

      setSavingFreeEdit(true);
      setEditFreeError(null);

      const result = await onEditStint(prev.id, {
        startedAt: prev.started_at,
        endedAt: newFreeStart,
        isCurrent: false,
        isActive: prev.is_active !== false,
        hideFreeAfter: editFreeHidden,
      });
      setSavingFreeEdit(false);
      if (result.error) { setEditFreeError(result.error); return; }
      setEditFree(null);
      return;
    }

    const ids = parsePastFreePeriodId(editFree.id);
    if (!ids) return;

    const prev = stints.find((s) => s.id === ids.prevId);
    const next = stints.find((s) => s.id === ids.nextId);
    if (!prev || !next) {
      setEditFreeError("Vínculos adjacentes não encontrados.");
      return;
    }

    const newFreeStart = parseDateToISO(editFreeStart);
    const newFreeEnd = parseDateToISO(editFreeEnd);
    if (!newFreeStart || !newFreeEnd) {
      setEditFreeError("Informe início e fim válidos (DD/MM/AAAA).");
      return;
    }
    if (newFreeStart > newFreeEnd) {
      setEditFreeError("A data de fim não pode ser anterior ao início.");
      return;
    }
    if (newFreeStart <= prev.started_at) {
      setEditFreeError("O início do período sem clube deve ser após o início do vínculo anterior.");
      return;
    }

    const newPrevEnd = newFreeStart;
    const newNextStart = addDay(newFreeEnd);
    const nextIsCurrent = isCurrentStint(next);

    const errPrev = validateStintPeriod(stints, prev.id, prev.started_at, newPrevEnd, false);
    if (errPrev) { setEditFreeError(errPrev); return; }

    const errNext = validateStintPeriod(
      stints,
      next.id,
      newNextStart,
      nextIsCurrent ? null : next.ended_at,
      nextIsCurrent,
    );
    if (errNext) { setEditFreeError(errNext); return; }

    setSavingFreeEdit(true);
    setEditFreeError(null);

    const prevResult = await onEditStint(prev.id, {
      startedAt: prev.started_at,
      endedAt: newPrevEnd,
      isCurrent: false,
      isActive: prev.is_active !== false,
      hideFreeAfter: editFreeHidden,
    });
    if (prevResult.error) {
      setEditFreeError(prevResult.error);
      setSavingFreeEdit(false);
      return;
    }

    const nextResult = await onEditStint(next.id, {
      startedAt: newNextStart,
      endedAt: nextIsCurrent ? null : next.ended_at,
      isCurrent: nextIsCurrent,
      isActive: next.is_active !== false,
    });
    setSavingFreeEdit(false);
    if (nextResult.error) {
      setEditFreeError(nextResult.error);
      return;
    }

    setEditFree(null);
  }

  async function handleConfirmDeleteFree() {
    if (!editFree) return;
    const prev = getPrevStintForFreePeriod(editFree, stints);
    const next = getNextStintForFreePeriod(editFree, stints);
    if (!prev || !next || !prev.ended_at) {
      setDeleteFreeError("Vínculos adjacentes não encontrados.");
      return;
    }

    setDeletingFree(true);
    setDeleteFreeError(null);

    const nextIsCurrent = isCurrentStint(next);
    const nextResult = await onEditStint(next.id, {
      startedAt: prev.ended_at,
      endedAt: nextIsCurrent ? null : next.ended_at,
      isCurrent: nextIsCurrent,
      isActive: next.is_active !== false,
    });
    if (nextResult.error) {
      setDeleteFreeError(nextResult.error);
      setDeletingFree(false);
      return;
    }

    if (prev.hide_free_after) {
      await onEditStint(prev.id, {
        startedAt: prev.started_at,
        endedAt: prev.ended_at,
        isCurrent: false,
        isActive: prev.is_active !== false,
        hideFreeAfter: false,
      });
    }

    setDeletingFree(false);
    setDeleteFreeConfirmOpen(false);
    setEditFree(null);
  }

  const filteredTeams = teams.filter((t) => {
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return t.full_name.toLowerCase().includes(q) || (t.short_name?.toLowerCase().includes(q) ?? false);
  });

  async function handleSaveEdit() {
    if (!editStint) return;
    const started = parseDateToISO(editStarted);
    const ended = editEnded ? parseDateToISO(editEnded) : null;
    if (!started) { setEditError("Data de início inválida."); return; }
    if (editEnded && !ended) { setEditError("Data de fim inválida."); return; }
    const err = validateStintPeriod(stints, editStint.id, started, ended, editIsCurrent);
    if (err) { setEditError(err); return; }
    setSavingEdit(true);
    const result = await onEditStint(editStint.id, {
      startedAt: started,
      endedAt: editIsCurrent ? null : ended,
      isCurrent: editIsCurrent,
      isActive: !editHidden,
    });
    setSavingEdit(false);
    if (result.error) { setEditError(result.error); return; }
    setEditStint(null);
  }

  async function handleConfirmTransfer() {
    const started = parseDateToISO(transferDate);
    if (!started) { setTransferError("Data inválida."); return; }
    if (!leaveFree && !transferTeamId) { setTransferError("Selecione uma equipe ou marque sem clube."); return; }
    const err = validateTransferDate(stints, started, leaveFree);
    if (err) { setTransferError(err); return; }
    setSavingTransfer(true);
    const result = await onTransfer(started, leaveFree ? null : transferTeamId, leaveFree);
    setSavingTransfer(false);
    if (result.error) { setTransferError(result.error); return; }
    setTransferOpen(false);
  }

  async function handleConfirmDelete() {
    if (!editStint) return;
    setDeletingStint(true);
    setDeleteError(null);
    const result = await onDeleteStint(editStint.id);
    setDeletingStint(false);
    if (result.error) { setDeleteError(result.error); return; }
    setDeleteConfirmOpen(false);
    setEditStint(null);
  }

  function renderFreeRow(free: FreePeriodRecord, isFirst: boolean) {
    return (
      <div
        key={free.id}
        role="button"
        tabIndex={0}
        onClick={() => openEditFree(free)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEditFree(free); } }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 18px",
          borderTop: !isFirst ? "1px solid var(--color-divider-strong)" : "none",
          backgroundColor: free.isCurrent ? "var(--color-hover-bg-subtle)" : "transparent",
          opacity: free.isHidden ? 0.4 : 1,
          cursor: "pointer",
          transition: "background-color 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-hover-bg-subtle)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = free.isCurrent ? "var(--color-hover-bg-subtle)" : "transparent"; }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          border: "1px dashed var(--color-dashed-border)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-hint)" }}>—</span>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
          color: "var(--color-text-primary)", flex: 1, minWidth: 0,
          letterSpacing: "0.04em",
        }}>
          SEM CLUBE
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--color-text-muted)", flexShrink: 0,
        }}>
          {formatFreeRange(free)}
        </span>
        {free.isCurrent && (
          <button
            type="button"
            title="Transferir para equipe"
            onClick={(e) => { e.stopPropagation(); setEditFree(null); openTransfer(); }}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${accentColor}44`,
              backgroundColor: `${accentColor}10`,
              color: accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeftRight size={15} strokeWidth={2.2} />
          </button>
        )}
      </div>
    );
  }

  function renderRow(stint: StintRecord, isFirst: boolean) {
    const current = isCurrentStint(stint);
    return (
      <div
        key={stint.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 18px",
          borderTop: !isFirst ? "1px solid var(--color-divider-strong)" : "none",
          opacity: stint.is_active !== false ? 1 : 0.4,
          cursor: "pointer",
          transition: "background-color 0.12s",
        }}
        onClick={() => openEdit(stint)}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-hover-bg-subtle)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <TeamLogo url={stint.teams?.logo_url ?? null} label={teamShortLabel(stint)} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
          color: "var(--color-text-primary)", flex: 1, minWidth: 0,
          letterSpacing: "0.04em",
        }}>
          {teamShortLabel(stint)}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--color-text-muted)", flexShrink: 0,
        }}>
          {formatStintRange(stint)}
        </span>
        {current && (
          <button
            type="button"
            title="Transferir ou encerrar vínculo"
            onClick={(e) => { e.stopPropagation(); openTransfer(); }}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${accentColor}44`,
              backgroundColor: `${accentColor}10`,
              color: accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeftRight size={15} strokeWidth={2.2} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{
        borderRadius: 14,
        border: "1px solid var(--color-input-border)",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-divider-strong)" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.16em", textTransform: "uppercase", color: accentColor,
          }}>
            Linha do tempo
          </span>
        </div>

        {timelineItems.length === 0 ? (
          <p style={{ padding: "20px 18px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-hint)", margin: 0 }}>
            Nenhum vínculo registrado.
          </p>
        ) : (
          timelineItems.map((item, idx) => {
            if (item.kind === "free") return renderFreeRow(item.free, idx === 0);
            return renderRow(item.stint, idx === 0);
          })
        )}
      </div>

      {editStint && (
        <ModalShell title="Editar vínculo" accentColor={accentColor} onClose={() => !savingEdit && setEditStint(null)}>
          <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TeamLogo url={editStint.teams?.logo_url ?? null} label={teamShortLabel(editStint)} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {teamShortLabel(editStint)}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={labelStyle}>Início</span>
                <input type="text" placeholder="DD/MM/AAAA" value={editStarted}
                  onChange={(e) => setEditStarted(applyDateMask(e.target.value))}
                  maxLength={10} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Fim</span>
                <input type="text" placeholder="DD/MM/AAAA" value={editEnded}
                  disabled={editIsCurrent}
                  onChange={(e) => setEditEnded(applyDateMask(e.target.value))}
                  maxLength={10} style={{ ...inputStyle, opacity: editIsCurrent ? 0.45 : 1 }} />
              </div>
            </div>
            <LabCheckbox
              checked={editIsCurrent}
              disabled={!canMarkCurrent}
              accentColor={accentColor}
              onChange={(checked) => {
                setEditIsCurrent(checked);
                if (checked) setEditEnded("");
              }}
              label="Vínculo atual"
            />
            {!canMarkCurrent && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)", margin: "-6px 0 0", paddingLeft: 28 }}>
                Só pode ser atual com a data de início mais recente e sem conflito de períodos.
              </p>
            )}
            <LabCheckbox
              checked={editHidden}
              accentColor={accentColor}
              onChange={setEditHidden}
              label="Ocultar na linha do tempo"
            />
            {editError && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)", margin: 0 }}>{editError}</p>
            )}
            {!canDelete && deleteBlockReason && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)", margin: 0 }}>
                {deleteBlockReason}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!canDelete || savingEdit}
                onClick={() => { setDeleteError(null); setDeleteConfirmOpen(true); }}
                style={{
                  padding: "9px 14px", borderRadius: 8,
                  border: `1px solid ${canDelete ? "var(--color-danger-muted-border)" : "var(--color-input-border)"}`,
                  background: canDelete ? "var(--color-danger-muted-bg)" : "transparent",
                  color: canDelete ? "var(--color-danger)" : "var(--color-text-hint)",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  cursor: !canDelete || savingEdit ? "not-allowed" : "pointer",
                  opacity: savingEdit ? 0.6 : 1,
                }}
              >
                Excluir vínculo
              </button>
              <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setEditStint(null)} disabled={savingEdit}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-input-border-strong)", background: "none", color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={savingEdit}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", backgroundColor: savingEdit ? "var(--color-brand-muted-bg)" : accentColor, color: "var(--color-on-brand)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, cursor: savingEdit ? "not-allowed" : "pointer" }}>
                {savingEdit ? "Salvando…" : "Salvar alterações"}
              </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {editFree && (
        <ModalShell title="Editar período sem clube" accentColor={accentColor} onClose={() => !savingFreeEdit && setEditFree(null)}>
          <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                border: "1px dashed var(--color-dashed-border)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-hint)" }}>—</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                SEM CLUBE
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
              {editFree.isCurrent
                ? "Ajuste a data de início do período atual ou transfira para uma equipe."
                : "Ajuste as datas do intervalo sem vínculo. O fim do vínculo anterior e o início do próximo serão atualizados."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={labelStyle}>Início</span>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={editFreeStart}
                  onChange={(e) => setEditFreeStart(applyDateMask(e.target.value))}
                  maxLength={10}
                  style={inputStyle}
                />
              </div>
              <div>
                <span style={labelStyle}>Fim</span>
                <input
                  type="text"
                  placeholder={editFree.isCurrent ? "atual" : "DD/MM/AAAA"}
                  value={editFree.isCurrent ? "atual" : editFreeEnd}
                  disabled={editFree.isCurrent}
                  onChange={(e) => setEditFreeEnd(applyDateMask(e.target.value))}
                  maxLength={10}
                  style={{ ...inputStyle, opacity: editFree.isCurrent ? 0.45 : 1 }}
                />
              </div>
            </div>
            <LabCheckbox
              checked={editFreeHidden}
              accentColor={accentColor}
              onChange={setEditFreeHidden}
              label="Ocultar na linha do tempo"
            />
            {editFreeError && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)", margin: 0 }}>{editFreeError}</p>
            )}
            {!canDeleteFree && deleteFreeBlockReason && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)", margin: 0 }}>
                {deleteFreeBlockReason}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!canDeleteFree || savingFreeEdit}
                onClick={() => { setDeleteFreeError(null); setDeleteFreeConfirmOpen(true); }}
                style={{
                  padding: "9px 14px", borderRadius: 8,
                  border: `1px solid ${canDeleteFree ? "var(--color-danger-muted-border)" : "var(--color-input-border)"}`,
                  background: canDeleteFree ? "var(--color-danger-muted-bg)" : "transparent",
                  color: canDeleteFree ? "var(--color-danger)" : "var(--color-text-hint)",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  cursor: !canDeleteFree || savingFreeEdit ? "not-allowed" : "pointer",
                  opacity: savingFreeEdit ? 0.6 : 1,
                }}
              >
                Excluir período
              </button>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {editFree.isCurrent && (
                  <button
                    type="button"
                    onClick={() => { setEditFree(null); openTransfer(); }}
                    disabled={savingFreeEdit}
                    style={{ ...secondaryButtonStyle, cursor: savingFreeEdit ? "not-allowed" : "pointer" }}
                  >
                    Transferir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditFree(null)}
                  disabled={savingFreeEdit}
                  style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-input-border-strong)", background: "none", color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveFreeEdit()}
                  disabled={savingFreeEdit}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "none", backgroundColor: savingFreeEdit ? "var(--color-brand-muted-bg)" : accentColor, color: "var(--color-on-brand)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, cursor: savingFreeEdit ? "not-allowed" : "pointer" }}
                >
                  {savingFreeEdit ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {transferOpen && (
        <ModalShell title="Transferência" accentColor={accentColor} onClose={() => !savingTransfer && setTransferOpen(false)}>
          <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={labelStyle}>Data da movimentação</span>
              <input type="text" placeholder="DD/MM/AAAA" value={transferDate}
                onChange={(e) => setTransferDate(applyDateMask(e.target.value))}
                maxLength={10} style={inputStyle} />
            </div>

            <div style={{
              borderRadius: 10,
              border: "1px solid var(--color-input-border)",
              overflow: "hidden",
              opacity: leaveFree ? 0.45 : 1,
              pointerEvents: leaveFree ? "none" : "auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--color-divider-strong)" }}>
                <Search size={14} style={{ color: "var(--color-text-faint)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Buscar equipe…"
                  style={{
                    flex: 1, border: "none", background: "transparent", outline: "none",
                    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)",
                  }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {filteredTeams.length === 0 ? (
                  <p style={{ padding: 12, margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)" }}>
                    Nenhuma equipe encontrada.
                  </p>
                ) : (
                  filteredTeams.map((team) => {
                    const selected = transferTeamId === team.id;
                    const short = (team.short_name ?? team.full_name).toUpperCase();
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => { setTransferTeamId(team.id); setLeaveFree(false); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", border: "none",
                          borderBottom: "1px solid var(--color-divider)",
                          backgroundColor: selected ? `${accentColor}12` : "transparent",
                          color: selected ? accentColor : "var(--color-text-primary)",
                          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: selected ? 800 : 600,
                          cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <TeamLogo url={team.logo_url} label={short} size={24} />
                        <span>{short}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <LabCheckbox
              checked={leaveFree}
              accentColor={accentColor}
              align="start"
              onChange={(checked) => {
                setLeaveFree(checked);
                if (checked) setTransferTeamId("");
              }}
              label="Deixar sem equipe atual (livre para entrar em outro time)"
            />

            {transferError && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)", margin: 0 }}>{transferError}</p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setTransferOpen(false)} disabled={savingTransfer}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-input-border-strong)", background: "none", color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmTransfer} disabled={savingTransfer}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", backgroundColor: savingTransfer ? "var(--color-brand-muted-bg)" : accentColor, color: "var(--color-on-brand)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, cursor: savingTransfer ? "not-allowed" : "pointer" }}>
                {savingTransfer ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {deleteConfirmOpen && editStint && (
        <ConfirmDeleteModal
          teamLabel={teamShortLabel(editStint)}
          dateRange={formatStintRange(editStint)}
          accentColor={accentColor}
          saving={deletingStint}
          error={deleteError}
          onClose={() => { if (!deletingStint) { setDeleteConfirmOpen(false); setDeleteError(null); } }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {deleteFreeConfirmOpen && editFree && (
        <ConfirmDeleteModal
          teamLabel="SEM CLUBE"
          dateRange={formatFreeRange(editFree)}
          accentColor={accentColor}
          saving={deletingFree}
          error={deleteFreeError}
          title="Excluir período sem clube"
          promptVerb="Remover"
          onClose={() => { if (!deletingFree) { setDeleteFreeConfirmOpen(false); setDeleteFreeError(null); } }}
          onConfirm={() => void handleConfirmDeleteFree()}
        />
      )}
    </>
  );
}
