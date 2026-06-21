"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { criarAtleta } from "./actions";
import { Camera, X } from "lucide-react";
import { inputBaseStyle } from "@/lib/lab-ui-styles";

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
  const [addAnother, setAddAnother] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    supabase.from("player_positions").select("id, full_name, is_goalkeeper")
      .eq("sport_slug", "football7").order("display_order")
      .then(({ data }) => setPositions((data ?? []) as Position[]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setSuccessCount(0);
      setAddAnother(false);
    }
  }, [isOpen, defaultGender]);

  useEffect(() => { if (defaultGender) setGender(defaultGender); }, [defaultGender]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  function resetForm() {
    setFullName("");
    setSurname("");
    setPositionId("");
    setBirthDate("");
    setRg("");
    setError(null);
    setGender(defaultGender ?? "");
    setFile(null);
    setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return null; });
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return f ? URL.createObjectURL(f) : null; });
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
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

      if (addAnother) {
        setSuccessCount(c => c + 1);
        resetForm();
      } else {
        router.push(`/atletas/${result.id}`);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const border = "1px solid var(--color-input-border)";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "var(--color-modal-scrim)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        role="dialog" aria-modal="true"
        style={{ width: "100%", maxWidth: 420, borderRadius: 16, border: "1px solid var(--color-input-border-strong)", backgroundColor: "var(--color-modal-bg)", overflow: "hidden", boxShadow: "var(--color-modal-shadow)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-divider-strong)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--color-brand)", margin: 0 }}>Novo atleta</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", margin: 0, marginTop: 2 }}>
              {successCount > 0
                ? <span style={{ color: "rgba(191,242,5,0.7)" }}>✓ {successCount} {successCount === 1 ? "atleta criado" : "atletas criados"} — próximo</span>
                : "Preencha as informações básicas"}
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border, background: "none", color: "var(--color-icon-muted)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-brand-border)"; e.currentTarget.style.color = "var(--color-brand)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-input-border)"; e.currentTarget.style.color = "var(--color-icon-muted)"; }}>
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
                  <div style={{ width: 80, height: 80, borderRadius: "50%", border: previewUrl ? "2px solid rgba(191,242,5,0.4)" : "2px dashed rgba(255,255,255,0.1)", backgroundColor: "var(--color-hover-bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-brand-border)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = previewUrl ? "var(--color-brand-border)" : "var(--color-input-border-strong)"}>
                    {previewUrl
                      ? <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ textAlign: "center" as const }}>
                          <Camera size={20} color="var(--color-dashed-border)" />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--color-text-ghost)", marginTop: 3 }}>FOTO</p>
                        </div>
                    }
                  </div>
                </label>
                <input id="novo-atleta-foto" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }} onChange={handleFileChange} />
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-text-ghost)" }}>JPG, PNG ou WebP</p>
              </div>

              {/* Nome completo */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-faint)", display: "block", marginBottom: 5 }}>Nome completo *</span>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: João Pedro Silva"
                  style={inputBaseStyle}
                  onFocus={e => e.target.style.borderColor = "var(--color-brand-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--color-input-border)"} />
              </div>

              {/* Apelido */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-faint)", display: "block", marginBottom: 5 }}>Apelido</span>
                <input type="text" value={surname} onChange={e => setSurname(e.target.value)}
                  placeholder="Como aparece nas listas"
                  style={inputBaseStyle}
                  onFocus={e => e.target.style.borderColor = "var(--color-brand-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--color-input-border)"} />
              </div>

              {/* Gênero */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-faint)", display: "block", marginBottom: 7 }}>Gênero</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: "male", l: "Masculino" }, { v: "female", l: "Feminino" }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setGender(opt.v)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${gender === opt.v ? "var(--color-brand-border)" : "var(--color-input-border)"}`, backgroundColor: gender === opt.v ? "var(--color-brand-selected-bg)" : "transparent", color: gender === opt.v ? "var(--color-brand)" : "var(--color-icon-muted)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posição */}
              {positions.length > 0 && (
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-faint)", display: "block", marginBottom: 7 }}>Posição</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    <button type="button" onClick={() => setPositionId("")}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${!positionId ? "var(--color-brand-border)" : "var(--color-input-border)"}`, backgroundColor: !positionId ? "var(--color-brand-selected-bg)" : "transparent", color: !positionId ? "var(--color-brand)" : "var(--color-icon-muted)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                      —
                    </button>
                    {positions.map(p => (
                      <button key={p.id} type="button" onClick={() => setPositionId(p.id)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${positionId === p.id ? "var(--color-brand-border)" : "var(--color-input-border)"}`, backgroundColor: positionId === p.id ? "var(--color-brand-selected-bg)" : "transparent", color: positionId === p.id ? "var(--color-brand)" : "var(--color-icon-muted)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nascimento + RG */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-faint)", display: "block", marginBottom: 5 }}>Nascimento</span>
                  <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                    onChange={e => setBirthDate(applyDateMask(e.target.value))}
                    onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
                    maxLength={10} style={inputBaseStyle}
                    onFocus={e => e.target.style.borderColor = "var(--color-brand-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--color-input-border)"} />
                </div>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--color-text-faint)", display: "block", marginBottom: 5 }}>RG</span>
                  <input type="text" value={rg}
                    onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))}
                    style={inputBaseStyle}
                    onFocus={e => e.target.style.borderColor = "var(--color-brand-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--color-input-border)"} />
                </div>
              </div>

              {/* Erro */}
              {error && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-danger)", backgroundColor: "var(--color-danger-muted-bg)", border: "1px solid var(--color-danger-muted-border)", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid var(--color-hover-bg)", flexShrink: 0 }}>
          {/* Checkbox adicionar outro */}
          <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <div
                onClick={() => setAddAnother(v => !v)}
                style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${addAnother ? "var(--color-brand)" : "var(--color-text-ghost)"}`,
                  backgroundColor: addAnother ? "var(--color-brand)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s", cursor: "pointer",
                }}>
                {addAnother && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span
                onClick={() => setAddAnother(v => !v)}
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: addAnother ? "rgba(191,242,5,0.8)" : "rgba(255,255,255,0.3)", transition: "color 0.12s" }}>
                Adicionar outro atleta ao salvar
              </span>
            </label>
          </div>

          {/* Botões */}
          <div style={{ display: "flex", gap: 8, padding: "14px 18px" }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: 10, borderRadius: 9, border, background: "none", color: "var(--color-icon-muted)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" form="novo-atleta-form" disabled={loading || !fullName.trim()}
              style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: loading || !fullName.trim() ? "var(--color-brand-muted-bg)" : "var(--color-brand)", color: "var(--color-on-brand)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: loading || !fullName.trim() ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
              {loading ? "Criando…" : addAnother ? "Criar e adicionar outro" : "Criar atleta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}