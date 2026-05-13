"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { criarEquipe } from "./actions";
import { Camera, X } from "lucide-react";

type NovaEquipeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultGender?: string;
};

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function NovaEquipeModal({ isOpen, onClose, defaultGender }: NovaEquipeModalProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState(defaultGender ?? "male");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hexColors, setHexColors] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<(string | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setFullName("");
    setGender(defaultGender ?? "male");
    setFile(null);
    setHexColors([]);
    setSelectedColors([null, null, null]);
    setLoading(false);
    setError(null);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, [isOpen, defaultGender]);

  useEffect(() => { if (defaultGender) setGender(defaultGender); }, [defaultGender]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Extração de cores do logo
  useEffect(() => {
    if (!previewUrl) { setHexColors([]); setSelectedColors([null, null, null]); return; }
    if (file?.type === "image/svg+xml") { setHexColors([]); setSelectedColors([null, null, null]); return; }

    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 100; canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size).data;
        const colorMap: Record<string, number> = {};
        for (let i = 0; i < imageData.length; i += 4) {
          const a = imageData[i + 3];
          if (a < 128) continue;
          const r = Math.round(imageData[i] / 24) * 24;
          const g = Math.round(imageData[i + 1] / 24) * 24;
          const b = Math.round(imageData[i + 2] / 24) * 24;
          const isNeutral = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
          if (isNeutral && r > 220) continue;
          if (isNeutral && r < 30) continue;
          const key = `${r},${g},${b}`;
          colorMap[key] = (colorMap[key] ?? 0) + 1;
        }
        const sorted = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([key]) => { const [r, g, b] = key.split(",").map(Number); return rgbToHex(r, g, b); });
        setHexColors(sorted);
        // Pré-seleciona as 3 primeiras automaticamente
        setSelectedColors([sorted[0] ?? null, sorted[1] ?? null, sorted[2] ?? null]);
      } catch { setHexColors([]); setSelectedColors([null, null, null]); }
    };
    img.onerror = () => { setHexColors([]); setSelectedColors([null, null, null]); };
    return () => { img.onload = null; img.onerror = null; };
  }, [previewUrl, file]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return next ? URL.createObjectURL(next) : null; });
    setFile(next);
    if (next?.type === "image/svg+xml") { setHexColors([]); setSelectedColors([null, null, null]); }
  }, []);

  function toggleColorForSlot(hex: string, slotIndex: number) {
    setSelectedColors(prev => {
      const next = [...prev];
      next[slotIndex] = next[slotIndex] === hex ? null : hex;
      return next;
    });
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault(); setError(null); setLoading(true);
    try {
      const formData = new FormData();
      formData.append("full_name", fullName.trim());
      formData.append("gender", gender);
      if (file) formData.append("logo", file);
      if (selectedColors[0]) formData.append("primary_color", selectedColors[0]);
      if (selectedColors[1]) formData.append("secondary_color", selectedColors[1]);
      if (selectedColors[2]) formData.append("tertiary_color", selectedColors[2]);
      const result = await criarEquipe(formData);
      if (result.error) { setError(result.error); return; }
      if (!result.id) { setError("Não foi possível obter o ID da equipe criada."); return; }
      router.push(`/equipes/${result.id}`);
      onClose();
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  const border = "1px solid rgba(255,255,255,0.08)";
  const inputBaseStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)",
    outline: "none", transition: "border-color 0.15s", colorScheme: "dark" as any,
  };

  const slotLabels = ["Primária", "Secundária", "Terciária"];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.78)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        role="dialog" aria-modal="true" aria-labelledby="nova-equipe-title"
        style={{ width: "100%", maxWidth: 440, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0e0e0e", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0 }}>
          <div>
            <p id="nova-equipe-title" style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205", margin: 0 }}>Nova equipe</p>
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
          <form id="nova-equipe-form" onSubmit={handleSubmit}>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Preview logo + upload */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <label htmlFor="nova-equipe-logo" style={{ cursor: "pointer" }}>
                  <div style={{ width: 88, height: 88, borderRadius: 18, border: previewUrl ? "2px solid rgba(191,242,5,0.3)" : "2px dashed rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(191,242,5,0.4)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = previewUrl ? "rgba(191,242,5,0.3)" : "rgba(255,255,255,0.1)"}>
                    {previewUrl
                      ? <img src={previewUrl} alt="" style={{ width: 76, height: 76, objectFit: "contain" }} />
                      : <div style={{ textAlign: "center" as const }}>
                          <Camera size={22} color="rgba(255,255,255,0.15)" />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 4, letterSpacing: "0.08em" }}>LOGO</p>
                        </div>
                    }
                  </div>
                </label>
                <input id="nova-equipe-logo" type="file" accept="image/png,image/webp,image/svg+xml"
                  onChange={handleFileChange} style={{ display: "none" }} />
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>PNG, WebP ou SVG</p>
              </div>

              {/* Cores extraídas */}
              {hexColors.length > 0 && (
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 10 }}>
                    Cores detectadas — selecione para cada posição
                  </span>

                  {/* Slots de posição */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                    {slotLabels.map((label, slotIdx) => (
                      <div key={slotIdx} style={{ borderRadius: 10, border: `1px solid ${selectedColors[slotIdx] ? "rgba(191,242,5,0.25)" : "rgba(255,255,255,0.06)"}`, backgroundColor: selectedColors[slotIdx] ? "rgba(191,242,5,0.04)" : "rgba(255,255,255,0.02)", padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: selectedColors[slotIdx] ?? "rgba(255,255,255,0.06)", border: selectedColors[slotIdx] ? "2px solid rgba(255,255,255,0.2)" : "2px dashed rgba(255,255,255,0.1)", transition: "background 0.15s" }} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: selectedColors[slotIdx] ? "#BFF205" : "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
                        {selectedColors[slotIdx] && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: selectedColors[slotIdx]! }}>{selectedColors[slotIdx]}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Palette de cores detectadas */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    {hexColors.map((hex, i) => {
                      const slotIdx = selectedColors.findIndex(c => c === hex);
                      const isSelected = slotIdx !== -1;
                      return (
                        <div key={`${hex}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <button type="button"
                            onClick={() => {
                              // Ao clicar, atribui ao próximo slot vazio; se já está selecionado, remove
                              if (isSelected) {
                                setSelectedColors(prev => { const next = [...prev]; next[slotIdx] = null; return next; });
                              } else {
                                const emptySlot = selectedColors.findIndex(c => c === null);
                                if (emptySlot !== -1) toggleColorForSlot(hex, emptySlot);
                              }
                            }}
                            style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: hex, border: `2px solid ${isSelected ? "rgba(191,242,5,0.7)" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", transition: "border-color 0.12s", position: "relative" as const, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isSelected && (
                              <span style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#BFF205", border: "1.5px solid #0e0e0e", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, color: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {slotIdx + 1}
                              </span>
                            )}
                          </button>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.25)" }}>{hex}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nome completo */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nome completo *</span>
                <input id="nova-equipe-nome" type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: Dourados United FC"
                  style={inputBaseStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>

              {/* Gênero — pill buttons */}
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 7 }}>Gênero *</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: "male", l: "Masculino" }, { v: "female", l: "Feminino" }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setGender(opt.v)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${gender === opt.v ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: gender === opt.v ? "rgba(191,242,5,0.08)" : "transparent", color: gender === opt.v ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                      {opt.l}
                    </button>
                  ))}
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
          <button type="submit" form="nova-equipe-form" disabled={loading || !fullName.trim() || !gender}
            style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", backgroundColor: loading || !fullName.trim() || !gender ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: loading || !fullName.trim() || !gender ? "not-allowed" : "pointer", transition: "all 0.12s" }}>
            {loading ? "Criando…" : "Criar equipe"}
          </button>
        </div>
      </div>
    </div>
  );
}