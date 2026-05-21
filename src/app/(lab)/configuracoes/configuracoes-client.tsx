"use client";

import { salvarOrganizacao, alterarSenha, listarUsuarios, convidarUsuario, desativarUsuario } from "./actions";
import { useEffect, useRef, useState } from "react";
import { Camera, Globe, Palette, AlignLeft, Users, UserPlus, UserX, Link2, ExternalLink } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Org {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  status: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
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

type Tab = "organizacao" | "site" | "usuarios";

// ─── Estilos base (DS) ───────────────────────────────────────────────────────

const inputBaseStyle: React.CSSProperties = {
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
  colorScheme: "dark" as any,
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5,
    }}>
      {children}
    </span>
  );
}

function FeedbackMessage({ type, text }: { type: "success" | "error"; text: string }) {
  const isError = type === "error";
  return (
    <p style={{
      fontFamily: "var(--font-mono)", fontSize: 11,
      color: isError ? "#FF4444" : "#BFF205",
      backgroundColor: isError ? "rgba(255,68,68,0.07)" : "rgba(191,242,5,0.06)",
      border: `1px solid ${isError ? "rgba(255,68,68,0.2)" : "rgba(191,242,5,0.2)"}`,
      borderRadius: 8, padding: "8px 12px", margin: 0, marginTop: 16,
    }}>
      {text}
    </p>
  );
}

function SaveButton({ saving, label, disabled, onClick }: {
  saving: boolean; label: string; disabled?: boolean; onClick: () => void;
}) {
  const isDisabled = saving || disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        padding: "10px 28px", borderRadius: 9, border: "none",
        backgroundColor: isDisabled ? "rgba(191,242,5,0.3)" : "#BFF205",
        color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11,
        fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
        cursor: isDisabled ? "not-allowed" : "pointer", transition: "all 0.12s",
      }}
    >
      {saving ? "Salvando…" : label}
    </button>
  );
}

function StyledInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputBaseStyle}
      onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
    />
  );
}

// ─── Aba Organização ──────────────────────────────────────────────────────────

