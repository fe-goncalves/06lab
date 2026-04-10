"use client";

import { criarArbitro } from "./actions";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

export function NovoArbitroModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [rg, setRg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profilePublic, setProfilePublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setFullName(""); setSurname(""); setRg(""); setBirthDate("");
    setProfilePublic(false); setFile(null); setError(null); setLoading(false);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, [isOpen]);

  function applyDateMask(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, 8);
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
      fd.append("rg", rg);
      fd.append("birth_date", birthDate);
      fd.append("profile_public", String(profilePublic));
      if (file) fd.append("photo", file);
      const result = await criarArbitro(fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/arbitros/${result.id}`);
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
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Novo árbitro</h2>
          <button type="button" onClick={onClose} className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo *</span>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Apelido</span>
            <input type="text" value={surname} onChange={e => setSurname(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>RG</span>
            <input type="text" value={rg} onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data de nascimento</span>
            <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
              onChange={e => setBirthDate(applyDateMask(e.target.value))}
              onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
              maxLength={10} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Foto</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-lg border px-3 py-2 text-sm text-left"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {file ? file.name : "Escolher foto…"}
            </button>
            {previewUrl && <img src={previewUrl} alt="" className="mt-2 mx-auto h-24 w-24 rounded-full object-cover border" style={{ borderColor: "var(--color-border)" }} />}
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={profilePublic} onChange={e => setProfilePublic(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Exibir perfil público no 06.score</span>
          </label>
          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }} role="alert">{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {loading ? "Salvando…" : "Criar árbitro"}
          </button>
        </form>
      </div>
    </div>
  );
}