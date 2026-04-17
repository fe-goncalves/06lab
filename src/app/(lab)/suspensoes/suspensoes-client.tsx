"use client";

import { criarSuspensao, editarSuspensao, desativarSuspensao } from "./actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

type Props = {
  suspensions: Suspension[];
  athletes: Athlete[];
  editions: Edition[];
};

export default function SuspensoesClient({ suspensions: initialSuspensions, athletes, editions }: Props) {
  const router = useRouter();
  const [suspensions, setSuspensions] = useState(initialSuspensions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Form criar
  const [athleteId, setAthleteId] = useState("");
  const [scopeType, setScopeType] = useState("global");
  const [scopeEditionId, setScopeEditionId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [gamesTotal, setGamesTotal] = useState("1");
  const [reason, setReason] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form editar
  const [editScopeType, setEditScopeType] = useState("global");
  const [editScopeEditionId, setEditScopeEditionId] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editGamesTotal, setEditGamesTotal] = useState("1");
  const [editGamesRemaining, setEditGamesRemaining] = useState("1");
  const [editReason, setEditReason] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  function startEdit(s: Suspension) {
    setEditingId(s.id);
    setEditScopeType(s.scope_type);
    setEditScopeEditionId(s.scope_edition_id ?? "");
    setEditStartsAt(s.starts_at);
    setEditGamesTotal(String(s.games_total));
    setEditGamesRemaining(String(s.games_remaining));
    setEditReason(s.reason ?? "");
    setEditError(null);
  }

  async function handleCreate() {
    setCreateError(null);
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
    if ("error" in result) { setCreateError(result.error); return; }
    setShowForm(false);
    setAthleteId(""); setScopeType("global"); setScopeEditionId("");
    setStartsAt(""); setGamesTotal("1"); setReason("");
    router.refresh();
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
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
    if ("error" in result) { setEditError(result.error); return; }
    setSuspensions(prev => prev.map(s => s.id === id ? {
      ...s,
      scope_type: editScopeType,
      scope_edition_id: editScopeEditionId,
      starts_at: editStartsAt,
      games_total: Number(editGamesTotal),
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
    if ("error" in result) { alert(result.error); return; }
    setSuspensions(prev => prev.map(s => s.id === id ? { ...s, is_active: false } : s));
  }

  const active = suspensions.filter(s => s.is_active);
  const inactive = suspensions.filter(s => !s.is_active);

  function SuspensionCard({ s }: { s: Suspension }) {
    const isEditing = editingId === s.id;
    const cumpridos = s.games_total - s.games_remaining;
    const completa = s.games_remaining === 0;

    if (isEditing) {
      return (
        <li className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo de escopo</span>
              <select value={editScopeType} onChange={e => setEditScopeType(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="global">Global (corrida)</option>
                <option value="edition">Por competição</option>
              </select>
            </label>
            {editScopeType === "edition" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Competição</span>
                <select value={editScopeEditionId} onChange={e => setEditScopeEditionId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {editions.map(e => <option key={e.id} value={e.id}>{e.competition_name} — {e.name}</option>)}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Data de início</span>
              <input type="date" value={editStartsAt} onChange={e => setEditStartsAt(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Total de jogos</span>
              <input type="number" min={1} value={editGamesTotal} onChange={e => setEditGamesTotal(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Jogos restantes</span>
              <input type="number" min={0} max={Number(editGamesTotal)} value={editGamesRemaining} onChange={e => setEditGamesRemaining(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Motivo</span>
              <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
          </div>
          {editError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{editError}</p>}
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
        </li>
      );
    }

    return (
      <li className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{s.athlete_name}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {s.scope_type === "global" ? "Corrida" : "Por competição"} · Início: {new Date(s.starts_at + "T00:00:00").toLocaleDateString("pt-BR")}
          </p>
          {s.reason && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{s.reason}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center min-w-[60px]">
            <p className="font-mono text-lg font-bold" style={{ color: completa ? "var(--color-success)" : "var(--color-brand)" }}>
              {cumpridos}/{s.games_total}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>cumpridos</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => startEdit(s)}
              className="rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              Editar
            </button>
            {(completa || !s.is_active) && s.is_active && (
              <button type="button" onClick={() => handleDeactivate(s.id)} disabled={processing === s.id}
                className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
                Desativar
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(v => !v)}
          className="rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {showForm ? "Cancelar" : "Nova suspensão"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Nova suspensão</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Atleta *</span>
              <select value={athleteId} onChange={e => setAthleteId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}{a.surname ? ` (${a.surname})` : ""}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo de escopo</span>
              <select value={scopeType} onChange={e => setScopeType(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="global">Global (corrida)</option>
                <option value="edition">Por competição</option>
              </select>
            </label>
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
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Jogos suspenso *</span>
              <input type="number" min={1} value={gamesTotal} onChange={e => setGamesTotal(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Motivo</span>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Cartão vermelho direto" className={inputClass} style={inputStyle} />
            </label>
          </div>
          {createError && <p className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>{createError}</p>}
          <button type="button" onClick={handleCreate} disabled={creating}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {creating ? "Salvando…" : "Criar suspensão"}
          </button>
        </div>
      )}

      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Ativas ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma suspensão ativa.</p>
        ) : (
          <ul className="space-y-2">
            {active.map(s => <SuspensionCard key={s.id} s={s} />)}
          </ul>
        )}
      </div>

      {inactive.length > 0 && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Histórico ({inactive.length})
          </h2>
          <ul className="space-y-2 opacity-60">
            {inactive.map(s => <SuspensionCard key={s.id} s={s} />)}
          </ul>
        </div>
      )}
    </div>
  );
}