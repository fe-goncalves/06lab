"use client";

import { criarSuspensao, editarSuspensao, desativarSuspensao } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import { useState } from "react";
import { Plus, X } from "lucide-react";

type Athlete = { id: string; full_name: string; surname: string | null };
type Edition = { id: string; name: string; competition_name: string };
type Suspension = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  scope_type: string;
  scope_edition_id: string;
  starts_at: string;
  games_total: number;
  games_remaining: number;
  is_active: boolean;
  reason: string;
};

const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

export default function SuspensoesClient({ suspensions: initialSuspensions, athletes, editions }: {
  suspensions: Suspension[];
  athletes: Athlete[];
  editions: Edition[];
}) {
  const [suspensions, setSuspensions] = useState(initialSuspensions);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"active" | "all">("active");

  // Form criar
  const [athleteId, setAthleteId] = useState("");
  const [scopeType, setScopeType] = useState("global");
  const [scopeEditionId, setScopeEditionId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [gamesTotal, setGamesTotal] = useState("1");
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);

  // Form editar
  const [editScopeType, setEditScopeType] = useState("global");
  const [editScopeEditionId, setEditScopeEditionId] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editGamesTotal, setEditGamesTotal] = useState("1");
  const [editGamesRemaining, setEditGamesRemaining] = useState("1");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(s: Suspension) {
    setEditingId(s.id);
    setEditScopeType(s.scope_type);
    setEditScopeEditionId(s.scope_edition_id ?? "");
    setEditStartsAt(s.starts_at);
    setEditGamesTotal(String(s.games_total));
    setEditGamesRemaining(String(s.games_remaining));
    setEditReason(s.reason ?? "");
  }

  function resetForm() {
    setAthleteId(""); setScopeType("global"); setScopeEditionId("");
    setStartsAt(""); setGamesTotal("1"); setReason("");
  }

  async function handleCreate() {
    if (!athleteId) { toast("error", "Selecione o atleta."); return; }
    if (!startsAt) { toast("error", "Data de início é obrigatória."); return; }
    setCreating(true);
    const fd = new FormData();
    fd.append("athlete_id", athleteId);
    fd.append("scope_type", scopeType);
    fd.append("scope_edition_id", scopeEditionId);
    fd.append("starts_at", startsAt);
    fd.append("games_total", gamesTotal);
    fd.append("reason", reason);
    const result = await criarSuspensao(fd);
    setCreating(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Suspensão criada.");
    setShowModal(false);
    resetForm();
    // Adiciona otimisticamente
    const athlete = athletes.find(a => a.id === athleteId);
    setSuspensions(prev => [{
      id: result.id,
      athlete_id: athleteId,
      athlete_name: athlete?.full_name ?? "—",
      scope_type: scopeType,
      scope_edition_id: scopeEditionId,
      starts_at: startsAt,
      games_total: Number(gamesTotal),
      games_remaining: Number(gamesTotal),
      is_active: true,
      reason,
    }, ...prev]);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    const fd = new FormData();
    fd.append("scope_type", editScopeType);
    fd.append("scope_edition_id", editScopeEditionId);
    fd.append("starts_at", editStartsAt);
    fd.append("games_total", editGamesTotal);
    fd.append("games_remaining", editGamesRemaining);
    fd.append("reason", editReason);
    const result = await editarSuspensao(id, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Suspensão atualizada.");
    setSuspensions(prev => prev.map(s => s.id === id ? {
      ...s, scope_type: editScopeType, scope_edition_id: editScopeEditionId,
      starts_at: editStartsAt, games_total: Number(editGamesTotal),
      games_remaining: Math.min(Number(editGamesRemaining), Number(editGamesTotal)),
      reason: editReason,
    } : s));
    setEditingId(null);
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Desativar esta suspensão?")) return;
    setProcessing(id);
    const result = await desativarSuspensao(id);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Suspensão desativada.");
    setSuspensions(prev => prev.map(s => s.id === id ? { ...s, is_active: false } : s));
  }

  const displayed = activeFilter === "active"
    ? suspensions.filter(s => s.is_active)
    : suspensions;

  const activeCount = suspensions.filter(s => s.is_active).length;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setActiveFilter("active")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeFilter === "active" ? "var(--color-brand)" : "#A6A6A6" }}>
            ATIVAS
            <span className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeFilter === "active" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeFilter === "active" ? "var(--color-brand)" : "#555",
              }}>
              {activeCount}
            </span>
          </button>
          <button type="button" onClick={() => setActiveFilter("all")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeFilter === "all" ? "var(--color-brand)" : "#A6A6A6" }}>
            TODAS
            <span className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeFilter === "all" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeFilter === "all" ? "var(--color-brand)" : "#555",
              }}>
              {suspensions.length}
            </span>
          </button>
        </div>
        <button type="button" onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Nova suspensão
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 px-8 py-6">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {activeFilter === "active" ? "Nenhuma suspensão ativa." : "Nenhuma suspensão registrada."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            {displayed.map((s, idx) => {
              const isEditing = editingId === s.id;
              const cumpridos = s.games_total - s.games_remaining;
              const completa = s.games_remaining === 0;
              const pct = s.games_total > 0 ? (cumpridos / s.games_total) * 100 : 0;

              if (isEditing) {
                return (
                  <div key={s.id} className="px-5 py-4 space-y-3"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", backgroundColor: "var(--color-background)" }}>
                    <p className="font-mono text-xs font-bold" style={{ color: "var(--color-brand)" }}>{s.athlete_name}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Escopo</span>
                        <select value={editScopeType} onChange={e => setEditScopeType(e.target.value)} className={inputClass} style={inputStyle}>
                          <option value="global">Global</option>
                          <option value="edition">Por competição</option>
                        </select>
                      </label>
                      {editScopeType === "edition" && (
                        <label className="flex flex-col gap-1">
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Competição</span>
                          <select value={editScopeEditionId} onChange={e => setEditScopeEditionId(e.target.value)} className={inputClass} style={inputStyle}>
                            <option value="">Selecione…</option>
                            {editions.map(e => <option key={e.id} value={e.id}>{e.competition_name} — {e.name}</option>)}
                          </select>
                        </label>
                      )}
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Início</span>
                        <input type="date" value={editStartsAt} onChange={e => setEditStartsAt(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Total de jogos</span>
                        <input type="number" min={1} value={editGamesTotal} onChange={e => setEditGamesTotal(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Jogos restantes</span>
                        <input type="number" min={0} max={Number(editGamesTotal)} value={editGamesRemaining} onChange={e => setEditGamesRemaining(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                      <label className="flex flex-col gap-1 sm:col-span-3">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Motivo</span>
                        <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)} className={inputClass} style={inputStyle} />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleSaveEdit(s.id)} disabled={saving}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                        {saving ? "Salvando…" : "Salvar"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={s.id} className="flex items-center gap-6 px-5 py-4 group"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                    opacity: s.is_active ? 1 : 0.45,
                  }}>
                  {/* Atleta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {s.athlete_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {s.scope_type === "global" ? "Global" : "Por competição"}
                      </span>
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>·</span>
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(s.starts_at + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      {s.reason && (
                        <>
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>·</span>
                          <span className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{s.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progresso */}
                  <div className="shrink-0 w-32">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {cumpridos}/{s.games_total} jogos
                      </span>
                      {completa && (
                        <span className="font-mono text-xs" style={{ color: "var(--color-success)" }}>completa</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: completa ? "var(--color-success)" : "var(--color-brand)",
                        }} />
                    </div>
                  </div>

                  {/* Restantes */}
                  <div className="shrink-0 w-12 text-center">
                    <p className="font-display text-xl font-bold"
                      style={{ color: s.games_remaining === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                      {s.games_remaining}
                    </p>
                    <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>rest.</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button type="button" onClick={() => startEdit(s)}
                      className="rounded border px-2 py-1 font-mono text-xs"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Editar
                    </button>
                    {s.is_active && (
                      <button type="button" onClick={() => handleDeactivate(s.id)} disabled={processing === s.id}
                        className="rounded border px-2 py-1 font-mono text-xs disabled:opacity-50"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                        {processing === s.id ? "…" : "Desativar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nova suspensão */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-xl border shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Nova suspensão</h2>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ color: "var(--color-text-secondary)" }}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Atleta *</span>
                <select value={athleteId} onChange={e => setAthleteId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.surname ?? a.full_name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Escopo</span>
                  <select value={scopeType} onChange={e => setScopeType(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="global">Global</option>
                    <option value="edition">Por competição</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Jogos suspenso *</span>
                  <input type="number" min={1} value={gamesTotal} onChange={e => setGamesTotal(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
              </div>
              {scopeType === "edition" && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Competição</span>
                  <select value={scopeEditionId} onChange={e => setScopeEditionId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Selecione…</option>
                    {editions.map(e => <option key={e.id} value={e.id}>{e.competition_name} — {e.name}</option>)}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data de início *</span>
                <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Motivo</span>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Cartão vermelho direto" className={inputClass} style={inputStyle} />
              </label>
            </div>
            <div className="flex gap-3 border-t px-6 py-4 justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleCreate} disabled={creating}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {creating ? "Salvando…" : "Criar suspensão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}