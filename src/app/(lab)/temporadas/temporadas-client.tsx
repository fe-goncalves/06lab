"use client";

import { useState, useEffect, useMemo } from "react";
import { criarAno, editarAno, deletarAno, criarTemporada, editarTemporada, deletarTemporada } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { compareSeasons } from "@/lib/seasons-order";
import { CalendarDays, Plus, Pencil, Trash2, Check, X, Settings2 } from "lucide-react";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Year = { id: string; value: number };
type Season = {
  id: string; name: string; year_id: string;
  display_order: number; starts_at: string | null;
  ends_at: string | null; is_current: boolean;
};
type Props = { years: Year[]; seasons: Season[] };

function formatSeasonDate(iso: string | null): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
  letterSpacing: "0.12em", textTransform: "uppercase",
  color: "var(--color-text-faint)", display: "block", marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid var(--color-input-border)",
  backgroundColor: "var(--color-input-bg)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-mono)", fontSize: 12,
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.12s",
};

function focusBrand(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "var(--color-brand)";
}
function blurBrand(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "var(--color-input-border)";
}

// ─── Modal compartilhado (header + body + footer) ─────────────────────────────

function ModalShell({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "var(--color-modal-scrim)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, borderRadius: 16, border: "1px solid var(--color-input-border-strong)", backgroundColor: "var(--color-modal-bg)", overflow: "hidden", boxShadow: "var(--color-modal-shadow)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-divider-strong)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand)", margin: 0 }}>{title}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", margin: 0, marginTop: 2 }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--color-input-border-strong)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-icon-muted)", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--color-divider-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-icon-muted)"; }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--color-hover-bg)", flexShrink: 0 }}>{footer}</div>
      </div>
    </div>
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid var(--color-input-border-strong)", backgroundColor: "transparent", color: "var(--color-icon-muted)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
      Cancelar
    </button>
  );
}

function ConfirmBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: disabled ? "var(--color-brand-muted-bg)" : "var(--color-brand)", color: "var(--color-on-brand)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
      {label}
    </button>
  );
}

// ─── Modal de Ano (criar) ─────────────────────────────────────────────────────

function YearModal({ onClose, onSave }: { onClose: () => void; onSave: (value: number) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const n = parseInt(value);
    if (!n || n < 2000 || n > 2100) { toast("error", "Ano inválido. Use um valor entre 2000 e 2100."); return; }
    setSaving(true);
    await onSave(n);
    setSaving(false);
  }

  return (
    <ModalShell title="Novo ano" subtitle="Adiciona um ano ao calendário da organização" onClose={onClose}
      footer={<><CancelBtn onClick={onClose} /><ConfirmBtn onClick={handleSubmit} disabled={saving || !value.trim()} label={saving ? "Adicionando…" : "Adicionar ano"} /></>}>
      <div>
        <span style={fieldLabel}>Ano *</span>
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="2027" min={2000} max={2100} autoFocus
          style={inputStyle} onFocus={focusBrand} onBlur={blurBrand} />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", marginTop: 8, marginBottom: 0 }}>
          Você poderá criar temporadas dentro dele após adicionar.
        </p>
      </div>
    </ModalShell>
  );
}

// ─── Modal de Ano (editar) ────────────────────────────────────────────────────

function EditYearModal({ year, onClose, onSave }: { year: Year; onClose: () => void; onSave: (id: string, value: number) => Promise<void> }) {
  const [value, setValue] = useState(String(year.value));
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const n = parseInt(value);
    if (!n || n < 2000 || n > 2100) { toast("error", "Ano inválido. Use um valor entre 2000 e 2100."); return; }
    setSaving(true);
    await onSave(year.id, n);
    setSaving(false);
  }

  return (
    <ModalShell title="Editar ano" subtitle={`Alterando o ano ${year.value}`} onClose={onClose}
      footer={<><CancelBtn onClick={onClose} /><ConfirmBtn onClick={handleSubmit} disabled={saving || !value.trim()} label={saving ? "Salvando…" : "Salvar alterações"} /></>}>
      <div>
        <span style={fieldLabel}>Ano *</span>
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          min={2000} max={2100} autoFocus
          style={inputStyle} onFocus={focusBrand} onBlur={blurBrand} />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", marginTop: 8, marginBottom: 0 }}>
          Alterar o valor do ano não afeta as temporadas vinculadas a ele.
        </p>
      </div>
    </ModalShell>
  );
}

