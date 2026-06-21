"use client";

import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "@/app/(lab)/components/toast";
import { LabCheckbox } from "@/app/(lab)/components/lab-checkbox";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";
import { ImageCropUpload } from "@/app/(lab)/components/image-crop-upload";
import {
  atualizarRepresentante,
  desativarRepresentante,
  reativarRepresentante,
  excluirRepresentante,
  verificarPodeExcluirRepresentante,
  type RepresentativeRow,
  type TeamOption,
} from "@/app/(lab)/configuracoes/actions";
import {
  modalCloseButtonStyle,
  modalHeaderDividerStyle,
  modalOverlayStyle,
  modalPanelStyle,
  secondaryButtonStyle,
} from "@/lib/lab-ui-styles";
import styles from "@/app/(lab)/components/entity-hub.module.css";

function TeamLogoMini({
  team,
  size = 28,
}: {
  team: { logo_url: string | null; short_label: string; full_name: string };
  size?: number;
}) {
  return (
    <div
      className={styles.hubListTeamLogoMain}
      title={team.full_name}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {team.logo_url ? (
        <img src={team.logo_url} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className={styles.hubListTeamLogoFallback}>{team.short_label.slice(0, 2)}</span>
      )}
    </div>
  );
}

function teamDisplayName(team: TeamOption): string {
  return team.short_name?.trim() || team.full_name;
}

type Props = {
  rep: RepresentativeRow;
  teams: TeamOption[];
  onClose: () => void;
  onUpdated: () => void;
  onRemoved: (id: string) => void;
};

