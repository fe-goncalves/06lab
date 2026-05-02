"use client";

import { useState } from "react";
import { criarAno, criarTemporada, editarTemporada, deletarTemporada } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Year = { id: string; value: number };
type Season = {
  id: string; name: string; year_id: string;
  display_order: number; starts_at: string | null;
  ends_at: string | null; is_current: boolean;
};

type Props = { years: Year[]; seasons: Season[] };

// ─── Modal genérico de Temporada ─────────────────────────────────────────────

function SeasonModal({
  mode, years, initial, onClose, onSave,
}: {
  mode: "create" | "edit";
  years: Year[];
  initial?: Season;
  onClose: () => void;
  onSave: (data: { name: string; yearId: string; startsAt: string; endsAt: string; isCurrent: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [yearId, setYearId] = useState(initial?.year_id ?? years[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState(initial?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(initial?.ends_at ?? "");
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? false);
  const [saving, setSaving] = useState(false);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  async function handleSubmit() {
    if (!name.trim()) { toast("error", "Nome é obrigatório."); return; }
    if (!yearId) { toast("error", "Ano é obrigatório."); return; }
    setSaving(true);
    await onSave({ name, yearId, startsAt, endsAt, isCurrent });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl border shadow-xl"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>

        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="font-display text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {mode === "create" ? "Nova temporada" : "Editar temporada"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: "var(--color-text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: 2026 I" className={ic} style={is} autoFocus />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ano</span>
              {years.length === 0 ? (
                <p className="text-xs rounded-lg border px-3 py-2" style={{ borderColor: "var(--color-border)", color: "#A6A6A6" }}>
                  Nenhum ano cadastrado.
                </p>
              ) : (
                <select value={yearId} onChange={e => setYearId(e.target.value)} className={ic} style={is}>
                  {years.map(y => <option key={y.id} value={y.id}>{y.value}</option>)}
                </select>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ordem de exibição</span>
              <input type="number" placeholder="0" className={ic} style={is} disabled />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Início</span>
              <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={ic} style={is} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Fim</span>
              <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={ic} style={is} />
            </label>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
            style={{ borderColor: isCurrent ? "var(--color-brand)" : "var(--color-border)", backgroundColor: isCurrent ? "rgba(191,242,5,0.05)" : "transparent" }}
            onClick={() => setIsCurrent(v => !v)}>
            <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center"
              style={{ borderColor: isCurrent ? "var(--color-brand)" : "var(--color-border)", backgroundColor: isCurrent ? "var(--color-brand)" : "transparent" }}>
              {isCurrent && <Check size={10} strokeWidth={3} style={{ color: "var(--color-background)" }} />}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Temporada atual</p>
              <p className="text-xs mt-0.5" style={{ color: "#666" }}>
                Marca como a temporada em vigor da organização. Apenas uma pode ser a atual.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <button type="button" onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || years.length === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {saving ? (mode === "create" ? "Criando…" : "Salvando…") : (mode === "create" ? "Criar" : "Salvar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de adicionar Ano ───────────────────────────────────────────────────

function YearModal({ onClose, onSave }: { onClose: () => void; onSave: (value: number) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  async function handleSubmit() {
    const n = parseInt(value);
    if (!n || n < 2000 || n > 2100) { toast("error", "Ano inválido. Use um valor entre 2000 e 2100."); return; }
    setSaving(true);
    await onSave(n);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-xl border shadow-xl"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="font-display text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Novo ano</h2>
          <button type="button" onClick={onClose} style={{ color: "var(--color-text-secondary)" }}><X size={18} /></button>
        </div>
        <div className="px-5 py-5">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ano</span>
            <input type="number" value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="2027" min={2000} max={2100}
              className={ic} style={is} autoFocus />
          </label>
          <p className="mt-2 text-xs" style={{ color: "#666" }}>
            Adiciona um novo ano ao calendário da organização. Você poderá criar temporadas dentro dele.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <button type="button" onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {saving ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TemporadasClient({ years: initialYears, seasons: initialSeasons }: Props) {
  const [years, setYears] = useState(initialYears);
  const [seasons, setSeasons] = useState(initialSeasons);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Agrupa temporadas por ano, ordena anos desc, temporadas por display_order
  const byYear = years
    .slice()
    .sort((a, b) => b.value - a.value)
    .map(year => ({
      year,
      seasons: seasons
        .filter(s => s.year_id === year.id)
        .sort((a, b) => a.display_order - b.display_order || b.name.localeCompare(a.name)),
    }));

  async function handleAddYear(value: number) {
    const result = await criarAno(value);
    if ("error" in result) { toast("error", result.error); return; }
    setYears(prev => [{ id: result.id, value }, ...prev].sort((a, b) => b.value - a.value));
    setShowYearModal(false);
    toast("success", "Ano " + value + " adicionado.");
  }

  async function handleCreateSeason(data: { name: string; yearId: string; startsAt: string; endsAt: string; isCurrent: boolean }) {
    const fd = new FormData();
    fd.append("name", data.name.trim());
    fd.append("year_id", data.yearId);
    fd.append("display_order", "0");
    fd.append("starts_at", data.startsAt);
    fd.append("ends_at", data.endsAt);
    fd.append("is_current", String(data.isCurrent));
    const result = await criarTemporada(fd);
    if ("error" in result) { toast("error", result.error); return; }
    const newSeason: Season = {
      id: result.id, name: data.name.trim(), year_id: data.yearId,
      display_order: 0, starts_at: data.startsAt || null,
      ends_at: data.endsAt || null, is_current: data.isCurrent,
    };
    setSeasons(prev => {
      const updated = data.isCurrent ? prev.map(s => ({ ...s, is_current: false })) : prev;
      return [...updated, newSeason];
    });
    setShowCreateModal(false);
    toast("success", "Temporada criada.");
  }

  async function handleEditSeason(data: { name: string; yearId: string; startsAt: string; endsAt: string; isCurrent: boolean }) {
    if (!editingSeason) return;
    const fd = new FormData();
    fd.append("name", data.name.trim());
    fd.append("display_order", String(editingSeason.display_order));
    fd.append("starts_at", data.startsAt);
    fd.append("ends_at", data.endsAt);
    fd.append("is_current", String(data.isCurrent));
    const result = await editarTemporada(editingSeason.id, fd);
    if ("error" in result) { toast("error", result.error); return; }
    setSeasons(prev => prev.map(s => {
      if (s.id === editingSeason.id) return { ...s, name: data.name.trim(), starts_at: data.startsAt || null, ends_at: data.endsAt || null, is_current: data.isCurrent };
      if (data.isCurrent) return { ...s, is_current: false };
      return s;
    }));
    setEditingSeason(null);
    toast("success", "Temporada atualizada.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta temporada? Edições de competições vinculadas a ela ficarão sem temporada.")) return;
    setDeletingId(id);
    const result = await deletarTemporada(id);
    setDeletingId(null);
    if ("error" in result) { toast("error", result.error); return; }
    setSeasons(prev => prev.filter(s => s.id !== id));
    toast("success", "Temporada removida.");
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Temporadas são períodos globais da organização (ex: 2026 I). Cada competição cria suas próprias Edições dentro de uma temporada.
        </p>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setShowYearModal(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-mono"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            <Plus size={13} />
            Novo ano
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-mono"
            style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
            <Plus size={13} />
            Nova temporada
          </button>
        </div>
      </div>

      {/* Lista por ano */}
      {byYear.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <p className="font-display text-lg mb-2" style={{ color: "var(--color-text-primary)" }}>Nenhum ano cadastrado</p>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>Comece adicionando um ano para depois criar temporadas dentro dele.</p>
          <button type="button" onClick={() => setShowYearModal(true)}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-mono mx-auto"
            style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
            <Plus size={14} />
            Adicionar primeiro ano
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {byYear.map(({ year, seasons: yearSeasons }) => (
            <div key={year.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              {/* Header do ano */}
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                <h2 className="font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{year.value}</h2>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {yearSeasons.length} temporada{yearSeasons.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Temporadas do ano */}
              {yearSeasons.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Nenhuma temporada neste ano.
                </p>
              ) : (
                yearSeasons.map((season, idx) => (
                  <div key={season.id}
                    className="group flex items-center justify-between gap-4 px-5 py-4"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{season.name}</p>
                        {season.is_current && (
                          <span className="font-mono text-xs rounded px-1.5 py-0.5"
                            style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
                            atual
                          </span>
                        )}
                      </div>
                      {(season.starts_at || season.ends_at) && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          {season.starts_at ?? "—"} {"\u2192"} {season.ends_at ?? "—"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => setEditingSeason(season)}
                        className="rounded border p-1.5"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={() => handleDelete(season.id)}
                        disabled={deletingId === season.id}
                        className="rounded border p-1.5 disabled:opacity-40"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal — Novo Ano */}
      {showYearModal && (
        <YearModal onClose={() => setShowYearModal(false)} onSave={handleAddYear} />
      )}

      {/* Modal — Nova Temporada */}
      {showCreateModal && (
        <SeasonModal mode="create" years={years} onClose={() => setShowCreateModal(false)} onSave={handleCreateSeason} />
      )}

      {/* Modal — Editar Temporada */}
      {editingSeason && (
        <SeasonModal mode="edit" years={years} initial={editingSeason} onClose={() => setEditingSeason(null)} onSave={handleEditSeason} />
      )}
    </div>
  );
}