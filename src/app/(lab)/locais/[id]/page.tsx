"use client";

import { editarLocal } from "../actions";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function LocalPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
    setFeedback(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("address", address.trim());
      fd.append("display_order", displayOrder);
      if (pendingLogo) fd.append("logo", pendingLogo);
      const result = await editarLocal(id, fd);
      if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
      setFeedback({ type: "success", text: "Alterações salvas." });
      setPendingLogo(null);
      await load();
    } finally { setSaving(false); }
  }

  const displayLogo = previewUrl ?? logoUrl;

  if (loading) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {displayLogo ? (
            <img src={displayLogo} alt="" className="h-16 w-16 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border text-lg font-bold"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>{fullName || "Local"}</h1>
        </div>
        <button type="submit" form="form-local" disabled={saving}
          className="rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </header>

      {feedback && (
        <div className="mb-6 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: feedback.type === "error" ? "var(--color-danger)" : "var(--color-success)" }}>
          {feedback.text}
        </div>
      )}

      <form id="form-local" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Logo</h2>
            <div className="mb-4 flex justify-center">
              {displayLogo ? (
                <img src={displayLogo} alt="" className="h-32 w-32 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border text-2xl font-bold"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                  {fullName.slice(0, 2).toUpperCase()}
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
  );
}