"use client";

import { criarArbitro } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { LabSelect } from "@/app/(lab)/components/lab-select";

const REFEREE_ROLES = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "Árbitro" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "Assistente" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "Mesário" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "Staff" },
];

export function NovoArbitroModal({
  isOpen,
  onClose,
  defaultRoleId,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultRoleId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [refereeRoleId, setRefereeRoleId] = useState(defaultRoleId ?? REFEREE_ROLES[0].id);
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFullName(""); setPhone(""); setPixKey(""); setGender("");
      setFile(null); setError(null); setLoading(false);
      setRefereeRoleId(defaultRoleId ?? REFEREE_ROLES[0].id);
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    }
  }, [isOpen, defaultRoleId]);

  useEffect(() => {
    if (defaultRoleId) setRefereeRoleId(defaultRoleId);
  }, [defaultRoleId]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; });
    setFile(f);
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("referee_role_id", refereeRoleId);
      fd.append("gender", gender);
      fd.append("phone", phone.trim());
      fd.append("pix_key", pixKey.trim());
      if (file) fd.append("photo", file);
      const result = await criarArbitro(fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/arbitros/${result.id}`);
      onClose();
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  const fieldLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-mono)", fontSize: 12,
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.12s",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backgroundColor: "rgba(0,0,0,0.78)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 440,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "#0e0e0e",
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        maxHeight: "92vh",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "rgba(191,242,5,0.03)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205", margin: 0 }}>
              Novo árbitro
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>
              Preencha os dados básicos para cadastrar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.4)",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Função — pill buttons */}
          <div>
            <span style={fieldLabel}>Função</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {REFEREE_ROLES.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setRefereeRoleId(role.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 20,
                    border: `1px solid ${refereeRoleId === role.id ? "#BFF205" : "rgba(255,255,255,0.1)"}`,
                    backgroundColor: refereeRoleId === role.id ? "rgba(191,242,5,0.1)" : "transparent",
                    color: refereeRoleId === role.id ? "#BFF205" : "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Foto */}
          <div>
            <span style={fieldLabel}>Foto</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.15)" }}>
                      {fullName ? fullName.slice(0, 2).toUpperCase() : "—"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: "50%",
                    backgroundColor: "#BFF205",
                    border: "2px solid #0e0e0e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Camera size={9} strokeWidth={2.5} color="#0a0a0a" />
                </button>
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                  {file ? file.name : "Nenhuma foto selecionada"}
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, color: "#BFF205",
                    background: "none", border: "none", padding: 0,
                    cursor: "pointer", marginTop: 3,
                  }}
                >
                  Escolher foto →
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
          </div>

          {/* Nome completo */}
          <div>
            <span style={fieldLabel}>Nome completo *</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ex: João Carlos Silva"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          {/* Gênero */}
          <div>
            <span style={fieldLabel}>Gênero</span>
            <LabSelect
              value={gender}
              onChange={setGender}
              options={[
                { value: "male", label: "Masculino" },
                { value: "female", label: "Feminino" },
                { value: "other", label: "Outro" },
              ]}
              placeholder="Gênero"
            />
          </div>

          {/* Telefone */}
          <div>
            <span style={fieldLabel}>Telefone</span>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          {/* Chave Pix */}
          <div>
            <span style={fieldLabel}>Chave Pix</span>
            <input
              type="text"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          {error && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4444", margin: 0 }} role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: 10, borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading || !fullName.trim()}
            style={{
              flex: 2, padding: 10, borderRadius: 9, border: "none",
              backgroundColor: loading || !fullName.trim() ? "rgba(191,242,5,0.3)" : "#BFF205",
              color: "#0a0a0a",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: loading || !fullName.trim() ? "not-allowed" : "pointer",
              transition: "all 0.12s",
            }}
          >
            {loading ? "Salvando…" : "Criar árbitro"}
          </button>
        </div>
      </div>
    </div>
  );
}