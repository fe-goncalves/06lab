"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarLocal } from "../actions";
import { ImageCropUpload } from "@/app/(lab)/components/image-crop-upload";

type Venue = {
  id: string;
  full_name: string;
  short_name: string | null;
  address: string | null;
  display_order: number | null;
  logo_url: string | null;
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.25), transparent)" }} />
    </div>
  );
}

export default function LocalHub({ venue }: { venue: Venue }) {
  const router = useRouter();

  const [fullName, setFullName] = useState(venue.full_name);
  const [shortName, setShortName] = useState(venue.short_name ?? "");
  const [address, setAddress] = useState(venue.address ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(venue.display_order ?? 0));
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(venue.logo_url);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pendingLogo) {
      setHeaderLogoUrl(venue.logo_url);
      return;
    }
    const url = URL.createObjectURL(pendingLogo);
    setHeaderLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo, venue.logo_url]);

  async function handleSave() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("address", address.trim());
      fd.append("display_order", displayOrder);
      if (pendingLogo) fd.append("logo", pendingLogo);
      const result = await editarLocal(venue.id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingLogo(null);
      router.refresh();
    } finally { setSaving(false); }
  }

  const displayLogo = headerLogoUrl;

  const fieldLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6,
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      {/* Header */}
      <div style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding: "20px 32px" }}>
          <Breadcrumb items={[{ label: "Locais", href: "/locais" }, { label: venue.full_name }]} />

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, overflow: "hidden",
              border: "2px solid rgba(191,242,5,0.3)",
              backgroundColor: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {displayLogo ? (
                <img src={displayLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                  {(venue.short_name ?? venue.full_name).slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.1 }}>
                {venue.full_name.toUpperCase()}
              </h1>
              {venue.short_name && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3, display: "block" }}>
                  {venue.short_name.toUpperCase()}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !fullName.trim()}
              style={{
                padding: "9px 18px", borderRadius: 9, border: "none", flexShrink: 0,
                backgroundColor: saving || !fullName.trim() ? "rgba(191,242,5,0.3)" : "#BFF205",
                color: "#0a0a0a",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.08em", textTransform: "uppercase",
                cursor: saving || !fullName.trim() ? "not-allowed" : "pointer",
                transition: "all 0.12s",
              }}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, alignItems: "start" }}>

          {/* Card — Logo */}
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", padding: 20 }}>
            <SectionHeader label="Logo" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <ImageCropUpload
                value={pendingLogo}
                onChange={setPendingLogo}
                existingUrl={venue.logo_url}
                label=""
                placeholder="Enviar logo"
                accept="image/png,image/webp,image/jpeg"
              />
            </div>
          </div>

          {/* Card — Dados */}
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", padding: 20 }}>
            <SectionHeader label="Dados" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={fieldLabel}>Nome completo *</span>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
              </div>
              <div>
                <span style={fieldLabel}>Nome curto</span>
                <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} placeholder="Abreviação exibida na lista" style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
              </div>
              <div>
                <span style={fieldLabel}>Endereço</span>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro" style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
              </div>
              <div style={{ maxWidth: 140 }}>
                <span style={fieldLabel}>Ordem de exibição</span>
                <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}