// ─── Modal de Temporada ────────────────────────────────────────────────────────

function SeasonModal({ mode, years, seasons, initial, defaultYearId, onClose, onSave }: {
  mode: "create" | "edit";
  years: Year[];
  seasons: Season[];
  initial?: Season;
  defaultYearId?: string;
  onClose: () => void;
  onSave: (data: { name: string; yearId: string; displayOrder: number; startsAt: string; endsAt: string; isCurrent: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [yearId, setYearId] = useState(initial?.year_id ?? defaultYearId ?? years[0]?.id ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(initial?.display_order ?? 0));
  const [startsAt, setStartsAt] = useState(initial?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(initial?.ends_at ?? "");
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "create" || initial) return;
    const inYear = seasons.filter((s) => s.year_id === yearId);
    const next = inYear.length === 0 ? 1 : Math.max(...inYear.map((s) => s.display_order)) + 1;
    setDisplayOrder(String(next));
  }, [mode, initial, yearId, seasons]);

  async function handleSubmit() {
    if (!name.trim()) { toast("error", "Nome é obrigatório."); return; }
    if (!yearId) { toast("error", "Ano é obrigatório."); return; }
    const order = Number(displayOrder);
    if (!Number.isFinite(order)) { toast("error", "Ordem de exibição inválida."); return; }
    setSaving(true);
    await onSave({ name, yearId, displayOrder: Math.round(order), startsAt, endsAt, isCurrent });
    setSaving(false);
  }

  const title = mode === "create" ? "Nova temporada" : "Editar temporada";
  const btnLabel = saving ? (mode === "create" ? "Criando…" : "Salvando…") : (mode === "create" ? "Criar temporada" : "Salvar alterações");

  return (
    <ModalShell title={title} subtitle="Período global da organização" onClose={onClose}
      footer={<><CancelBtn onClick={onClose} /><ConfirmBtn onClick={handleSubmit} disabled={saving || years.length === 0 || !name.trim()} label={btnLabel} /></>}>

      <div>
        <span style={fieldLabel}>Nome *</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: 2026 I" autoFocus style={inputStyle} onFocus={focusBrand} onBlur={blurBrand} />
      </div>

      <div>
        <span style={fieldLabel}>Ano *</span>
        {years.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--color-input-border)", backgroundColor: "var(--color-input-bg)" }}>
            Nenhum ano cadastrado — adicione um ano primeiro.
          </p>
        ) : (
          <LabSelect value={yearId} onChange={setYearId}
            options={years.map((y) => ({ value: y.id, label: String(y.value) }))} />
        )}
      </div>

      <div>
        <span style={fieldLabel}>Ordem de exibição</span>
        <input
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          min={0}
          style={{ ...inputStyle, width: 120 }}
          onFocus={focusBrand}
          onBlur={blurBrand}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <span style={fieldLabel}>Início</span>
          <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={{ ...inputStyle,  }} onFocus={focusBrand} onBlur={blurBrand} />
        </div>
        <div>
          <span style={fieldLabel}>Fim</span>
          <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={{ ...inputStyle,  }} onFocus={focusBrand} onBlur={blurBrand} />
        </div>
      </div>

      <div>
        <span style={fieldLabel}>Status</span>
        <div onClick={() => setIsCurrent(v => !v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${isCurrent ? "var(--color-brand)" : "var(--color-input-border)"}`, backgroundColor: isCurrent ? "var(--color-brand-hover-bg)" : "var(--color-hover-bg-subtle)", transition: "all 0.15s" }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${isCurrent ? "var(--color-brand)" : "var(--color-text-ghost)"}`, backgroundColor: isCurrent ? "var(--color-brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
            {isCurrent && <Check size={10} strokeWidth={3} color="#0a0a0a" />}
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: isCurrent ? "var(--color-brand)" : "var(--color-text-primary)", margin: 0 }}>Temporada atual</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-hint)", margin: 0, marginTop: 2 }}>Marca como a temporada em vigor. Apenas uma pode ser a atual.</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Modal gerenciar anos ─────────────────────────────────────────────────────

