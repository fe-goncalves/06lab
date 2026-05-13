"use client";

import { criarMembro } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { X } from "lucide-react";

type StaffRole = { id: string; full_name: string };

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
  colorScheme: "dark" as any,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.35)",
  marginBottom: 6,
  display: "block",
};

export function NovoMembroModal({
  isOpen,
  onClose,
  defaultGender,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultGender?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState(defaultGender ?? "");
  const [staffRoleId, setStaffRoleId] = useState("");
  const [rg, setRg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("staff_roles").select("id, full_name")
      .eq("sport_slug", "football7").order("display_order")
      .then(({ data }) => setRoles((data ?? []) as StaffRole[]));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setFullName(""); setSurname(""); setStaffRoleId("");
      setRg(""); setBirthDate(""); setFile(null); setError(null); setLoading(false);
      setGender(defaultGender ?? "");
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    }
  }, [isOpen, defaultGender]);

  useEffect(() => {
    if (defaultGender) setGender(defaultGender);
  }, [defaultGender]);

  function applyDateMask(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  }

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
      fd.append("surname", surname.trim());
      fd.append("gender", gender);
      fd.append("staff_role_id", staffRoleId);
      fd.append("rg", rg);
      fd.append("birth_date", birthDate);
      if (file) fd.append("photo", file);
      const result = await criarMembro(fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/comissao/${result.id}`);
      onClose();
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.78)",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#0e0e0e",
          padding: 24,
        }}
      >
        {/* Header do modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "0.04em",
          }}>
            NOVO MEMBRO
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.4)",
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Função */}
          <div>
            <span style={labelStyle}>Função</span>
            <select value={staffRoleId} onChange={e => setStaffRoleId(e.target.value)} style={inputStyle}>
              <option value="">Selecione…</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>

          {/* Nome completo */}
          <div>
            <span style={labelStyle}>Nome completo *</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Apelido */}
          <div>
            <span style={labelStyle}>Apelido</span>
            <input
              type="text"
              value={surname}
              onChange={e => setSurname(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Gênero — pill buttons */}
          <div>
            <span style={labelStyle}>Gênero</span>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: "male",   label: "Masculino" },
                { value: "female", label: "Feminino"  },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: gender === opt.value
                      ? "1px solid rgba(191,242,5,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: gender === opt.value
                      ? "rgba(191,242,5,0.08)"
                      : "rgba(255,255,255,0.03)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: gender === opt.value ? 700 : 400,
                    color: gender === opt.value ? "#BFF205" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* RG */}
          <div>
            <span style={labelStyle}>RG</span>
            <input
              type="text"
              value={rg}
              onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))}
              style={inputStyle}
            />
          </div>

          {/* Data de nascimento */}
          <div>
            <span style={labelStyle}>Data de nascimento</span>
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={birthDate}
              onChange={e => setBirthDate(applyDateMask(e.target.value))}
              onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
              maxLength={10}
              style={{ ...inputStyle, letterSpacing: "0.05em" }}
            />
          </div>

          {/* Foto */}
          <div>
            <span style={labelStyle}>Foto</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                ...inputStyle,
                textAlign: "left" as const,
                cursor: "pointer",
                color: file ? "var(--color-text-primary)" : "rgba(255,255,255,0.25)",
              }}
            >
              {file ? file.name : "Escolher foto…"}
            </button>
            {previewUrl && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                <img
                  src={previewUrl}
                  alt=""
                  style={{
                    width: 80, height: 80, borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid rgba(191,242,5,0.3)",
                  }}
                />
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "#FF4444",
              backgroundColor: "rgba(255,68,68,0.07)",
              border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: 8, padding: "8px 12px", margin: 0,
            }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 9,
              border: "none",
              backgroundColor: loading ? "rgba(191,242,5,0.3)" : "#BFF205",
              color: "#0a0a0a",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.15s",
            }}
          >
            {loading ? "Salvando…" : "CRIAR MEMBRO"}
          </button>
        </form>
      </div>
    </div>
  );
}