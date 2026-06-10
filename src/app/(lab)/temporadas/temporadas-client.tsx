"use client";

import { useState, useEffect } from "react";
import { criarAno, editarAno, criarTemporada, editarTemporada, deletarTemporada } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { compareSeasons } from "@/lib/seasons-order";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Year = { id: string; value: number };
type Season = {
  id: string; name: string; year_id: string;
  display_order: number; starts_at: string | null;
  ends_at: string | null; is_current: boolean;
};
type Props = { years: Year[]; seasons: Season[] };

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
  letterSpacing: "0.12em", textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-mono)", fontSize: 12,
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.12s",
};

function focusBrand(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#BFF205";
}
function blurBrand(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
}

// ─── Modal compartilhado (header + body + footer) ─────────────────────────────

function ModalShell({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.78)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205", margin: 0 }}>{title}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>{footer}</div>
      </div>
    </div>
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
      Cancelar
    </button>
  );
}

function ConfirmBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: disabled ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
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
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, marginBottom: 0 }}>
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
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, marginBottom: 0 }}>
          Alterar o valor do ano não afeta as temporadas vinculadas a ele.
        </p>
      </div>
    </ModalShell>
  );
}

// ─── Modal de Temporada ────────────────────────────────────────────────────────

function SeasonModal({ mode, years, seasons, initial, onClose, onSave }: {
  mode: "create" | "edit";
  years: Year[];
  seasons: Season[];
  initial?: Season;
  onClose: () => void;
  onSave: (data: { name: string; yearId: string; displayOrder: number; startsAt: string; endsAt: string; isCurrent: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [yearId, setYearId] = useState(initial?.year_id ?? years[0]?.id ?? "");
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
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
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
          <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" as const }} onFocus={focusBrand} onBlur={blurBrand} />
        </div>
        <div>
          <span style={fieldLabel}>Fim</span>
          <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" as const }} onFocus={focusBrand} onBlur={blurBrand} />
        </div>
      </div>

      <div>
        <span style={fieldLabel}>Status</span>
        <div onClick={() => setIsCurrent(v => !v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${isCurrent ? "#BFF205" : "rgba(255,255,255,0.08)"}`, backgroundColor: isCurrent ? "rgba(191,242,5,0.06)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${isCurrent ? "#BFF205" : "rgba(255,255,255,0.2)"}`, backgroundColor: isCurrent ? "#BFF205" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
            {isCurrent && <Check size={10} strokeWidth={3} color="#0a0a0a" />}
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: isCurrent ? "#BFF205" : "var(--color-text-primary)", margin: 0 }}>Temporada atual</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)", margin: 0, marginTop: 2 }}>Marca como a temporada em vigor. Apenas uma pode ser a atual.</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function TemporadasClient({ years: initialYears, seasons: initialSeasons }: Props) {
  const [years, setYears] = useState(initialYears);
  const [seasons, setSeasons] = useState(initialSeasons);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Hover controlado via React — sem depender de group-hover do Tailwind
  const [hoveredSeasonId, setHoveredSeasonId] = useState<string | null>(null);

  const byYear = years
    .slice()
    .sort((a, b) => b.value - a.value)
    .map(year => ({
      year,
      seasons: seasons
        .filter(s => s.year_id === year.id)
        .sort(compareSeasons),
    }));

  async function handleAddYear(value: number) {
    const result = await criarAno(value);
    if ("error" in result) { toast("error", result.error); return; }
    setYears(prev => [{ id: result.id, value }, ...prev].sort((a, b) => b.value - a.value));
    setShowYearModal(false);
    toast("success", "Ano " + value + " adicionado.");
  }

  async function handleEditYear(id: string, value: number) {
    const result = await editarAno(id, value);
    if ("error" in result) { toast("error", result.error); return; }
    setYears(prev => prev.map(y => y.id === id ? { ...y, value } : y).sort((a, b) => b.value - a.value));
    setEditingYear(null);
    toast("success", "Ano atualizado.");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", height: 52, flexShrink: 0, borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", paddingLeft: 32, paddingRight: 32, justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          {seasons.length} {seasons.length === 1 ? "temporada" : "temporadas"} · {years.length} {years.length === 1 ? "ano" : "anos"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowYearModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "transparent", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#BFF205"; e.currentTarget.style.color = "#BFF205"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}>
            <Plus size={13} strokeWidth={2.5} />
            Novo ano
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 9, border: "none", backgroundColor: "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <Plus size={13} strokeWidth={2.5} />
            Nova temporada
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: "24px 32px" }}>
        {byYear.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 20 }}>📅</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Nenhum ano cadastrado</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6, marginBottom: 20 }}>Comece adicionando um ano para depois criar temporadas dentro dele.</p>
            <button type="button" onClick={() => setShowYearModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(191,242,5,0.4)", backgroundColor: "rgba(191,242,5,0.08)", color: "#BFF205", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
              <Plus size={13} strokeWidth={2.5} />
              Adicionar primeiro ano
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {byYear.map(({ year, seasons: yearSeasons }) => (
              <div key={year.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>

                {/* Header do ano */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: yearSeasons.length > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: "var(--color-text-primary)" }}>{year.value}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                      {yearSeasons.length} {yearSeasons.length === 1 ? "temporada" : "temporadas"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingYear(year)}
                      title="Editar ano"
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.3)", transition: "all 0.12s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#BFF205"; e.currentTarget.style.color = "#BFF205"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                    >
                      <Pencil size={12} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>

                {/* Temporadas do ano */}
                {yearSeasons.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "16px 20px", margin: 0 }}>Nenhuma temporada neste ano.</p>
                ) : (
                  yearSeasons.map((season, idx) => (
                    <div
                      key={season.id}
                      onMouseEnter={() => setHoveredSeasonId(season.id)}
                      onMouseLeave={() => setHoveredSeasonId(null)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 16, padding: "14px 20px",
                        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        backgroundColor: hoveredSeasonId === season.id ? "rgba(255,255,255,0.02)" : "transparent",
                        transition: "background-color 0.12s",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{season.name}</span>
                          {season.is_current && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(191,242,5,0.12)", color: "#BFF205", border: "1px solid rgba(191,242,5,0.2)" }}>ATUAL</span>
                          )}
                        </div>
                        {(season.starts_at || season.ends_at) && (
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)", margin: 0, marginTop: 3 }}>
                            {season.starts_at ?? "—"} → {season.ends_at ?? "—"}
                          </p>
                        )}
                      </div>

                      {/* Ações — visíveis no hover via estado React */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, opacity: hoveredSeasonId === season.id ? 1 : 0, transition: "opacity 0.15s" }}>
                        <button type="button" onClick={() => setEditingSeason(season)}
                          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)", transition: "all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#BFF205"; e.currentTarget.style.color = "#BFF205"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
                          <Pencil size={13} strokeWidth={1.8} />
                        </button>
                        <button type="button" onClick={() => handleDelete(season.id)} disabled={deletingId === season.id}
                          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: deletingId === season.id ? "not-allowed" : "pointer", color: "rgba(255,100,100,0.5)", transition: "all 0.12s", opacity: deletingId === season.id ? 0.4 : 1 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#FF4444"; e.currentTarget.style.color = "#FF4444"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,100,100,0.5)"; }}>
                          <Trash2 size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {showYearModal && <YearModal onClose={() => setShowYearModal(false)} onSave={handleAddYear} />}
      {editingYear && <EditYearModal year={editingYear} onClose={() => setEditingYear(null)} onSave={handleEditYear} />}
      {showCreateModal && <SeasonModal mode="create" years={years} seasons={seasons} onClose={() => setShowCreateModal(false)} onSave={handleCreateSeason} />}
      {editingSeason && <SeasonModal mode="edit" years={years} seasons={seasons} initial={editingSeason} onClose={() => setEditingSeason(null)} onSave={handleEditSeason} />}
    </div>
  );
}