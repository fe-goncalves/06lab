"use client";

import { criarLocal } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { ImageCropUpload } from "@/app/(lab)/components/image-crop-upload";
import { parseSupabaseError } from "@/lib/error-messages";

export function NovoLocalModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [address, setAddress] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setFullName(""); setShortName(""); setAddress(""); setDisplayOrder("0");
    setFile(null); setError(null); setLoading(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("address", address.trim());
      fd.append("display_order", displayOrder);
      if (file) fd.append("logo", file);
      const result = await criarLocal(fd);
      if ("error" in result) { setError(parseSupabaseError(result.error)); return; }
      router.push(`/locais/${result.id}`);
      onClose();
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  const fieldLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: "var(--color-text-faint)", display: "block", marginBottom: 5,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1px solid var(--color-input-border)",
    backgroundColor: "var(--color-input-bg)",
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
        padding: 16, backgroundColor: "var(--color-modal-scrim)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 440,
        borderRadius: 16,
        border: "1px solid var(--color-input-border-strong)",
        backgroundColor: "var(--color-modal-bg)",
        overflow: "hidden",
        boxShadow: "var(--color-modal-shadow)",
        maxHeight: "92vh",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--color-divider-strong)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "rgba(191,242,5,0.03)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand)", margin: 0 }}>
              Novo local
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", margin: 0, marginTop: 2 }}>
              Preencha os dados do espaço esportivo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid var(--color-input-border-strong)",
              backgroundColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--color-icon-muted)",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--color-divider-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-icon-muted)"; }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Logo */}
          <ImageCropUpload
            value={file}
            onChange={setFile}
            label="Logo"
            placeholder="Enviar logo"
            accept="image/png,image/webp,image/jpeg"
          />

          {/* Nome completo */}
          <div>
            <span style={fieldLabel}>Nome completo *</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ex: Arena Central"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-brand)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--color-input-border)")}
            />
          </div>

          {/* Nome curto */}
          <div>
            <span style={fieldLabel}>Nome curto</span>
            <input
              type="text"
              value={shortName}
              onChange={e => setShortName(e.target.value)}
              placeholder="Ex: ARENA"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-brand)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--color-input-border)")}
            />
          </div>

          {/* Endereço */}
          <div>
            <span style={fieldLabel}>Endereço</span>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rua, número, bairro"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-brand)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--color-input-border)")}
            />
          </div>

          {/* Ordem de exibição */}
          <div>
            <span style={fieldLabel}>Ordem de exibição</span>
            <input
              type="number"
              value={displayOrder}
              onChange={e => setDisplayOrder(e.target.value)}
              style={{ ...inputStyle, width: 100 }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-brand)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--color-input-border)")}
            />
          </div>

          {error && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)", margin: 0 }} role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid var(--color-hover-bg)",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: 10, borderRadius: 9,
              border: "1px solid var(--color-input-border-strong)",
              backgroundColor: "transparent",
              color: "var(--color-icon-muted)",
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
              backgroundColor: loading || !fullName.trim() ? "var(--color-brand-muted-bg)" : "var(--color-brand)",
              color: "var(--color-on-brand)",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: loading || !fullName.trim() ? "not-allowed" : "pointer",
              transition: "all 0.12s",
            }}
          >
            {loading ? "Salvando…" : "Criar local"}
          </button>
        </div>
      </div>
    </div>
  );
}