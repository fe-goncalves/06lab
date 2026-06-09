"use client";

import { criarCompeticao } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { ImageCropUpload } from "@/app/(lab)/components/image-crop-upload";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { parseSupabaseError } from "@/lib/error-messages";

export function NovaCompeticaoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [gender, setGender] = useState("male");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setFullName("");
    setShortName("");
    setGender("male");
    setFile(null);
    setError(null);
    setLoading(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("gender", gender);
      if (file) fd.append("logo", file);
      const result = await criarCompeticao(fd);
      if ("error" in result) {
        setError(parseSupabaseError(result.error));
        return;
      }
      router.push(`/competicoes/${result.id}`);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const fieldLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.3)",
    display: "block",
    marginBottom: 5,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 9,
    border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.12s",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.78)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "#0e0e0e",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(191,242,5,0.03)",
            flexShrink: 0,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#BFF205",
                margin: 0,
              }}
            >
              Nova competição
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                margin: 0,
                marginTop: 2,
              }}
            >
              Preencha os dados da competição
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <ImageCropUpload
              value={file}
              onChange={setFile}
              label="Logo"
              placeholder="Enviar logo"
            />

            <div>
              <span style={fieldLabel}>Nome completo *</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Campeonato Municipal"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#BFF205")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <div>
              <span style={fieldLabel}>Nome curto</span>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ex: CAMMUN"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#BFF205")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <div>
              <span style={fieldLabel}>Gênero</span>
              <LabSelect
                value={gender}
                onChange={setGender}
                options={[
                  { value: "male", label: "Masculino" },
                  { value: "female", label: "Feminino" },
                ]}
              />
            </div>

            {error && (
              <p
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4444", margin: 0 }}
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 18px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              style={{
                flex: 2,
                padding: 10,
                borderRadius: 9,
                border: "none",
                backgroundColor: loading || !fullName.trim() ? "rgba(191,242,5,0.3)" : "#BFF205",
                color: "#0a0a0a",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: loading || !fullName.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Salvando…" : "Criar competição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
