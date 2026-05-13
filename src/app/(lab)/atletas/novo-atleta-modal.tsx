"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { criarAtleta } from "./actions";
import { Camera, X } from "lucide-react";

type Position = { id: string; full_name: string; is_goalkeeper: boolean };

function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function NovoAtletaModal({
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

  const [positions, setPositions] = useState<Position[]>([]);
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState(defaultGender ?? "");
  const [positionId, setPositionId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rg, setRg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    supabase.from("player_positions").select("id, full_name, is_goalkeeper")
      .eq("sport_slug", "football7").order("display_order")
      .then(({ data }) => setPositions((data ?? []) as Position[]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFullName(""); setSurname(""); setPositionId("");
      setBirthDate(""); setRg(""); setFile(null); setError(null);
      setGender(defaultGender ?? "");
      setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return null; });
    }
  }, [isOpen, defaultGender]);

  useEffect(() => { if (defaultGender) setGender(defaultGender); }, [defaultGender]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return f ? URL.createObjectURL(f) : null; });
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      if (surname) fd.append("surname", surname.trim());
      if (gender) fd.append("gender", gender);
      if (positionId) fd.append("position_id", positionId);
      if (birthDate) fd.append("birth_date", birthDate);
      if (rg) fd.append("rg", rg);
      if (file) fd.append("photo", file);
      const result = await criarAtleta(fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/atletas/${result.id}`);
      onClose();
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  const border = "1px solid rgba(255,255,255,0.08)";
  const inputBaseStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)",
    outline: "none", transition: "border-color 0.15s", colorScheme: "dark" as any,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.78)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        role="dialog" aria-modal="true"
        style={{ width: "100%", maxWidth: 420, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>Novo atleta</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>Preencha as informações básicas</p>
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border, background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.4)"; e.currentTarget.style.color = "#BFF205"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
            <X size={14} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <form id="novo-atleta-form" onSubmit={handleSubmit}>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Preview foto + upload */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <label htmlFor="novo-atleta-foto" style={{ cursor: "pointer" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", border: previewUrl ? "2px solid rgba(191,242,5,0.4)" : "2px dashed rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(191,242,5,0.5)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = previewUrl ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.1)"}>
                    {previewUrl
                      ? <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ textAlign: "center" as const }}>
                          <Camera size={20} color="rgba(255,255,255,0.15)" />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>FOTO</p>
                        </div>
                    }
                  </div>
                </label>
                <input id="novo-atleta-foto" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }} onChange={handleFileChange} />
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>JPG, PNG ou WebP</p>
              </div>

              {/* Nome completo */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nome completo *</span>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: João Pedro Silva"
                  style={inputBaseStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>

              {/* Apelido */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Apelido</span>
                <input type="text" value={surname} onChange={e => setSurname(e.target.value)}
                  placeholder="Como aparece nas listas"
                  style={inputBaseStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>

              {/* Gênero — pill buttons */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 7 }}>Gênero</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: "male", l: "Masculino" }, { v: "female", l: "Feminino" }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setGender(opt.v)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${gender === opt.v ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: gender === opt.v ? "rgba(191,242,5,0.08)" : "transparent", color: gender === opt.v ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posição — pill buttons */}
              {positions.length > 0 && (
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 7 }}>Posição</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    <button type="button" onClick={() => setPositionId("")}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${!positionId ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: !positionId ? "rgba(191,242,5,0.08)" : "transparent", color: !positionId ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                      —
                    </button>
                    {positions.map(p => (
                      <button key={p.id} type="button" onClick={() => setPositionId(p.id)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${positionId === p.id ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: positionId === p.id ? "rgba(191,242,5,0.08)" : "transparent", color: positionId === p.id ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data de nascimento + RG */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nascimento</span>
                  <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                    onChange={e => setBirthDate(applyDateMask(e.target.value))}
                    onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
                    maxLength={10} style={inputBaseStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>RG</span>
                  <input type="text" value={rg}
                    onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))}
                    style={inputBaseStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
              </div>

              {/* Erro */}
              {error && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4444", backgroundColor: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 9, border, background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="submit" form="novo-atleta-form" disabled={loading || !fullName.trim()}
            style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: loading || !fullName.trim() ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: loading || !fullName.trim() ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
            {loading ? "Criando…" : "Criar atleta"}
          </button>
        </div>
      </div>
    </div>
  );
}