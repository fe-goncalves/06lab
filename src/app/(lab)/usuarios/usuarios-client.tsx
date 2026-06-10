"use client";

import { criarUsuario, alterarStatusUsuario } from "./actions";
import { useState } from "react";
import { LabSelect } from "@/app/(lab)/components/lab-select";

type UserProfile = {
  id: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  main: "Administrador",
  supporter: "Supporter",
  relator: "Relator",
};

export default function UsuariosClient({
  users: initialUsers,
  currentUserId,
  currentRole,
}: {
  users: UserProfile[];
  currentUserId: string;
  currentRole: string;
  organizationId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("relator");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-background)",
    color: "var(--color-text-primary)",
  };

  async function handleCreate() {
    setCreateError(null);
    setCreating(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);
    fd.append("full_name", fullName);
    fd.append("role", role);
    const result = await criarUsuario(fd);
    setCreating(false);
    if ("error" in result) { setCreateError(result.error); return; }
    setShowForm(false);
    setEmail(""); setPassword(""); setFullName(""); setRole("relator");
    window.location.reload();
  }

  async function handleToggleStatus(profileId: string, currentStatus: string) {
    if (profileId === currentUserId) { alert("Você não pode desativar sua própria conta."); return; }
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    if (!confirm(`${newStatus === "inactive" ? "Desativar" : "Ativar"} este usuário?`)) return;
    setProcessing(profileId);
    const result = await alterarStatusUsuario(profileId, newStatus as "active" | "inactive");
    setProcessing(null);
    if ("error" in result) { alert(result.error); return; }
    setUsers(prev => prev.map(u => u.id === profileId ? { ...u, status: newStatus } : u));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(v => !v)}
          className="rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {showForm ? "Cancelar" : "Novo usuário"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Novo usuário</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome</span>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={ic} style={is} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Perfil</span>
              <LabSelect value={role} onChange={setRole} options={[
                ...(currentRole === "main" ? [{ value: "supporter", label: "Supporter" }] : []),
                { value: "relator", label: "Relator" },
              ]} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Email *</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={ic} style={is} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Senha *</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={ic} style={is} />
            </label>
          </div>
          {createError && <p className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>{createError}</p>}
          <button type="button" onClick={handleCreate} disabled={creating}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {creating ? "Criando…" : "Criar usuário"}
          </button>
        </div>
      )}

      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Usuários ({users.length})
        </h2>
        <ul className="space-y-2">
          {users.map(u => (
            <li key={u.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {u.full_name ?? "Sem nome"}
                  </p>
                  {u.id === currentUserId && (
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>(você)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  {u.status === "inactive" && (
                    <span className="text-xs" style={{ color: "var(--color-danger)" }}>· Inativo</span>
                  )}
                </div>
              </div>
              {u.id !== currentUserId && u.role !== "main" && (
                <button type="button" onClick={() => handleToggleStatus(u.id, u.status)}
                  disabled={processing === u.id}
                  className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                  style={{
                    borderColor: "var(--color-border)",
                    color: u.status === "active" ? "var(--color-danger)" : "var(--color-success)",
                  }}>
                  {processing === u.id ? "…" : u.status === "active" ? "Desativar" : "Ativar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}