function YearsManageModal({
  years,
  seasons,
  onClose,
  onAddYear,
  onEditYear,
  onDeleteYear,
}: {
  years: Year[];
  seasons: Season[];
  onClose: () => void;
  onAddYear: () => void;
  onEditYear: (year: Year) => void;
  onDeleteYear: (id: string) => Promise<void>;
}) {
  const sorted = years.slice().sort((a, b) => b.value - a.value);

  return (
    <ModalShell
      title="Gerenciar anos"
      subtitle="Adicione, edite ou remova anos do calendário"
      onClose={onClose}
      footer={
        <>
          <CancelBtn onClick={onClose} />
          <ConfirmBtn onClick={onAddYear} disabled={false} label="Novo ano" />
        </>
      }
    >
      {sorted.length === 0 ? (
        <p className={styles.loadingMono}>Nenhum ano cadastrado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((year) => {
            const count = seasons.filter((s) => s.year_id === year.id).length;
            return (
              <div
                key={year.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--hub-glass-border)",
                  background: "var(--hub-input-bg)",
                }}
              >
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, flex: 1 }}>
                  {year.value}
                </span>
                <span className={styles.hubChip}>{count} temp.</span>
                <button type="button" onClick={() => onEditYear(year)} className={styles.hubIconActionBtn} aria-label="Editar ano">
                  <Pencil size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteYear(year.id)}
                  disabled={count > 0}
                  className={`${styles.hubIconActionBtn} ${styles.hubIconActionBtnDanger}`}
                  aria-label="Remover ano"
                  title={count > 0 ? "Remova as temporadas antes" : "Remover ano"}
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function TemporadasClient({ years: initialYears, seasons: initialSeasons }: Props) {
  const [years, setYears] = useState(initialYears);
  const [seasons, setSeasons] = useState(initialSeasons);
  const [activeYearTab, setActiveYearTab] = useState<"all" | string>("all");
  const [showYearsManage, setShowYearsManage] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDefaultYearId, setCreateDefaultYearId] = useState<string | undefined>();
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedYears = years.slice().sort((a, b) => b.value - a.value);

  const visibleSeasons = seasons
    .filter((s) => activeYearTab === "all" || s.year_id === activeYearTab)
    .sort(compareSeasons);

  const yearValueById = useMemo(() => Object.fromEntries(years.map((y) => [y.id, y.value])), [years]);

  async function handleAddYear(value: number) {
    const result = await criarAno(value);
    if ("error" in result) { toast("error", result.error); return; }
    setYears(prev => [{ id: result.id, value }, ...prev].sort((a, b) => b.value - a.value));
    setShowYearModal(false);
    setActiveYearTab(result.id);
    toast("success", "Ano " + value + " adicionado.");
  }

  async function handleEditYear(id: string, value: number) {
    const result = await editarAno(id, value);
    if ("error" in result) { toast("error", result.error); return; }
    setYears(prev => prev.map(y => y.id === id ? { ...y, value } : y).sort((a, b) => b.value - a.value));
    setEditingYear(null);
    toast("success", "Ano atualizado.");
  }

  async function handleDeleteYear(id: string) {
    if (!confirm("Remover este ano do calendário?")) return;
    const result = await deletarAno(id);
    if ("error" in result) { toast("error", result.error); return; }
    setYears((prev) => prev.filter((y) => y.id !== id));
    if (activeYearTab === id) setActiveYearTab("all");
    toast("success", "Ano removido.");
  }

  function openCreateSeason() {
    setCreateDefaultYearId(activeYearTab === "all" ? undefined : activeYearTab);
    setShowCreateModal(true);
  }

  async function handleCreateSeason(data: { name: string; yearId: string; displayOrder: number; startsAt: string; endsAt: string; isCurrent: boolean }) {
    const fd = new FormData();
    fd.append("name", data.name.trim());
    fd.append("year_id", data.yearId);
    fd.append("display_order", String(data.displayOrder));
    fd.append("starts_at", data.startsAt);
    fd.append("ends_at", data.endsAt);
    fd.append("is_current", String(data.isCurrent));
    const result = await criarTemporada(fd);
    if ("error" in result) { toast("error", result.error); return; }
    const newSeason: Season = { id: result.id, name: data.name.trim(), year_id: data.yearId, display_order: data.displayOrder, starts_at: data.startsAt || null, ends_at: data.endsAt || null, is_current: data.isCurrent };
    setSeasons(prev => {
      const updated = data.isCurrent ? prev.map(s => ({ ...s, is_current: false })) : prev;
      return [...updated, newSeason].sort(compareSeasons);
    });
    setShowCreateModal(false);
    toast("success", "Temporada criada.");
  }

  async function handleEditSeason(data: { name: string; yearId: string; displayOrder: number; startsAt: string; endsAt: string; isCurrent: boolean }) {
    if (!editingSeason) return;
    const fd = new FormData();
    fd.append("name", data.name.trim());
    fd.append("display_order", String(data.displayOrder));
    fd.append("starts_at", data.startsAt);
    fd.append("ends_at", data.endsAt);
    fd.append("is_current", String(data.isCurrent));
    const result = await editarTemporada(editingSeason.id, fd);
    if ("error" in result) { toast("error", result.error); return; }
    setSeasons(prev => prev.map(s => {
      if (s.id === editingSeason.id) return { ...s, name: data.name.trim(), display_order: data.displayOrder, starts_at: data.startsAt || null, ends_at: data.endsAt || null, is_current: data.isCurrent };
      if (data.isCurrent) return { ...s, is_current: false };
      return s;
    }).sort(compareSeasons));
    setEditingSeason(null);
    toast("success", "Temporada atualizada.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta temporada? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    const result = await deletarTemporada(id);
    setDeletingId(null);
    if ("error" in result) { toast("error", result.error); return; }
    setSeasons(prev => prev.filter(s => s.id !== id));
    toast("success", "Temporada removida.");
  }

  const activeYearValue = activeYearTab === "all" ? null : yearValueById[activeYearTab];

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.adminHub} ${styles.adminHubTabs}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.hallHeaderRow}>
            <div className={styles.tabBar}>
              <button
                type="button"
                onClick={() => setActiveYearTab("all")}
                className={`${styles.tab} ${activeYearTab === "all" ? styles.tabActive : ""}`}
              >
                TODAS
                <span className={styles.tabBadge}>{seasons.length}</span>
              </button>
              {sortedYears.map((year) => {
                const count = seasons.filter((s) => s.year_id === year.id).length;
                return (
                  <button
                    key={year.id}
                    type="button"
                    onClick={() => setActiveYearTab(year.id)}
                    className={`${styles.tab} ${activeYearTab === year.id ? styles.tabActive : ""}`}
                  >
                    {year.value}
                    <span className={styles.tabBadge}>{count}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowYearsManage(true)}
              className={styles.hallRecalcBtn}
            >
              <Settings2 size={14} />
              GERENCIAR ANOS
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={styles.hallMain}>
          <div className={styles.rankingsTitleRow}>
            <div>
              <h2 className={styles.hallCategoryTitle}>Temporadas</h2>
              <p className={styles.sectionSubtitle}>
                {activeYearTab === "all"
                  ? `Todos os períodos · ${seasons.length} ${seasons.length === 1 ? "temporada" : "temporadas"}`
                  : `Ano ${activeYearValue} · ${visibleSeasons.length} ${visibleSeasons.length === 1 ? "temporada" : "temporadas"}`}
              </p>
            </div>
            <div className={styles.rankingsTitleActions}>
              <button
                type="button"
                onClick={openCreateSeason}
                disabled={years.length === 0}
                className={styles.saveBtn}
              >
                <Plus size={13} strokeWidth={2.5} />
                Nova temporada
              </button>
            </div>
          </div>

          {years.length === 0 ? (
            <div className={`${styles.listPanelEmpty} ${styles.adminListSection}`}>
              <CalendarDays size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>Nenhum ano cadastrado</p>
              <p className={styles.newsEmptyDesc}>
                Adicione um ano pelo botão &quot;Gerenciar anos&quot; para depois criar temporadas.
              </p>
              <button
                type="button"
                onClick={() => setShowYearsManage(true)}
                className={styles.saveBtn}
                style={{ marginTop: 16 }}
              >
                <Settings2 size={13} strokeWidth={2.5} />
                Gerenciar anos
              </button>
            </div>
          ) : (
            <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
              {visibleSeasons.length === 0 ? (
                <div className={styles.listPanelEmpty}>
                  <CalendarDays size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                  <p className={styles.listPanelEmptyTitle}>
                    {activeYearTab === "all" ? "Nenhuma temporada" : `Nenhuma temporada em ${activeYearValue}`}
                  </p>
                  <p className={styles.newsEmptyDesc}>
                    Crie uma temporada para este período.
                  </p>
                  <button type="button" onClick={openCreateSeason} className={styles.saveBtn} style={{ marginTop: 16 }}>
                    <Plus size={13} strokeWidth={2.5} />
                    Nova temporada
                  </button>
                </div>
              ) : (
                visibleSeasons.map((season) => (
                  <div key={season.id} className={styles.athleteListRow}>
                    <div className={styles.athleteListRowInner}>
                      <div className={styles.athleteListRowLink}>
                        <span className={styles.seasonYearAvatar} aria-hidden>
                          {yearValueById[season.year_id]}
                        </span>
                        <div className={styles.athleteListDetails}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <p className={styles.athleteListNickname}>{season.name.toUpperCase()}</p>
                            {season.is_current && (
                              <span className={`${styles.hubChip} ${styles.hubChipBrand}`}>ATUAL</span>
                            )}
                          </div>
                          {(season.starts_at || season.ends_at) && (
                            <div className={styles.hubChipRow}>
                              <span className={styles.hubChip}>
                                {formatSeasonDate(season.starts_at)} → {formatSeasonDate(season.ends_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.hubRowActionsHover}>
                        <button type="button" onClick={() => setEditingSeason(season)} className={styles.hubIconActionBtn} aria-label="Editar temporada">
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(season.id)}
                          disabled={deletingId === season.id}
                          className={`${styles.hubIconActionBtn} ${styles.hubIconActionBtnDanger}`}
                          aria-label="Remover temporada"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {showYearsManage && (
        <YearsManageModal
          years={years}
          seasons={seasons}
          onClose={() => setShowYearsManage(false)}
          onAddYear={() => { setShowYearsManage(false); setShowYearModal(true); }}
          onEditYear={(year) => { setShowYearsManage(false); setEditingYear(year); }}
          onDeleteYear={handleDeleteYear}
        />
      )}
      {showYearModal && (
        <YearModal
          onClose={() => setShowYearModal(false)}
          onSave={handleAddYear}
        />
      )}
      {editingYear && <EditYearModal year={editingYear} onClose={() => setEditingYear(null)} onSave={handleEditYear} />}
      {showCreateModal && (
        <SeasonModal
          mode="create"
          years={years}
          seasons={seasons}
          defaultYearId={createDefaultYearId}
          onClose={() => { setShowCreateModal(false); setCreateDefaultYearId(undefined); }}
          onSave={handleCreateSeason}
        />
      )}
      {editingSeason && (
        <SeasonModal
          mode="edit"
          years={years}
          seasons={seasons}
          initial={editingSeason}
          onClose={() => setEditingSeason(null)}
          onSave={handleEditSeason}
        />
      )}
    </div>
  );
}