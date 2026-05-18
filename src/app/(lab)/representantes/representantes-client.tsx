"use client";

import { criarRepresentante, alterarStatusRepresentante, atualizarEquipesRepresentante } from "./actions";
import { useState } from "react";

type Representative = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  representative_team_access: { team_id: string; teams: { full_name: string } | null }[];
};

type Team = { id: string; full_name: string };

export default function RepresentantesClient({
  representatives: initialReps,
  teams,
}: {
  representatives: Representative[];
  teams: Team[];
  organizationId: string;
}) {
  const [reps, setReps] = useState(initialReps);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeams, setEditTeams] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-background)",
    color: "var(--color-text-primary)",
  };

  function toggleTeam(id: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter(t => t !== id) : [...list, id]);
  }

  async function handleCreate() {
    setCreateError(null);
    setCreatedPassword(null);
    setCreating(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("full_name", fullName);
    selectedTeams.forEach(t => fd.append("team_ids", t));
    const result = await criarRepresentante(fd);
    setCreating(false);
    if ("error" in result) { setCreateError(result.error); return; }
    // Exibe a senha temporária — não fecha o formulário ainda
    setCreatedPassword(result.tempPassword);
    setEmail(""); setFullName(""); setSelectedTeams([]);
  }

  function handleDismissSuccess() {
    setCreatedPassword(null);
    setShowForm(false);
    window.location.reload();
  }

  async function handleToggleStatus(id: string, current: string) {
    const newStatus = current === "active" ? "inactive" : "active";
    if (!confirm(`${newStatus === "inactive" ? "Desativar" : "Ativar"} este representante?`)) return;
    setProcessing(id);
    const result = await alterarStatusRepresentante(id, newStatus as "active" | "inactive");
    setProcessing(null);
    if ("error" in result) { alert(result.error); return; }
    setReps(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  }

  async function handleSaveTeams(id: string) {
    setSavingEdit(true);
    const result = await atualizarEquipesRepresentante(id, editTeams);
    setSavingEdit(false);
    if ("error" in result) { alert(result.error); return; }
    setReps(prev => prev.map(r => r.id === id ? {
      ...r,
      representative_team_access: editTeams.map(tid => ({
        team_id: tid,
        teams: teams.find(t => t.id === tid) ? { full_name: teams.find(t => t.id === tid)!.full_name } : null,
      })),
    } : r));
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => { setShowForm(v => !v); setCreatedPassword(null); setCreateError(null); }}
          className="rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {showForm ? "Cancelar" : "+ Novo representante"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Novo representante
          </h2>

          {createdPassword ? (
            /* Estado pós-criação: exibe senha temporária */
            <div className="space-y-4">
              <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-brand)", backgroundColor: "rgba(191,242,5,0.05)" }}>
                <p className="mb-1 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>
                  Representante criado com sucesso
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Repasse estas credenciais ao representante. A senha não será exibida novamente.
                </p>
                <div className="mt-3 space-y-1">
                  <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Senha temporária:</p>
                  <p className="font-mono text-lg font-bold tracking-widest" style={{ color: "var(--color-text-primary)" }}>
                    {createdPassword}
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleDismissSuccess}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                Fechar e atualizar lista
              </button>
            </div>
          ) : (
            /* Estado de preenchimento */
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={ic} style={is} placeholder="Ex: João Silva" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Email</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={ic} style={is} placeholder="email@exemplo.com" />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Equipes vinculadas</p>
                <div className="flex flex-wrap gap-2">
                  {teams.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => toggleTeam(t.id, selectedTeams, setSelectedTeams)}
                      className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
                      style={{
                        borderColor: selectedTeams.includes(t.id) ? "var(--color-brand)" : "var(--color-border)",
                        backgroundColor: selectedTeams.includes(t.id) ? "rgba(191,242,5,0.1)" : "transparent",
                        color: selectedTeams.includes(t.id) ? "var(--color-brand)" : "var(--color-text-secondary)",
                      }}>
                      {t.full_name}
                    </button>
                  ))}
                </div>
                {teams.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe cadastrada na organização.</p>
                )}
              </div>

              {createError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{createError}</p>}

              <button type="button" onClick={handleCreate} disabled={creating}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {creating ? "Criando…" : "Criar representante"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Representantes ({reps.length})
        </h2>
        {reps.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum representante cadastrado.</p>
        ) : (
          <ul className="space-y-3">
            {reps.map(r => (
              <li key={r.id} className="rounded-lg border p-4"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{r.full_name}</p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{r.email}</p>
                      {r.status === "inactive" && (
                        <span className="text-xs" style={{ color: "var(--color-danger)" }}>· Inativo</span>
                      )}
                    </div>

                    {editingId === r.id ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {teams.map(t => (
                            <button key={t.id} type="button"
                              onClick={() => toggleTeam(t.id, editTeams, setEditTeams)}
                              className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
                              style={{
                                borderColor: editTeams.includes(t.id) ? "var(--color-brand)" : "var(--color-border)",
                                backgroundColor: editTeams.includes(t.id) ? "rgba(191,242,5,0.1)" : "transparent",
                                color: editTeams.includes(t.id) ? "var(--color-brand)" : "var(--color-text-secondary)",
                              }}>
                              {t.full_name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleSaveTeams(r.id)} disabled={savingEdit}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                            {savingEdit ? "Salvando…" : "Salvar equipes"}
                          </button>
                          <button type="button" onClick={() => setEditingId(null)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.representative_team_access.length === 0 ? (
                          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Sem equipes vinculadas</span>
                        ) : (
                          r.representative_team_access.map(a => (
                            <span key={a.team_id} className="rounded px-2 py-0.5 font-mono text-xs"
                              style={{ backgroundColor: "rgba(191,242,5,0.1)", color: "var(--color-brand)" }}>
                              {a.teams?.full_name ?? a.team_id}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {editingId !== r.id && (
                    <div className="flex shrink-0 gap-2">
                      <button type="button"
                        onClick={() => { setEditingId(r.id); setEditTeams(r.representative_team_access.map(a => a.team_id)); }}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Editar equipes
                      </button>
                      <button type="button" onClick={() => handleToggleStatus(r.id, r.status)}
                        disabled={processing === r.id}
                        className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                        style={{
                          borderColor: r.status === "active" ? "var(--color-danger)" : "var(--color-brand)",
                          color: r.status === "active" ? "var(--color-danger)" : "var(--color-brand)",
                        }}>
                        {processing === r.id ? "…" : r.status === "active" ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}