export function RepresentanteDetailModal({ rep, teams, onClose, onUpdated, onRemoved }: Props) {
  const [fullName, setFullName] = useState(rep.full_name);
  const [email, setEmail] = useState(rep.email);
  const [status, setStatus] = useState(rep.status);
  const [newPassword, setNewPassword] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>(rep.teams.map((t) => t.id));
  const [teamSearch, setTeamSearch] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [deleteReasons, setDeleteReasons] = useState<string[]>([]);

  const isActive = status === "active";

  useEffect(() => {
    setFullName(rep.full_name);
    setEmail(rep.email);
    setStatus(rep.status);
    setTeamIds(rep.teams.map((t) => t.id));
    setNewPassword("");
    setPhotoFile(null);
    setRemovePhoto(false);
    setFeedback(null);
  }, [rep]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await verificarPodeExcluirRepresentante(rep.id);
      if (cancelled || "error" in result) return;
      setCanDelete(result.canDelete);
      setDeleteReasons(result.reasons);
    })();
    return () => { cancelled = true; };
  }, [rep.id, status]);

  const q = teamSearch.trim().toLowerCase();
  const filteredTeams = q
    ? teams.filter((t) =>
        t.full_name.toLowerCase().includes(q)
        || (t.short_name ?? "").toLowerCase().includes(q)
        || t.short_label.toLowerCase().includes(q),
      )
    : teams;

  function toggleTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const fd = new FormData();
    fd.append("full_name", fullName);
    fd.append("email", email);
    if (newPassword) fd.append("new_password", newPassword);
    if (removePhoto) fd.append("remove_photo", "true");
    if (photoFile) fd.append("photo", photoFile);
    teamIds.forEach((id) => fd.append("team_ids", id));

    const result = await atualizarRepresentante(rep.id, fd);
    setSaving(false);
    if ("error" in result) {
      setFeedback(result.error);
      return;
    }
    toast("success", "Representante atualizado.");
    onUpdated();
    onClose();
  }

  async function handleStatusChange(active: boolean) {
    if (actionPending || saving) return;
    if (!active) {
      if (!confirm(`Desativar "${fullName}"? O login ficará bloqueado.`)) return;
    }

    setActionPending(true);
    const result = active
      ? await reativarRepresentante(rep.id)
      : await desativarRepresentante(rep.id);
    setActionPending(false);

    if ("error" in result) {
      toast("error", result.error);
      return;
    }

    setStatus(active ? "active" : "inactive");
    toast("success", active ? "Representante reativado." : "Representante desativado.");
  }

  async function handleDelete() {
    if (!canDelete) return;
    if (!confirm(`Excluir permanentemente "${fullName}"? Esta ação não pode ser desfeita.`)) return;

    setActionPending(true);
    const result = await excluirRepresentante(rep.id);
    setActionPending(false);

    if ("error" in result) {
      toast("error", result.error);
      return;
    }

    toast("success", "Representante excluído.");
    onRemoved(rep.id);
    onClose();
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{ ...modalPanelStyle, maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "16px 20px",
          ...modalHeaderDividerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--color-text-primary)", margin: 0,
            }}>
              Representante
            </p>
            <p className={styles.hubRowMetaPrimary} style={{ margin: "4px 0 0" }}>
              Login, senha e equipes gerenciadas
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ ...modalCloseButtonStyle, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <LabSwitch
              variant="glass"
              checked={isActive}
              onChange={(checked) => void handleStatusChange(checked)}
              disabled={actionPending || saving}
              label={isActive ? "Ativo" : "Inativo"}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <ImageCropUpload
              value={photoFile}
              onChange={(file) => {
                setPhotoFile(file);
                if (file) setRemovePhoto(false);
              }}
              existingUrl={removePhoto ? null : rep.photo_url}
              aspect={1}
              placeholder="Foto"
            />
            <div style={{ minWidth: 0 }}>
              <p className={styles.athleteListNickname}>{fullName.toUpperCase()}</p>
              <span className={`${styles.hubChip} ${isActive ? styles.hubChipBrand : styles.hubChipWarning}`}>
                {isActive ? "Acesso liberado" : "Login bloqueado"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px 16px", overflowY: "auto", flex: 1 }}>
          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="rep-edit-name">Nome completo</label>
              <input id="rep-edit-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="rep-edit-email">E-mail (login)</label>
              <input id="rep-edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="rep-edit-pass">Nova senha</label>
              <input
                id="rep-edit-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                placeholder="Deixe em branco para manter"
                autoComplete="new-password"
              />
            </div>

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
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Buscar equipe…"
                  className={styles.input}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <div className={styles.teamCheckList}>
                {filteredTeams.length === 0 ? (
                  <p className={styles.loadingMono} style={{ textAlign: "center", padding: "16px 12px" }}>
                    Nenhuma equipe encontrada.
                  </p>
                ) : (
                  filteredTeams.map((team) => {
                    const checked = teamIds.includes(team.id);
                    const primary = teamDisplayName(team);
                    const showFull = team.short_name && team.short_name.trim() !== team.full_name;
                    return (
                      <label
                        key={team.id}
                        className={`${styles.teamCheckRow} ${checked ? styles.teamCheckRowSelected : ""}`}
                      >
                        <LabCheckbox checked={checked} onChange={() => toggleTeam(team.id)} accentColor="var(--color-brand)" />
                        <TeamLogoMini team={team} />
                        <span className={styles.teamCheckName}>
                          <strong>{primary}</strong>
                          {showFull && (
                            <span style={{ display: "block", fontSize: 11, color: "var(--news-caption)", fontWeight: 400 }}>
                              {team.full_name}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {feedback && <p className={styles.formError} style={{ marginTop: 14 }}>{feedback}</p>}
        </div>

        <div style={{
          padding: "12px 20px 20px",
          borderTop: "1px solid var(--color-divider-strong)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className={styles.modalPrimaryBtn}
              onClick={() => void handleSave()}
              disabled={saving || actionPending || !fullName.trim() || !email.trim() || teamIds.length === 0}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
            <button type="button" style={secondaryButtonStyle} onClick={onClose} disabled={saving || actionPending}>
              Cancelar
            </button>
            {canDelete ? (
              <button
                type="button"
                className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}
                onClick={() => void handleDelete()}
                disabled={saving || actionPending}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.hubInlineBtn} ${styles.hubInlineBtnDanger}`}
                disabled
                title={deleteReasons.join(", ")}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}
          </div>
          {!canDelete && deleteReasons.length > 0 && (
            <p className={styles.hubRowMetaPrimary} style={{ margin: "10px 0 0", fontSize: 11 }}>
              Exclusão indisponível: {deleteReasons.join(", ")}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
