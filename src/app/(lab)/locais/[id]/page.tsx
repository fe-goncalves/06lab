"use client";

import { editarLocal } from "../actions";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function LocalPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [address, setAddress] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: venue, error } = await supabase
      .from("venues").select("*").eq("id", id).maybeSingle();

    if (error || !venue) { setLoadError("Local não encontrado."); setLoading(false); return; }

    setFullName(venue.full_name ?? "");
    setShortName(venue.short_name ?? "");
    setAddress(venue.address ?? "");
    setDisplayOrder(String(venue.display_order ?? 0));
    setLogoUrl(venue.logo_url);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("address", address.trim());
      fd.append("display_order", displayOrder);
      if (pendingLogo) fd.append("logo", pendingLogo);
      const result = await editarLocal(id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingLogo(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      await load();
    } finally { setSaving(false); }
  }

  const displayLogo = previewUrl ?? logoUrl;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  if (loading) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-4">
          <Breadcrumb items={[{ label: "Locais", href: "/locais" }, { label: fullName || "Local" }]} />
          <div className="flex items-center gap-4">
            {displayLogo ? (
              <img src={displayLogo} alt="" className="h-14 w-14 shrink-0 rounded-xl border object-contain"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {initialsFromName(fullName || "?")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {fullName || "Local"}
              </h1>
              {shortName && (
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{shortName}</span>
              )}
            </div>
            <button type="submit" form="form-local" disabled={saving}
              className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6">
        <form id="form-local" onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Logo */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Logo</h2>
              <div className="mb-4 flex justify-center">
                {displayLogo ? (
                  <img src={displayLogo} alt="" className="h-32 w-32 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl border text-2xl font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {initialsFromName(fullName || "?")}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                Trocar logo
              </button>
            </div>

            {/* Dados */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados</h2>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome curto</span>
                  <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Endereço</span>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ordem de exibição</span>
                  <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}