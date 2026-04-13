"use client";

import { criarCompeticao } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

export function NovaCompeticaoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [gender, setGender] = useState("male");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setFullName(""); setShortName(""); setGender("male");
    setFile(null); setError(null); setLoading(false);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
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
      fd.append("gender", gender);
      if (file) fd.append("logo", file);
      const result = await criarCompeticao(fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/competicoes/${result.id}`);
      onClose();
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div role="dialog" aria-modal="true" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Nova competição</h2>
          <button type="button" onClick={onClose} className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo *</span>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome curto</span>
            <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
            <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Logo</span>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-lg border px-3 py-2 text-sm text-left"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {file ? file.name : "Escolher logo…"}
            </button>
            {previewUrl && (
              <img src={previewUrl} alt="" className="mt-2 mx-auto h-24 w-24 rounded-xl object-contain border" style={{ borderColor: "var(--color-border)" }} />
            )}
          </label>
          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }} role="alert">{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {loading ? "Salvando…" : "Criar competição"}
          </button>
        </form>
      </div>
    </div>
  );
}