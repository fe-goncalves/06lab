"use client";

import { criarRepresentante, alterarStatusRepresentante, atualizarEquipesRepresentante } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import { useState } from "react";

type Representative = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  representative_team_access: { team_id: string; teams: { full_name: string } | null }[];
};

type Team = { id: string; full_name: string };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-text-primary)",
  outline: "none",
  transition: "border-color 0.15s",
  colorScheme: "dark",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)",
  display: "block",
  marginBottom: 5,
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205",
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
    </div>
  );
}

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
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", `Representante ${newStatus === "active" ? "ativado" : "desativado"}.`);
    setReps(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  }

  async function handleSaveTeams(id: string) {
    setSavingEdit(true);
    const result = await atualizarEquipesRepresentante(id, editTeams);
    setSavingEdit(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Equipes atualizadas.");
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Botão novo representante */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => { setShowForm(v => !v); setCreatedPassword(null); setCreateError(null); }}
          style={{
            padding: "10px 20px", borderRadius: 9, border: "none",
            backgroundColor: showForm ? "rgba(255,255,255,0.06)" : "#BFF205",
            color: showForm ? "rgba(255,255,255,0.6)" : "#0a0a0a",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.12s",
          }}
        >
          {showForm ? "Cancelar" : "+ Novo representante"}
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          padding: "20px 20px 24px",
        }}>
          <SectionHeader title="Novo representante" />

          {createdPassword ? (
            /* Estado pós-criação: exibe senha temporária */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                borderRadius: 10,
                border: "1px solid rgba(191,242,5,0.3)",
                backgroundColor: "rgba(191,242,5,0.04)",
                padding: "16px 18px",
              }}>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#BFF205", margin: 0,
                }}>
                  Representante criado
                </p>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "rgba(255,255,255,0.4)", margin: "6px 0 0",
                }}>
                  Repasse as credenciais abaixo ao representante. A senha não será exibida novamente.
                </p>
                <div style={{ marginTop: 14 }}>
                  <span style={{ ...labelStyle }}>Senha temporária</span>
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800,
                    color: "#BFF205", letterSpacing: "0.12em",
                    margin: 0, padding: "10px 14px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    borderRadius: 8,
                    border: "1px solid rgba(191,242,5,0.2)",
                  }}>
                    {createdPassword}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissSuccess}
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 20px", borderRadius: 9, border: "none",
                  backgroundColor: "#BFF205", color: "#0a0a0a",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Fechar e atualizar lista
              </button>
            </div>
          ) : (
            /* Formulário */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <span style={labelStyle}>Nome completo *</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ex: João Silva"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </label>
                <label>
                  <span style={labelStyle}>Email *</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </label>
              </div>

              <div>
                <span style={labelStyle}>Equipes vinculadas</span>
                {teams.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    Nenhuma equipe cadastrada na organização.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {teams.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTeam(t.id, selectedTeams, setSelectedTeams)}
                        style={{
                          padding: "7px 14px", borderRadius: 9,
                          border: `1px solid ${selectedTeams.includes(t.id) ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`,
                          backgroundColor: selectedTeams.includes(t.id) ? "rgba(191,242,5,0.08)" : "transparent",
                          color: selectedTeams.includes(t.id) ? "#BFF205" : "rgba(255,255,255,0.4)",
                          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                          cursor: "pointer", transition: "all 0.12s",
                        }}
                      >
                        {t.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {createError && (
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "#FF4444",
                  backgroundColor: "rgba(255,68,68,0.07)",
                  border: "1px solid rgba(255,68,68,0.2)",
                  borderRadius: 8, padding: "8px 12px", margin: 0,
                }}>
                  {createError}
                </p>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  style={{
                    padding: "10px 28px", borderRadius: 9, border: "none",
                    backgroundColor: creating ? "rgba(191,242,5,0.3)" : "#BFF205",
                    color: "#0a0a0a",
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: creating ? "not-allowed" : "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {creating ? "Criando…" : "Criar representante"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de representantes */}
      <div style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "20px 20px 16px" }}>
          <SectionHeader title={`Representantes (${reps.length})`} />
        </div>

        {reps.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 0", textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14, fontSize: 20,
            }}>
              👤
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              Nenhum representante
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
              Crie o primeiro representante para vincular equipes.
            </p>
          </div>
        ) : (
          <div>
            {reps.map((r, idx) => (
              <RepresentanteRow
                key={r.id}
                rep={r}
                idx={idx}
                teams={teams}
                editingId={editingId}
                editTeams={editTeams}
                setEditTeams={setEditTeams}
                savingEdit={savingEdit}
                processing={processing}
                onToggleStatus={handleToggleStatus}
                onStartEdit={() => {
                  setEditingId(r.id);
                  setEditTeams(r.representative_team_access.map(a => a.team_id));
                }}
                onSaveTeams={() => handleSaveTeams(r.id)}
                onCancelEdit={() => setEditingId(null)}
                toggleTeam={toggleTeam}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RepresentanteRow({
  rep, idx, teams, editingId, editTeams, setEditTeams,
  savingEdit, processing, onToggleStatus, onStartEdit,
  onSaveTeams, onCancelEdit, toggleTeam,
}: {
  rep: Representative;
  idx: number;
  teams: Team[];
  editingId: string | null;
  editTeams: string[];
  setEditTeams: (v: string[]) => void;
  savingEdit: boolean;
  processing: string | null;
  onToggleStatus: (id: string, status: string) => void;
  onStartEdit: () => void;
  onSaveTeams: () => void;
  onCancelEdit: () => void;
  toggleTeam: (id: string, list: string[], setter: (v: string[]) => void) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isEditing = editingId === rep.id;
  const isInactive = rep.status === "inactive";

  return (
    <div
      style={{
        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        padding: "14px 20px",
        opacity: hovered ? 1 : 0.85,
        transition: "opacity 0.12s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        {/* Info */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
              color: isInactive ? "rgba(255,255,255,0.3)" : "var(--color-text-primary)",
            }}>
              {rep.full_name}
            </span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "rgba(255,255,255,0.3)",
            }}>
              {rep.email}
            </span>
            {isInactive && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                letterSpacing: "0.06em",
                padding: "3px 8px", borderRadius: 20,
                backgroundColor: "rgba(255,68,68,0.12)",
                color: "#FF4444",
                border: "1px solid rgba(255,68,68,0.25)",
              }}>
                Inativo
              </span>
            )}
          </div>

          {/* Equipes ou editor */}
          {isEditing ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {teams.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTeam(t.id, editTeams, setEditTeams)}
                    style={{
                      padding: "6px 12px", borderRadius: 9,
                      border: `1px solid ${editTeams.includes(t.id) ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`,
                      backgroundColor: editTeams.includes(t.id) ? "rgba(191,242,5,0.08)" : "transparent",
                      color: editTeams.includes(t.id) ? "#BFF205" : "rgba(255,255,255,0.4)",
                      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    {t.full_name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={onSaveTeams}
                  disabled={savingEdit}
                  style={{
                    padding: "7px 16px", borderRadius: 8, border: "none",
                    backgroundColor: savingEdit ? "rgba(191,242,5,0.3)" : "#BFF205",
                    color: "#0a0a0a",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    cursor: savingEdit ? "not-allowed" : "pointer",
                  }}
                >
                  {savingEdit ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  style={{
                    padding: "7px 16px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {rep.representative_team_access.length === 0 ? (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  Sem equipes vinculadas
                </span>
              ) : (
                rep.representative_team_access.map(a => (
                  <span key={a.team_id} style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                    letterSpacing: "0.06em",
                    padding: "3px 8px", borderRadius: 20,
                    backgroundColor: "rgba(191,242,5,0.08)",
                    color: "#BFF205",
                    border: "1px solid rgba(191,242,5,0.2)",
                  }}>
                    {a.teams?.full_name ?? "—"}
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        {!isEditing && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onStartEdit}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: "pointer", transition: "all 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.3)"; e.currentTarget.style.color = "#BFF205"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              Editar equipes
            </button>
            <button
              type="button"
              onClick={() => onToggleStatus(rep.id, rep.status)}
              disabled={processing === rep.id}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${isInactive ? "rgba(191,242,5,0.3)" : "rgba(255,68,68,0.3)"}`,
                backgroundColor: "transparent",
                color: isInactive ? "#BFF205" : "#FF4444",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: processing === rep.id ? "not-allowed" : "pointer",
                opacity: processing === rep.id ? 0.5 : 1,
                transition: "all 0.12s",
              }}
            >
              {processing === rep.id ? "…" : isInactive ? "Ativar" : "Desativar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}