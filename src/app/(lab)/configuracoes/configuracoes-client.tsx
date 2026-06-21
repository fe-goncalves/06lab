"use client";

import {
  salvarOrganizacao,
  alterarSenha,
  listarUsuarios,
  convidarUsuario,
  desativarUsuario,
  listarRepresentantes,
  listarEquipesOrganizacao,
  criarRepresentante,
  atualizarEquipesRepresentante,
  desativarRepresentante,
  reativarRepresentante,
  type RepresentativeRow,
  type TeamOption,
} from "./actions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Pencil,
  RotateCcw,
  Search,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "@/app/(lab)/components/toast";
import { EntityHubShell } from "@/app/(lab)/components/entity-hub-shell";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import { EntityLogoUpload } from "@/app/(lab)/components/entity-logo-upload";
import { EntityColorPicker } from "@/app/(lab)/components/entity-color-picker";
import { LabCheckbox } from "@/app/(lab)/components/lab-checkbox";
import { SocialHandlesField } from "./social-handles-field";
import { handlesFromOrg, handlesToFormFields, type SocialHandles } from "./social-utils";
import {
  modalCloseButtonStyle,
  modalHeaderDividerStyle,
  modalOverlayStyle,
  modalPanelStyle,
  secondaryButtonStyle,
} from "@/lib/lab-ui-styles";
import styles from "@/app/(lab)/components/entity-hub.module.css";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";

interface Org {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  status: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  description: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  organization_id: string;
}

interface UserRow {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  email: string;
}

type Tab = "geral" | "usuarios";
type UsuariosSubTab = "equipe" | "representantes" | "minha_conta";

const ROLE_LABEL: Record<string, string> = {
  main: "Principal",
  admin: "Admin",
  editor: "Editor",
  inactive: "Inativo",
};

function roleBadgeClass(role: string): string {
  if (role === "main") return `${styles.statusBadge} ${styles.roleBadgeMain}`;
  if (role === "admin") return `${styles.statusBadge} ${styles.roleBadgeAdmin}`;
  if (role === "editor") return `${styles.statusBadge} ${styles.roleBadgeEditor}`;
  return `${styles.statusBadge} ${styles.roleBadgeInactive}`;
}

