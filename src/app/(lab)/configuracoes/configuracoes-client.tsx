"use client";

import { salvarOrganizacao, alterarSenha } from "./actions";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Org {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  status: string | null;
  logo_url: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  organization_id: string;
}

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

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#BFF205",
      }}>
        {title}
      </span>
      <div style={{
        flex: 1,
        height: 1,
        background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)",
      }} />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.3)",
      display: "block",
      marginBottom: 5,
    }}>
      {children}
    </span>
  );
}

function FeedbackMessage({ type, text }: { type: "success" | "error"; text: string }) {
  const isError = type === "error";
  return (
    <p style={{
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: isError ? "#FF4444" : "#BFF205",
      backgroundColor: isError ? "rgba(255,68,68,0.07)" : "rgba(191,242,5,0.06)",
      border: `1px solid ${isError ? "rgba(255,68,68,0.2)" : "rgba(191,242,5,0.2)"}`,
      borderRadius: 8,
      padding: "8px 12px",
      margin: 0,
      marginTop: 16,
    }}>
      {text}
    </p>
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
  const fileRef = useRef<HTMLInputElement>(null);

  // Org state
  const [name, setName] = useState(org?.name ?? "");
  const [slug, setSlug] = useState(org?.slug ?? "");
  const [customDomain, setCustomDomain] = useState(org?.custom_domain ?? "");
  const [logoUrl] = useState(org?.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgFeedback, setOrgFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Senha state
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const displayLogo = previewUrl ?? logoUrl;
  const initials = name.slice(0, 2).toUpperCase() || "—";

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewUrl(old => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function handleSaveOrg() {
    setSavingOrg(true);
    setOrgFeedback(null);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("custom_domain", customDomain);
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await salvarOrganizacao(org?.id, fd);
    setSavingOrg(false);
    if ("error" in result) {
      setOrgFeedback({ type: "error", text: result.error });
      return;
    }
    setOrgFeedback({ type: "success", text: "Configurações salvas com sucesso." });
    setPendingLogo(null);
  }

  async function handleSavePassword() {
    setSavingPassword(true);
    setPasswordFeedback(null);
    const fd = new FormData();
    fd.append("new_password", newPassword);
    const result = await alterarSenha(fd);
    setSavingPassword(false);
    if ("error" in result) {
      setPasswordFeedback({ type: "error", text: result.error });
      return;
    }
    setPasswordFeedback({ type: "success", text: "Senha alterada com sucesso." });
    setNewPassword("");
  }

  const isPasswordValid = newPassword.length >= 6;

  return (
    <>
      {/* ── Header da página (padrão Hub) ─────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid var(--color-border)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Camada 1 — degradê brand */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(135deg, rgba(191,242,5,0.06) 0%, transparent 55%)",
        }} />
        {/* Camada 2 — overlay surface */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: "var(--color-surface)",
          opacity: 0.85,
          pointerEvents: "none",
        }} />

        {/* Conteúdo */}
        <div style={{ padding: "20px 32px 0", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {/* Logo da organização */}
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              border: "2px solid rgba(191,242,5,0.3)",
              backgroundColor: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0,
            }}>
              {displayLogo
                ? <img src={displayLogo} style={{ width: 48, height: 48, objectFit: "contain" }} alt="" />
                : <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900,
                    color: "rgba(255,255,255,0.2)",
                  }}>{initials}</span>
              }
            </div>

            {/* Nome + pills */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                fontWeight: 900,
                color: "var(--color-text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}>
                {org?.name ?? "Configurações"}
              </h1>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}>
                  Organização
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                  border: `1px solid ${org?.status === "active" ? "rgba(191,242,5,0.4)" : "rgba(166,166,166,0.3)"}`,
                  color: org?.status === "active" ? "#BFF205" : "#A6A6A6",
                  backgroundColor: org?.status === "active" ? "rgba(191,242,5,0.08)" : "rgba(166,166,166,0.06)",
                }}>
                  {org?.status === "active" ? "Ativa" : org?.status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Faixa 1px brand na borda inferior */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, rgba(191,242,5,0.5) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />
        </div>
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "32px 32px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>

        {/* Card — Organização */}
        <div style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          padding: "20px 20px 24px",
        }}>
          <SectionHeader title="Organização" />

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Upload de logo */}
            <div>
              <FieldLabel>Logotipo</FieldLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 12,
                    border: "2px solid rgba(191,242,5,0.3)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {displayLogo
                      ? <img src={displayLogo} style={{ width: 48, height: 48, objectFit: "contain" }} alt="" />
                      : <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 900,
                          color: "rgba(255,255,255,0.2)",
                        }}>{initials}</span>
                    }
                  </div>
                  {/* Botão câmera sobreposto */}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    style={{
                      position: "absolute", bottom: -4, right: -4,
                      width: 22, height: 22, borderRadius: "50%",
                      backgroundColor: "#BFF205",
                      border: "2px solid var(--color-background)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={10} strokeWidth={2.5} color="#0a0a0a" />
                  </button>
                </div>
                <div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    display: "block",
                  }}>
                    {pendingLogo ? pendingLogo.name : "PNG, WebP ou SVG"}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.06em",
                  }}>
                    Clique no ícone para trocar
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            {/* Nome */}
            <div>
              <FieldLabel>Nome da organização *</FieldLabel>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputBaseStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            {/* Slug */}
            <div>
              <FieldLabel>Slug *</FieldLabel>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                style={inputBaseStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 9,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.06em",
                display: "block", marginTop: 5,
              }}>
                URL pública: 06.score/{slug || "seu-slug"}
              </span>
            </div>

            {/* Domínio personalizado */}
            <div>
              <FieldLabel>Domínio personalizado</FieldLabel>
              <input
                type="text"
                value={customDomain}
                onChange={e => setCustomDomain(e.target.value)}
                placeholder="scores.suaorganizacao.com.br"
                style={inputBaseStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(191,242,5,0.4)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>
          </div>

          {orgFeedback && <FeedbackMessage type={orgFeedback.type} text={orgFeedback.text} />}

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={handleSaveOrg}
              disabled={savingOrg}
              style={{
                padding: "10px 28px",
                borderRadius: 9,
                border: "none",
                backgroundColor: savingOrg ? "rgba(191,242,5,0.3)" : "#BFF205",
                color: "#0a0a0a",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: savingOrg ? "not-allowed" : "pointer",
                transition: "all 0.12s",
              }}
            >
              {savingOrg ? "Salvando…" : "Salvar configurações"}
            </button>
          </div>
        </div>

        {/* Card — Minha conta */}
        <div style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          padding: "20px 20px 24px",
        }}>
          <SectionHeader title="Minha conta" />

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Info do usuário */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* Avatar inicial */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                backgroundColor: "rgba(191,242,5,0.1)",
                border: "2px solid rgba(191,242,5,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                  color: "#BFF205",
                }}>
                  {(userProfile?.full_name ?? "A").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                  color: "var(--color-text-primary)", margin: 0,
                }}>
                  {userProfile?.full_name ?? "Administrador"}
                </p>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                  border: "1px solid rgba(191,242,5,0.4)",
                  color: "#BFF205",
                  backgroundColor: "rgba(191,242,5,0.08)",
                  display: "inline-block", marginTop: 4,
                }}>
                  Administrador principal
                </span>
              </div>
            </div>

            {/* Nova senha */}
            <div>
              <FieldLabel>Nova senha</FieldLabel>
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
              disabled={savingPassword || !isPasswordValid}
              style={{
                padding: "10px 28px",
                borderRadius: 9,
                border: "none",
                backgroundColor: (savingPassword || !isPasswordValid) ? "rgba(191,242,5,0.3)" : "#BFF205",
                color: "#0a0a0a",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: (savingPassword || !isPasswordValid) ? "not-allowed" : "pointer",
                transition: "all 0.12s",
              }}
            >
              {savingPassword ? "Alterando…" : "Alterar senha"}
            </button>
          </div>
        </div>

        {/* Card — Sistema */}
        <div style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          padding: "20px 20px 24px",
        }}>
          <SectionHeader title="Sistema" />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Versão", value: "06.lab 0.1.0" },
              { label: "Stack", value: "Next.js + Supabase" },
              { label: "Org ID", value: org?.id ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  minWidth: 60,
                }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  wordBreak: "break-all",
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}