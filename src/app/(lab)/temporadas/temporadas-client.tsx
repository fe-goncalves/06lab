"use client";

import { criarAno, criarTemporada, editarTemporada, deletarTemporada } from "./actions";
import { useState } from "react";

type Year = { id: string; value: number };
type Season = { id: string; name: string; year_id: string; display_order: number; starts_at: string | null; ends_at: string | null; is_current: boolean };

type Props = {
  years: Year[];
  seasons: Season[];
};

export default function TemporadasClient({ years: initialYears, seasons: initialSeasons }: Props) {
  const [years, setYears] = useState(initialYears);
  const [seasons, setSeasons] = useState(initialSeasons);
  const [newYear, setNewYear] = useState("");
  const [yearError, setYearError] = useState<string | null>(null);
  const [yearLoading, setYearLoading] = useState(false);

  const [showNewSeason, setShowNewSeason] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [seasonYearId, setSeasonYearId] = useState(years[0]?.id ?? "");
  const [seasonOrder, setSeasonOrder] = useState("0");
  const [seasonStartsAt, setSeasonStartsAt] = useState("");
  const [seasonEndsAt, setSeasonEndsAt] = useState("");
  const [seasonIsCurrent, setSeasonIsCurrent] = useState(false);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("0");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editIsCurrent, setEditIsCurrent] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  async function handleAddYear() {
    const v = parseInt(newYear);
    if (!v || v < 2000 || v > 2100) { setYearError("Ano inválido."); return; }
    setYearError(null);
    setYearLoading(true);
    const result = await criarAno(v);
    setYearLoading(false);
    if ("error" in result) { setYearError(result.error); return; }
    setYears(prev => [...prev, { id: result.id, value: v }].sort((a, b) => b.value - a.value));
    setNewYear("");
  }

  async function handleCreateSeason() {
    setSeasonError(null);
    setSeasonLoading(true);
    const fd = new FormData();
    fd.append("name", seasonName);
    fd.append("year_id", seasonYearId);
    fd.append("display_order", seasonOrder);
    fd.append("starts_at", seasonStartsAt);
    fd.append("ends_at", seasonEndsAt);
    fd.append("is_current", String(seasonIsCurrent));
    const result = await criarTemporada(fd);
    setSeasonLoading(false);
    if ("error" in result) { setSeasonError(result.error); return; }
    const year = years.find(y => y.id === seasonYearId);
    setSeasons(prev => [...prev, {
      id: result.id, name: seasonName, year_id: seasonYearId,
      display_order: Number(seasonOrder), starts_at: seasonStartsAt || null,
      ends_at: seasonEndsAt || null, is_current: seasonIsCurrent,
    }]);
    if (seasonIsCurrent) {
      setSeasons(prev => prev.map(s => s.id === result.id ? s : { ...s, is_current: false }));
    }
    setShowNewSeason(false);
    setSeasonName(""); setSeasonYearId(years[0]?.id ?? ""); setSeasonOrder("0");
    setSeasonStartsAt(""); setSeasonEndsAt(""); setSeasonIsCurrent(false);
  }

  function startEdit(s: Season) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditOrder(String(s.display_order));
    setEditStartsAt(s.starts_at ?? "");
    setEditEndsAt(s.ends_at ?? "");
    setEditIsCurrent(s.is_current);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    setEditLoading(true);
    const fd = new FormData();
    fd.append("name", editName);
    fd.append("display_order", editOrder);
    fd.append("starts_at", editStartsAt);
    fd.append("ends_at", editEndsAt);
    fd.append("is_current", String(editIsCurrent));
    const result = await editarTemporada(id, fd);
    setEditLoading(false);
    if ("error" in result) { setEditError(result.error); return; }
    setSeasons(prev => prev.map(s => {
      if (s.id === id) return { ...s, name: editName, display_order: Number(editOrder), starts_at: editStartsAt || null, ends_at: editEndsAt || null, is_current: editIsCurrent };
      if (editIsCurrent) return { ...s, is_current: false };
      return s;
    }));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta temporada?")) return;
    const result = await deletarTemporada(id);
    if ("error" in result) { alert(result.error); return; }
    setSeasons(prev => prev.filter(s => s.id !== id));
  }

  const seasonsByYear = years.map(year => ({
    year,
    seasons: seasons.filter(s => s.year_id === year.id).sort((a, b) => a.display_order - b.display_order),
  }));

  return (
    <div className="space-y-8">
      {/* Adicionar ano */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Adicionar ano</h2>
        <div className="flex gap-3">
          <input type="number" placeholder="2027" value={newYear} onChange={e => setNewYear(e.target.value)}
            className={`${inputClass} w-32`} style={inputStyle} />
          <button type="button" onClick={handleAddYear} disabled={yearLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {yearLoading ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
        {yearError && <p className="mt-2 text-sm" style={{ color: "var(--color-danger)" }}>{yearError}</p>}
      </div>

      {/* Temporadas por ano */}
      {seasonsByYear.map(({ year, seasons: yearSeasons }) => (
        <div key={year.id} className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{year.value}</h2>
          <div className="space-y-3">
            {yearSeasons.map(season => (
              <div key={season.id} className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                {editingId === season.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nome</span>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Ordem</span>
                        <input type="number" value={editOrder} onChange={e => setEditOrder(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Início</span>
                        <input type="date" value={editStartsAt} onChange={e => setEditStartsAt(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Fim</span>
                        <input type="date" value={editEndsAt} onChange={e => setEditEndsAt(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editIsCurrent} onChange={e => setEditIsCurrent(e.target.checked)} className="h-4 w-4" />
                      <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Temporada atual</span>
                    </label>
                    {editError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{editError}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleSaveEdit(season.id)} disabled={editLoading}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                        {editLoading ? "Salvando…" : "Salvar"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{season.name}</p>
                        {season.is_current && (
                          <span className="rounded px-1.5 py-0.5 text-xs font-mono"
                            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                            atual
                          </span>
                        )}
                      </div>
                      {(season.starts_at || season.ends_at) && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          {season.starts_at ?? "?"} → {season.ends_at ?? "?"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => startEdit(season)}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(season.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {yearSeasons.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma temporada neste ano.</p>
            )}
          </div>
        </div>
      ))}

      {/* Nova temporada */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Nova temporada</h2>
          <button type="button" onClick={() => setShowNewSeason(v => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {showNewSeason ? "Cancelar" : "Adicionar"}
          </button>
        </div>
        {showNewSeason && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nome *</span>
                <input type="text" placeholder="2027 I" value={seasonName} onChange={e => setSeasonName(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Ano *</span>
                <select value={seasonYearId} onChange={e => setSeasonYearId(e.target.value)} className={inputClass} style={inputStyle}>
                  {years.map(y => <option key={y.id} value={y.id}>{y.value}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Início</span>
                <input type="date" value={seasonStartsAt} onChange={e => setSeasonStartsAt(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Fim</span>
                <input type="date" value={seasonEndsAt} onChange={e => setSeasonEndsAt(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={seasonIsCurrent} onChange={e => setSeasonIsCurrent(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Marcar como temporada atual</span>
            </label>
            {seasonError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{seasonError}</p>}
            <button type="button" onClick={handleCreateSeason} disabled={seasonLoading}
              className="self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {seasonLoading ? "Salvando…" : "Criar temporada"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}