function HubModal({
  open,
  title,
  onClose,
  children,
  maxWidth = 440,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{ ...modalPanelStyle, maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "16px 20px",
          ...modalHeaderDividerStyle,
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
          <button type="button" onClick={onClose} style={{ ...modalCloseButtonStyle, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function UserAvatar({ role }: { role: string }) {
  const inactive = role === "inactive";
  return (
    <PersonAvatar
      size={40}
      style={{
        opacity: inactive ? 0.55 : 1,
        border: "1px solid var(--hub-glass-border)",
        backgroundColor: "var(--hub-input-bg)",
      }}
    />
  );
}

function TeamCheckboxList({
  teams,
  selectedIds,
  onToggle,
  search,
  onSearchChange,
}: {
  teams: TeamOption[];
  selectedIds: string[];
  onToggle: (teamId: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? teams.filter((t) =>
        t.full_name.toLowerCase().includes(q)
        || t.short_label.toLowerCase().includes(q),
      )
    : teams;

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Equipes</span>
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--color-text-faint)", pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar equipe…"
          className={styles.input}
          style={{ paddingLeft: 36 }}
        />
      </div>
      <div className={styles.teamCheckList}>
        {filtered.length === 0 ? (
          <p className={styles.loadingMono} style={{ textAlign: "center", padding: "16px 12px" }}>
            Nenhuma equipe encontrada.
          </p>
        ) : (
          filtered.map((team) => {
            const checked = selectedIds.includes(team.id);
            return (
              <label
                key={team.id}
                className={`${styles.teamCheckRow} ${checked ? styles.teamCheckRowSelected : ""}`}
              >
                <LabCheckbox checked={checked} onChange={() => onToggle(team.id)} accentColor="var(--color-brand)" />
                <span className={styles.teamChip}>{team.short_label}</span>
                <span className={styles.teamCheckName}>{team.full_name}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function TabRepresentantes({ orgId }: { orgId: string }) {
  const [representatives, setRepresentatives] = useState<RepresentativeRow[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTeamIds, setCreateTeamIds] = useState<string[]>([]);
  const [createTeamSearch, setCreateTeamSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  const [editRep, setEditRep] = useState<RepresentativeRow | null>(null);
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editTeamSearch, setEditTeamSearch] = useState("");
  const [savingTeams, setSavingTeams] = useState(false);
  const [editFeedback, setEditFeedback] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function reload() {
    const [repsResult, teamsResult] = await Promise.all([
      listarRepresentantes(orgId),
      listarEquipesOrganizacao(orgId),
    ]);
    if ("error" in repsResult) { setLoadError(repsResult.error); return; }
    if ("error" in teamsResult) { setLoadError(teamsResult.error); return; }
    setRepresentatives(repsResult.representatives);
    setTeams(teamsResult.teams);
    setLoadError(null);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await reload();
      setLoading(false);
    }
    void load();
  }, [orgId]);

  function toggleTeamId(ids: string[], teamId: string, setter: (v: string[]) => void) {
    setter(ids.includes(teamId) ? ids.filter((id) => id !== teamId) : [...ids, teamId]);
  }

  function closeCreateModal() {
    setShowCreate(false);
    setCreateFullName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateTeamIds([]);
    setCreateTeamSearch("");
    setCreateFeedback(null);
  }

  function openEditModal(rep: RepresentativeRow) {
    setEditRep(rep);
    setEditTeamIds(rep.teams.map((t) => t.id));
    setEditTeamSearch("");
    setEditFeedback(null);
  }

  function closeEditModal() {
    setEditRep(null);
    setEditTeamIds([]);
    setEditTeamSearch("");
    setEditFeedback(null);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateFeedback(null);
    const fd = new FormData();
    fd.append("full_name", createFullName);
    fd.append("email", createEmail);
    fd.append("password", createPassword);
    createTeamIds.forEach((id) => fd.append("team_ids", id));
    const result = await criarRepresentante(fd);
    setCreating(false);
    if ("error" in result) {
      setCreateFeedback(result.error);
      return;
    }
    toast("success", "Representante criado.");
    closeCreateModal();
    await reload();
  }

  async function handleSaveTeams() {
    if (!editRep) return;
    setSavingTeams(true);
    setEditFeedback(null);
    const result = await atualizarEquipesRepresentante(editRep.id, editTeamIds);
    setSavingTeams(false);
    if ("error" in result) {
      setEditFeedback(result.error);
      return;
    }
    toast("success", "Equipes atualizadas.");
    closeEditModal();
    await reload();
  }

  async function handleToggleStatus(rep: RepresentativeRow) {
    const isActive = rep.status === "active";
    const msg = isActive
      ? `Desativar o representante "${rep.full_name}"?`
      : `Reativar o representante "${rep.full_name}"?`;
    if (!confirm(msg)) return;

    setTogglingId(rep.id);
    const result = isActive
      ? await desativarRepresentante(rep.id)
      : await reativarRepresentante(rep.id);
    setTogglingId(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", isActive ? "Representante desativado." : "Representante reativado.");
    await reload();
  }

  const canCreate = createFullName && createEmail && createPassword.length >= 6 && createTeamIds.length > 0;

  return (
    <>
      <div className={styles.listPanel}>
        <div className={styles.listPanelHeader}>
          <div className={styles.listPanelTitle}>
            <span className={styles.listPanelName}>Representantes</span>
            {!loading && <span className={styles.listPanelCount}>{representatives.length}</span>}
          </div>
          <button type="button" className={styles.panelAddBtn} onClick={() => { setShowCreate(true); setCreateFeedback(null); }}>
            <UserPlus size={13} strokeWidth={2.5} />
            Criar
          </button>
        </div>

        {loading ? (
          <p className={styles.loadingMono} style={{ padding: "24px 18px" }}>Carregando representantes…</p>
        ) : loadError ? (
          <p className={styles.formError} style={{ margin: 16 }}>{loadError}</p>
        ) : representatives.length === 0 ? (
          <div className={styles.listPanelEmpty}>
            <p className={styles.listPanelEmptyTitle}>Nenhum representante</p>
            <p className={styles.listPanelEmptyDesc}>Crie representantes para gerenciar inscrições por equipe.</p>
          </div>
        ) : (
          representatives.map((rep) => {
            const inactive = rep.status !== "active";
            return (
              <div key={rep.id} className={`${styles.listRow} ${inactive ? styles.listRowInactive : ""}`}>
                <UserAvatar role={inactive ? "inactive" : "editor"} />
                <div className={styles.listRowMain}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p className={styles.listRowTitle}>{rep.full_name}</p>
                    <span className={`${styles.statusBadge} ${inactive ? "" : styles.statusBadgeActive}`}>
                      {inactive ? "Inativo" : "Ativo"}
                    </span>
                  </div>
                  <p className={styles.listRowSub}>{rep.email}</p>
                  {rep.teams.length > 0 && (
                    <div className={styles.teamChipRow}>
                      {rep.teams.map((t) => <span key={t.id} className={styles.teamChip}>{t.short_label}</span>)}
                    </div>
                  )}
                </div>
                <span className={styles.listRowDate}>{new Date(rep.created_at).toLocaleDateString("pt-BR")}</span>
                <div className={styles.rowActions}>
                  <button type="button" className={styles.rowActionBtn} onClick={() => openEditModal(rep)} title="Editar equipes">
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowActionBtn} ${inactive ? styles.rowActionBtnBrand : styles.rowActionBtnDanger}`}
                    onClick={() => void handleToggleStatus(rep)}
                    disabled={togglingId === rep.id}
                    title={inactive ? "Reativar" : "Desativar"}
                  >
                    {inactive ? <RotateCcw size={14} strokeWidth={2} /> : <UserX size={14} strokeWidth={2} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <HubModal open={showCreate} title="Criar representante" onClose={closeCreateModal} maxWidth={460}>
        <div className={styles.fieldStack}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rep-name">Nome completo</label>
            <input id="rep-name" type="text" value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rep-email">E-mail</label>
            <input id="rep-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rep-pass">Senha inicial</label>
            <input id="rep-pass" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className={styles.input} placeholder="Mínimo 6 caracteres" />
          </div>
          <TeamCheckboxList
            teams={teams}
            selectedIds={createTeamIds}
            onToggle={(id) => toggleTeamId(createTeamIds, id, setCreateTeamIds)}
            search={createTeamSearch}
            onSearchChange={setCreateTeamSearch}
          />
        </div>
        {createFeedback && <p className={styles.formError} style={{ marginTop: 14 }}>{createFeedback}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button type="button" className={styles.modalPrimaryBtn} onClick={() => void handleCreate()} disabled={creating || !canCreate}>
            {creating ? "Criando…" : "Criar"}
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={closeCreateModal} disabled={creating}>Cancelar</button>
        </div>
      </HubModal>

      <HubModal open={!!editRep} title="Editar equipes" onClose={closeEditModal} maxWidth={460}>
        {editRep && (
          <>
            <p className={styles.listRowSub} style={{ margin: "0 0 16px" }}>{editRep.full_name} — {editRep.email}</p>
            <TeamCheckboxList
              teams={teams}
              selectedIds={editTeamIds}
              onToggle={(id) => toggleTeamId(editTeamIds, id, setEditTeamIds)}
              search={editTeamSearch}
              onSearchChange={setEditTeamSearch}
            />
            {editFeedback && <p className={styles.formError} style={{ marginTop: 14 }}>{editFeedback}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button type="button" className={styles.modalPrimaryBtn} onClick={() => void handleSaveTeams()} disabled={savingTeams || editTeamIds.length === 0}>
                {savingTeams ? "Salvando…" : "Salvar equipes"}
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={closeEditModal} disabled={savingTeams}>Cancelar</button>
            </div>
          </>
        )}
      </HubModal>
    </>
  );
}

function TabUsuarios({ orgId, userProfile }: { orgId: string; userProfile: UserProfile | null }) {
  const [subTab, setSubTab] = useState<UsuariosSubTab>("equipe");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await listarUsuarios(orgId);
      setLoading(false);
      if ("error" in result) { setLoadError(result.error); return; }
      setUsers(result.users);
    }
    void load();
  }, [orgId]);

  async function handleInvite() {
    setInviting(true);
    setInviteFeedback(null);
    const fd = new FormData();
    fd.append("email", inviteEmail);
    fd.append("role", inviteRole);
    const result = await convidarUsuario(orgId, fd);
    setInviting(false);
    if ("error" in result) { setInviteFeedback(result.error); return; }
    toast("success", `Convite enviado para ${inviteEmail}.`);
    setInviteEmail("");
    setShowInvite(false);
    const updated = await listarUsuarios(orgId);
    if (!("error" in updated)) setUsers(updated.users);
  }

  async function handleDeactivate(profileId: string, name: string) {
    if (!confirm(`Desativar o acesso de "${name || "este usuário"}"?`)) return;
    setDeactivatingId(profileId);
    const result = await desativarUsuario(profileId);
    setDeactivatingId(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Usuário desativado.");
    setUsers((prev) => prev.map((u) => u.id === profileId ? { ...u, role: "inactive" } : u));
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    setNovaSenha("");
    setConfirmarSenha("");
    setPasswordFeedback(null);
  }

  async function handleAlterarSenha() {
    setPasswordFeedback(null);
    if (novaSenha !== confirmarSenha) {
      setPasswordFeedback("As senhas não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setPasswordFeedback("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSavingPassword(true);
    const fd = new FormData();
    fd.append("new_password", novaSenha);
    const result = await alterarSenha(fd);
    setSavingPassword(false);
    if ("error" in result) {
      setPasswordFeedback(result.error);
      return;
    }
    toast("success", "Senha alterada.");
    closePasswordModal();
  }

  const subTabs: { key: UsuariosSubTab; label: string }[] = [
    { key: "equipe", label: "Equipe" },
    { key: "representantes", label: "Representantes" },
    { key: "minha_conta", label: "Minha conta" },
  ];

  return (
    <div>
      <div className={styles.subTabBar}>
        {subTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.subTab} ${subTab === t.key ? styles.subTabActive : ""}`}
            onClick={() => setSubTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "equipe" && (
        <div className={styles.listPanel}>
          <div className={styles.listPanelHeader}>
            <div className={styles.listPanelTitle}>
              <span className={styles.listPanelName}>Equipe</span>
              {!loading && <span className={styles.listPanelCount}>{users.length}</span>}
            </div>
            <button
              type="button"
              className={styles.panelAddBtn}
              onClick={() => { setShowInvite((v) => !v); setInviteFeedback(null); }}
              style={showInvite ? { background: "var(--color-brand-selected-bg)", color: "var(--color-brand)" } : undefined}
            >
              <UserPlus size={13} strokeWidth={2.5} />
              Convidar
            </button>
          </div>

          {showInvite && (
            <div className={styles.inviteBox} style={{ margin: 16 }}>
              <div className={styles.fieldStack}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="invite-email">E-mail do novo usuário</label>
                  <input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={styles.input} placeholder="usuario@email.com" />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Nível de acesso</span>
                  <div className={styles.segmentRow}>
                    {(["admin", "editor"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`${styles.segmentBtn} ${inviteRole === r ? styles.segmentBtnActive : ""}`}
                        onClick={() => setInviteRole(r)}
                      >
                        {r === "admin" ? "Admin" : "Editor"}
                      </button>
                    ))}
                  </div>
                  <span className={styles.fieldHint}>
                    {inviteRole === "admin" ? "Acesso completo à gestão." : "Pode registrar partidas e relatórios."}
                  </span>
                </div>
              </div>
              {inviteFeedback && <p className={styles.formError} style={{ marginTop: 12 }}>{inviteFeedback}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" className={styles.modalPrimaryBtn} onClick={() => void handleInvite()} disabled={inviting || !inviteEmail}>
                  {inviting ? "Enviando…" : "Enviar convite"}
                </button>
                <button type="button" style={secondaryButtonStyle} onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteFeedback(null); }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className={styles.loadingMono} style={{ padding: "24px 18px" }}>Carregando usuários…</p>
          ) : loadError ? (
            <p className={styles.formError} style={{ margin: 16 }}>{loadError}</p>
          ) : users.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <p className={styles.listPanelEmptyTitle}>Nenhum usuário</p>
              <p className={styles.listPanelEmptyDesc}>Convide membros da equipe para colaborar na gestão.</p>
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} className={`${styles.listRow} ${u.role === "inactive" ? styles.listRowInactive : ""}`}>
                <UserAvatar role={u.role} />
                <div className={styles.listRowMain}>
                  <p className={styles.listRowTitle}>{u.full_name ?? "Sem nome"}</p>
                  <p className={styles.listRowSub}>{u.email}</p>
                </div>
                <span className={roleBadgeClass(u.role)}>{ROLE_LABEL[u.role] ?? u.role}</span>
                <span className={styles.listRowDate}>{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                {u.role !== "main" && u.role !== "inactive" && (
                  <button
                    type="button"
                    className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                    onClick={() => void handleDeactivate(u.id, u.full_name ?? "")}
                    disabled={deactivatingId === u.id}
                    title="Desativar usuário"
                  >
                    <UserX size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {subTab === "representantes" && <TabRepresentantes orgId={orgId} />}

      {subTab === "minha_conta" && (
        <div className={styles.singleCard}>
          <EntityHubSectionHeader title="Minha conta" subtitle="Perfil e segurança do administrador principal" />
          <div className={styles.accountCard}>
            <UserAvatar role={userProfile?.role ?? "main"} />
            <div>
              <p className={styles.listRowTitle}>{userProfile?.full_name ?? "Administrador"}</p>
              <span className={roleBadgeClass(userProfile?.role ?? "main")} style={{ marginTop: 6, display: "inline-block" }}>
                {ROLE_LABEL[userProfile?.role ?? "main"]}
              </span>
            </div>
          </div>
          <div className={styles.accountActions}>
            <button type="button" className={styles.modalPrimaryBtn} onClick={() => { setShowPasswordModal(true); setPasswordFeedback(null); }}>
              <KeyRound size={14} strokeWidth={2.5} />
              Alterar senha
            </button>
          </div>
        </div>
      )}

      <HubModal open={showPasswordModal} title="Alterar senha" onClose={closePasswordModal}>
        <div className={styles.fieldStack}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="new-pass">Nova senha</label>
            <input id="new-pass" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className={styles.input} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="confirm-pass">Confirmar nova senha</label>
            <input id="confirm-pass" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className={styles.input} />
          </div>
        </div>
        {passwordFeedback && <p className={styles.formError} style={{ marginTop: 14 }}>{passwordFeedback}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button type="button" className={styles.modalPrimaryBtn} onClick={() => void handleAlterarSenha()} disabled={savingPassword || !novaSenha || !confirmarSenha}>
            {savingPassword ? "Salvando…" : "Confirmar"}
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={closePasswordModal} disabled={savingPassword}>Cancelar</button>
        </div>
      </HubModal>
    </div>
  );
}

function normalizeColor(value: string | null | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  return fallback;
}

export default function ConfiguracoesClient({
  org,
  userProfile,
}: {
  org: Org | null;
  userProfile: UserProfile | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("geral");

  const [name, setName] = useState(org?.name ?? "");
  const [slug, setSlug] = useState(org?.slug ?? "");
  const [socialHandles, setSocialHandles] = useState<SocialHandles>(() => handlesFromOrg(org));
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(org?.logo_url ?? null);
  const [savingGeral, setSavingGeral] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(normalizeColor(org?.primary_color, "#bff205"));
  const [secondaryColor, setSecondaryColor] = useState(normalizeColor(org?.secondary_color, "#0a0a0a"));
  const [tertiaryColor, setTertiaryColor] = useState(normalizeColor(org?.tertiary_color, "#ffffff"));

  useEffect(() => {
    if (!pendingLogo) {
      setHeaderLogoUrl(org?.logo_url ?? null);
      return;
    }
    const url = URL.createObjectURL(pendingLogo);
    setHeaderLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo, org?.logo_url]);

  async function handleSaveGeral(e: React.FormEvent) {
    e.preventDefault();
    setSavingGeral(true);
    const social = handlesToFormFields(socialHandles);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("instagram_url", social.instagram_url);
    fd.append("youtube_url", social.youtube_url);
    fd.append("tiktok_url", social.tiktok_url);
    fd.append("twitter_url", social.twitter_url);
    fd.append("custom_domain", org?.custom_domain ?? "");
    fd.append("primary_color", primaryColor);
    fd.append("secondary_color", secondaryColor);
    fd.append("tertiary_color", tertiaryColor);
    fd.append("description", org?.description ?? "");
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await salvarOrganizacao(org?.id, fd);
    setSavingGeral(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Configurações salvas.");
    setPendingLogo(null);
    router.refresh();
  }

  const initials = (name || org?.name || "").slice(0, 2).toUpperCase() || "—";
  const headerTitle = (name || org?.name || "Configurações").toUpperCase();
  const statusLabel = org?.status === "active" ? "Ativa" : org?.status ?? "—";
  const headerDetail = org?.slug
    ? `06.score/${slug || org.slug} · ${statusLabel}`
    : statusLabel;

  const tabs = [
    { key: "geral", label: "GERAL" },
    { key: "usuarios", label: "USUÁRIOS" },
  ];

  const showSave = activeTab === "geral";
  const saveFormId = "form-config-geral";
  const saving = savingGeral;

  return (
    <EntityHubShell
      breadcrumb={[{ label: "Configurações" }]}
      avatar={
        <div className={styles.logoSlot}>
          {headerLogoUrl
            ? <img src={headerLogoUrl} alt="" className={styles.logoImg} />
            : <span className={styles.logoInitials}>{initials}</span>
          }
        </div>
      }
      title={headerTitle}
      subtitle={headerDetail}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as Tab)}
      showSave={showSave}
      saveFormId={saveFormId}
      saving={saving}
      contentClassName={activeTab === "usuarios" ? styles.contentWide : undefined}
    >
      {activeTab === "geral" && (
        <form id="form-config-geral" onSubmit={(e) => void handleSaveGeral(e)} className={styles.formWrap}>
          <EntityHubSectionHeader title="Organização" subtitle="Nome, slug e logotipo" />

          <div className={styles.identityBlock}>
            <div className={styles.identityLogo}>
              <EntityLogoUpload
                value={pendingLogo}
                onChange={setPendingLogo}
                existingUrl={org?.logo_url}
                label="Logotipo"
                hint="PNG, WebP ou SVG"
              />
            </div>
            <div className={styles.fieldStack} style={{ flex: 1, minWidth: 220 }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="org-name">Nome da organização *</label>
                <input id="org-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="org-slug">Slug *</label>
                <input
                  id="org-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className={styles.input}
                />
                <span className={styles.fieldHint}>URL pública: 06.score/{slug || "seu-slug"}</span>
              </div>
            </div>
          </div>

          <div className={styles.sectionSpacer} />

          <EntityHubSectionHeader title="Identidade visual" subtitle="Paleta de cores da marca" />

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Cores</span>
            <div className={styles.colorTiles}>
              <EntityColorPicker value={primaryColor} onChange={setPrimaryColor} ariaLabel="Cor primária" />
              <EntityColorPicker value={secondaryColor} onChange={setSecondaryColor} ariaLabel="Cor secundária" />
              <EntityColorPicker value={tertiaryColor} onChange={setTertiaryColor} ariaLabel="Cor terciária" />
            </div>
          </div>

          <div className={styles.colorPreviewBox}>
            <p className={styles.colorPreviewLabel}>Preview ao vivo</p>
            <div className={styles.colorPreviewRow}>
              <span className={styles.colorPreviewSwatch} style={{ backgroundColor: primaryColor }} />
              <span className={styles.colorPreviewSwatch} style={{ backgroundColor: secondaryColor }} />
              <span className={styles.colorPreviewSwatch} style={{ backgroundColor: tertiaryColor }} />
              <button type="button" className={styles.colorPreviewBtn} style={{ backgroundColor: primaryColor, color: secondaryColor }}>
                Botão exemplo
              </button>
              <span className={styles.colorPreviewLink} style={{ color: primaryColor }}>Link de destaque</span>
              <span className={styles.colorPreviewLink} style={{ color: tertiaryColor }}>Texto terciário</span>
            </div>
          </div>

          <div className={styles.sectionSpacer} />

          <EntityHubSectionHeader title="Redes sociais" subtitle="Informe apenas o @ de cada rede" />

          <SocialHandlesField value={socialHandles} onChange={setSocialHandles} />
        </form>
      )}

      {activeTab === "usuarios" && (
        <TabUsuarios orgId={org?.id ?? ""} userProfile={userProfile} />
      )}
    </EntityHubShell>
  );
}
