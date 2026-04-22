"use client";

import { editarArbitro } from "../actions";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function applyDateMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function formatDateToBR(iso: string | null) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

export default function ArbitroPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profilePublic, setProfilePublic] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: ref, error } = await supabase
      .from("referees").select("*").eq("id", id).maybeSingle();

    if (error || !ref) { setLoadError("Árbitro não encontrado."); setLoading(false); return; }

    setFullName(ref.full_name ?? "");
    setSurname(ref.surname ?? "");
    setRg(ref.rg ?? "");
    setCpf(ref.cpf ?? "");
    setBirthDate(formatDateToBR(ref.birth_date));
    setProfilePublic(ref.profile_public ?? false);
    setPhotoUrl(ref.photo_url);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingPhoto(f);
    setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("surname", surname.trim());
      fd.append("rg", rg);
      fd.append("cpf", cpf);
      fd.append("birth_date", birthDate);
      fd.append("profile_public", String(profilePublic));
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarArbitro(id, fd);
      if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
      setFeedback({ type: "success", text: "Alterações salvas." });
      setPendingPhoto(null);
      await load();
    } finally { setSaving(false); }
  }

  const displayPhoto = previewUrl ?? photoUrl;

  if (loading) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <Breadcrumb
        items={[
          { label: "Árbitros", href: "/arbitros" },
          { label: fullName || "Árbitro" },
        ]}
      />
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {displayPhoto ? (
            <img src={displayPhoto} alt="" className="h-16 w-16 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border text-lg font-bold"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>{fullName || "Árbitro"}</h1>
            {surname && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{surname}</p>}
          </div>
        </div>
        <button type="submit" form="form-arbitro" disabled={saving}
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

      <form id="form-arbitro" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Foto</h2>
            <div className="mb-4 flex justify-center">
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="h-32 w-32 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border text-2xl font-bold"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                  {fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
              Trocar foto
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
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Apelido</span>
                <input type="text" value={surname} onChange={e => setSurname(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>RG</span>
                <input type="text" value={rg} onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>CPF</span>
                <input type="text" value={cpf} onChange={e => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))} placeholder="000.000.000-00" className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data de nascimento</span>
                <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                  onChange={e => setBirthDate(applyDateMask(e.target.value))}
                  onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
                  maxLength={10} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={profilePublic} onChange={e => setProfilePublic(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Exibir perfil público no 06.score</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}