function TabOrganizacao({ org, onSaved }: { org: Org | null; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(org?.name ?? "");
  const [slug, setSlug] = useState(org?.slug ?? "");
  const [instagramUrl, setInstagramUrl] = useState(org?.instagram_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(org?.youtube_url ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(org?.tiktok_url ?? "");
  const [twitterUrl, setTwitterUrl] = useState(org?.twitter_url ?? "");
  const [logoUrl] = useState(org?.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const displayLogo = previewUrl ?? logoUrl;
  const initials = name.slice(0, 2).toUpperCase() || "—";

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("instagram_url", instagramUrl);
    fd.append("youtube_url", youtubeUrl);
    fd.append("tiktok_url", tiktokUrl);
    fd.append("twitter_url", twitterUrl);
    // Preserva campos de outras abas com valores atuais
    fd.append("custom_domain", org?.custom_domain ?? "");
    fd.append("primary_color", org?.primary_color ?? "");
    fd.append("secondary_color", org?.secondary_color ?? "");
    fd.append("description", org?.description ?? "");
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await salvarOrganizacao(org?.id, fd);
    setSaving(false);
    if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
    setFeedback({ type: "success", text: "Configurações salvas com sucesso." });
    setPendingLogo(null);
    onSaved();
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "var(--color-surface)", padding: "20px 20px 24px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Card — Dados gerais */}
      <div style={cardStyle}>
        <SectionHeader title="Dados da organização" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Logo */}
          <div>
            <FieldLabel>Logotipo</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  border: "2px solid rgba(191,242,5,0.3)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  {displayLogo
                    ? <img src={displayLogo} style={{ width: 48, height: 48, objectFit: "contain" }} alt="" />
                    : <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.2)" }}>{initials}</span>
                  }
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} style={{
                  position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%",
                  backgroundColor: "#BFF205", border: "2px solid var(--color-background)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <Camera size={10} strokeWidth={2.5} color="#0a0a0a" />
                </button>
              </div>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block" }}>
                  {pendingLogo ? pendingLogo.name : "PNG, WebP ou SVG"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
                  Clique no ícone para trocar
                </span>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" style={{ display: "none" }} onChange={handleLogoChange} />
            </div>
          </div>
          {/* Nome */}
          <div>
            <FieldLabel>Nome da organização *</FieldLabel>
            <StyledInput value={name} onChange={setName} />
          </div>
          {/* Slug */}
          <div>
            <FieldLabel>Slug *</FieldLabel>
            <StyledInput value={slug} onChange={v => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", display: "block", marginTop: 5 }}>
              URL pública: 06.score/{slug || "seu-slug"}
            </span>
          </div>
        </div>
      </div>

      {/* Card — Redes sociais */}
      <div style={cardStyle}>
        <SectionHeader title="Redes sociais" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Instagram", icon: <ExternalLink size={13} color="#BFF205" />, value: instagramUrl, set: setInstagramUrl, placeholder: "https://instagram.com/suaorganizacao" },
            { label: "YouTube", icon: <ExternalLink size={13} color="#BFF205" />, value: youtubeUrl, set: setYoutubeUrl, placeholder: "https://youtube.com/@suaorganizacao" },
            { label: "TikTok", icon: <Link2 size={13} color="#BFF205" />, value: tiktokUrl, set: setTiktokUrl, placeholder: "https://tiktok.com/@suaorganizacao" },
            { label: "Twitter / X", icon: <Link2 size={13} color="#BFF205" />, value: twitterUrl, set: setTwitterUrl, placeholder: "https://x.com/suaorganizacao" },
          ].map(({ label, icon, value, set, placeholder }) => (
            <div key={label}>
              <FieldLabel>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {icon} {label}
                </span>
              </FieldLabel>
              <StyledInput value={value} onChange={set} placeholder={placeholder} type="url" />
            </div>
          ))}
        </div>
      </div>

      {feedback && <FeedbackMessage type={feedback.type} text={feedback.text} />}
      <div>
        <SaveButton saving={saving} label="Salvar configurações" onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Aba Site ─────────────────────────────────────────────────────────────────

function TabSite({ org, onSaved }: { org: Org | null; onSaved: () => void }) {
  const [customDomain, setCustomDomain] = useState(org?.custom_domain ?? "");
  const [primaryColor, setPrimaryColor] = useState(org?.primary_color ?? "#BFF205");
  const [secondaryColor, setSecondaryColor] = useState(org?.secondary_color ?? "#0a0a0a");
  const [description, setDescription] = useState(org?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preview ao vivo das cores
  useEffect(() => {
    document.documentElement.style.setProperty("--color-brand", primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-secondary", secondaryColor);
  }, [secondaryColor]);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const fd = new FormData();
    // Preserva campos de outras abas
    fd.append("name", org?.name ?? "");
    fd.append("slug", org?.slug ?? "");
    fd.append("instagram_url", org?.instagram_url ?? "");
    fd.append("youtube_url", org?.youtube_url ?? "");
    fd.append("tiktok_url", org?.tiktok_url ?? "");
    fd.append("twitter_url", org?.twitter_url ?? "");
    // Campos desta aba
    fd.append("custom_domain", customDomain);
    fd.append("primary_color", primaryColor);
    fd.append("secondary_color", secondaryColor);
    fd.append("description", description);
    const result = await salvarOrganizacao(org?.id, fd);
    setSaving(false);
    if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
    setFeedback({ type: "success", text: "Configurações do site salvas." });
    onSaved();
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "var(--color-surface)", padding: "20px 20px 24px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cardStyle}>
        <SectionHeader title="Identidade do site público" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* URL do site */}
          <div>
            <FieldLabel><span style={{ display: "flex", alignItems: "center", gap: 5 }}><Globe size={11} color="#BFF205" /> URL do site público</span></FieldLabel>
            <StyledInput value={customDomain} onChange={setCustomDomain} placeholder="orange.06score.com" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", display: "block", marginTop: 5 }}>
              Domínio ou subdomínio do 06.score
            </span>
          </div>

          {/* Descrição */}
          <div>
            <FieldLabel><span style={{ display: "flex", alignItems: "center", gap: 5 }}><AlignLeft size={11} color="#BFF205" /> Descrição da organização</span></FieldLabel>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Uma breve descrição da sua organização…"
              rows={3}
              style={{
                ...inputBaseStyle,
                resize: "vertical",
                minHeight: 80,
                lineHeight: 1.5,
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          {/* Cores */}
          <div>
            <FieldLabel><span style={{ display: "flex", alignItems: "center", gap: 5 }}><Palette size={11} color="#BFF205" /> Cores da organização</span></FieldLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Cor primária", value: primaryColor, set: setPrimaryColor },
                { label: "Cor secundária", value: secondaryColor, set: setSecondaryColor },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    {label}
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Color picker nativo */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        backgroundColor: value,
                        border: "2px solid rgba(255,255,255,0.12)",
                        cursor: "pointer", overflow: "hidden",
                      }}>
                        <input
                          type="color"
                          value={value}
                          onChange={e => set(e.target.value)}
                          style={{
                            position: "absolute", inset: 0,
                            width: "150%", height: "150%",
                            opacity: 0, cursor: "pointer",
                          }}
                        />
                      </div>
                    </div>
                    {/* Input hex */}
                    <input
                      type="text"
                      value={value}
                      onChange={e => {
                        const v = e.target.value;
                        set(v);
                      }}
                      maxLength={7}
                      style={{ ...inputBaseStyle, width: "100%", fontFamily: "var(--font-mono)", fontSize: 12 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Preview ao vivo */}
            <div style={{
              marginTop: 16, padding: "14px 16px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Preview ao vivo
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: primaryColor, border: "2px solid rgba(255,255,255,0.1)" }} />
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: secondaryColor, border: "2px solid rgba(255,255,255,0.1)" }} />
                <button style={{
                  padding: "6px 16px", borderRadius: 7, border: "none",
                  backgroundColor: primaryColor, color: secondaryColor || "#0a0a0a",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  cursor: "default",
                }}>
                  Botão exemplo
                </button>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: primaryColor, fontWeight: 700,
                }}>
                  Link de destaque
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feedback && <FeedbackMessage type={feedback.type} text={feedback.text} />}
      <div>
        <SaveButton saving={saving} label="Salvar configurações do site" onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Aba Usuários ─────────────────────────────────────────────────────────────

function TabUsuarios({ orgId }: { orgId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

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
    if ("error" in result) { setInviteFeedback({ type: "error", text: result.error }); return; }
    setInviteFeedback({ type: "success", text: `Convite enviado para ${inviteEmail}.` });
    setInviteEmail(""); setShowInvite(false);
    // Recarrega lista
    const updated = await listarUsuarios(orgId);
    if (!("error" in updated)) setUsers(updated.users);
  }

  async function handleDeactivate(profileId: string, name: string) {
    if (!confirm(`Desativar o acesso de "${name || "este usuário"}"?`)) return;
    setDeactivatingId(profileId);
    const result = await desativarUsuario(profileId);
    setDeactivatingId(null);
    if ("error" in result) { alert(result.error); return; }
    setUsers(prev => prev.map(u => u.id === profileId ? { ...u, role: "inactive" } : u));
  }

  const roleLabel: Record<string, string> = {
    main: "Principal",
    admin: "Admin",
    editor: "Editor",
    inactive: "Inativo",
  };

  const roleColor: Record<string, string> = {
    main: "#BFF205",
    admin: "#60a5fa",
    editor: "#a78bfa",
    inactive: "#666",
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "var(--color-surface)", padding: "20px 20px 24px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205" }}>
              Usuários
            </span>
            <div style={{ flex: 1, height: 1, width: 60, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
          </div>
          <button
            type="button"
            onClick={() => { setShowInvite(v => !v); setInviteFeedback(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "none",
              backgroundColor: showInvite ? "rgba(191,242,5,0.15)" : "#BFF205",
              color: showInvite ? "#BFF205" : "#0a0a0a",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            <UserPlus size={13} strokeWidth={2.5} />
            Convidar
          </button>
        </div>

        {/* Formulário de convite */}
        {showInvite && (
          <div style={{
            marginBottom: 20, padding: "16px", borderRadius: 10,
            border: "1px solid rgba(191,242,5,0.2)",
            backgroundColor: "rgba(191,242,5,0.04)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <FieldLabel>E-mail do novo usuário</FieldLabel>
                <StyledInput value={inviteEmail} onChange={setInviteEmail} placeholder="usuario@email.com" type="email" />
              </div>
              <div>
                <FieldLabel>Nível de acesso</FieldLabel>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["admin", "editor"] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      style={{
                        padding: "7px 18px", borderRadius: 8,
                        border: `1px solid ${inviteRole === r ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`,
                        backgroundColor: inviteRole === r ? "rgba(191,242,5,0.1)" : "transparent",
                        color: inviteRole === r ? "#BFF205" : "rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                      }}
                    >
                      {r === "admin" ? "Admin" : "Editor"}
                    </button>
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", display: "block", marginTop: 5 }}>
                  {inviteRole === "admin" ? "Acesso completo à gestão." : "Pode registrar partidas e relatórios."}
                </span>
              </div>
              {inviteFeedback && <FeedbackMessage type={inviteFeedback.type} text={inviteFeedback.text} />}
              <div style={{ display: "flex", gap: 8 }}>
                <SaveButton saving={inviting} label="Enviar convite" onClick={handleInvite} disabled={!inviteEmail} />
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteFeedback(null); }}
                  style={{
                    padding: "10px 20px", borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de usuários */}
        {loading ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "24px 0" }}>
            Carregando usuários…
          </p>
        ) : loadError ? (
          <FeedbackMessage type="error" text={loadError} />
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Users size={32} color="rgba(255,255,255,0.1)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Nenhum usuário encontrado.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {users.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: u.role === "inactive" ? "rgba(255,255,255,0.04)" : "rgba(191,242,5,0.08)",
                  border: `2px solid ${u.role === "inactive" ? "rgba(255,255,255,0.08)" : "rgba(191,242,5,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: roleColor[u.role] ?? "#BFF205" }}>
                    {(u.full_name ?? u.email).slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    {u.full_name ?? <span style={{ color: "rgba(255,255,255,0.3)" }}>Sem nome</span>}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email}
                  </p>
                </div>

                {/* Role badge */}
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                  border: `1px solid ${(roleColor[u.role] ?? "#BFF205") + "44"}`,
                  color: roleColor[u.role] ?? "#BFF205",
                  backgroundColor: (roleColor[u.role] ?? "#BFF205") + "11",
                }}>
                  {roleLabel[u.role] ?? u.role}
                </span>

                {/* Data */}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", flexShrink: 0, minWidth: 70, textAlign: "right" }}>
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </span>

                {/* Botão desativar */}
                {u.role !== "main" && u.role !== "inactive" && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(u.id, u.full_name ?? "")}
                    disabled={deactivatingId === u.id}
                    title="Desativar usuário"
                    style={{
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      width: 30, height: 30, borderRadius: 7,
                      border: "1px solid rgba(255,68,68,0.2)",
                      backgroundColor: "transparent",
                      color: "rgba(255,68,68,0.5)",
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,68,68,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#FF4444"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,68,68,0.5)"; }}
                  >
                    <UserX size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card — Minha conta (permanece na aba Usuários) */}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracoesClient({
  org,
  userProfile,
}: {
  org: Org | null;
  userProfile: UserProfile | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("organizacao");

  // Senha state
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initials = (org?.name ?? "").slice(0, 2).toUpperCase() || "—";

  async function handleSavePassword() {
    setSavingPassword(true);
    setPasswordFeedback(null);
    const fd = new FormData();
    fd.append("new_password", newPassword);
    const result = await alterarSenha(fd);
    setSavingPassword(false);
    if ("error" in result) { setPasswordFeedback({ type: "error", text: result.error }); return; }
    setPasswordFeedback({ type: "success", text: "Senha alterada com sucesso." });
    setNewPassword("");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "organizacao", label: "Organização" },
    { key: "site", label: "Site" },
    { key: "usuarios", label: "Usuários" },
  ];

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, rgba(191,242,5,0.06) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--color-surface)", opacity: 0.85, pointerEvents: "none" }} />
        <div style={{ padding: "20px 32px 0", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, border: "2px solid rgba(191,242,5,0.3)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {org?.logo_url
                ? <img src={org.logo_url} style={{ width: 48, height: 48, objectFit: "contain" }} alt="" />
                : <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.2)" }}>{initials}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
                {org?.name ?? "Configurações"}
              </h1>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Organização
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, border: `1px solid ${org?.status === "active" ? "rgba(191,242,5,0.4)" : "rgba(166,166,166,0.3)"}`, color: org?.status === "active" ? "#BFF205" : "#A6A6A6", backgroundColor: org?.status === "active" ? "rgba(191,242,5,0.08)" : "rgba(166,166,166,0.06)" }}>
                  {org?.status === "active" ? "Ativa" : org?.status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab.key ? "#BFF205" : "transparent"}`,
                  backgroundColor: "transparent",
                  color: activeTab === tab.key ? "#BFF205" : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: "pointer", transition: "all 0.12s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, rgba(191,242,5,0.5) 0%, transparent 60%)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* ── Conteúdo das abas ────────────────────────────────────────────────── */}
      <div style={{ padding: "32px 32px", maxWidth: 680 }}>
        {activeTab === "organizacao" && (
          <>
            <TabOrganizacao org={org} onSaved={() => {}} />
            {/* Minha conta — aparece ao final da aba Organização */}
            <div style={{ marginTop: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205" }}>Minha conta</span>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(191,242,5,0.1)", border: "2px solid rgba(191,242,5,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#BFF205" }}>
                      {(userProfile?.full_name ?? "A").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                      {userProfile?.full_name ?? "Administrador"}
                    </p>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(191,242,5,0.4)", color: "#BFF205", backgroundColor: "rgba(191,242,5,0.08)", display: "inline-block", marginTop: 4 }}>
                      Administrador principal
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nova senha</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={inputBaseStyle}
                    onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                  />
                </div>
              </div>
              {passwordFeedback && <FeedbackMessage type={passwordFeedback.type} text={passwordFeedback.text} />}
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={handleSavePassword}
                  disabled={savingPassword || newPassword.length < 6}
                  style={{
                    padding: "10px 28px", borderRadius: 9, border: "none",
                    backgroundColor: (savingPassword || newPassword.length < 6) ? "rgba(191,242,5,0.3)" : "#BFF205",
                    color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: (savingPassword || newPassword.length < 6) ? "not-allowed" : "pointer",
                  }}
                >
                  {savingPassword ? "Alterando…" : "Alterar senha"}
                </button>
              </div>
            </div>
          </>
        )}
        {activeTab === "site" && <TabSite org={org} onSaved={() => {}} />}
        {activeTab === "usuarios" && <TabUsuarios orgId={org?.id ?? ""} />}
      </div>
    </>
  );
}