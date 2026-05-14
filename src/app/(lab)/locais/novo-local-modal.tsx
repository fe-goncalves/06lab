"use client";

import { criarLocal } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { X, ImagePlus } from "lucide-react";

export function NovoLocalModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [address, setAddress] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setFullName(""); setShortName(""); setAddress(""); setDisplayOrder("0");
    setFile(null); setError(null); setLoading(false);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, [isOpen]);

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
      fd.append("short_name", shortName.trim());
      fd.append("address", address.trim());
      fd.append("display_order", displayOrder);
      if (file) fd.append("logo", file);
      const result = await criarLocal(fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/locais/${result.id}`);
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
              Novo local
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>
              Preencha os dados do espaço esportivo
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

          {/* Logo */}
          <div>
            <span style={fieldLabel}>Logo</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 56, height: 56, borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", flexShrink: 0,
                  transition: "border-color 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#BFF205")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <ImagePlus size={18} strokeWidth={1.5} color="rgba(255,255,255,0.2)" />
                )}
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                  {file ? file.name : "Nenhuma logo selecionada"}
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
                  Escolher arquivo →
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" style={{ display: "none" }} onChange={handleFileChange} />
          </div>

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
              onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
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
              onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
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
              onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
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
            {loading ? "Salvando…" : "Criar local"}
          </button>
        </div>
      </div>
    </div>
  );
}