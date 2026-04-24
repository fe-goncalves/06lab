"use client";

import { editarArbitro } from "../actions";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const REFEREE_ROLES = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "Árbitro" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "Assistente" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "Mesário" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "Staff" },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function ArbitroPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [refereeRoleId, setRefereeRoleId] = useState("");
  const [phone, setPhone] = useState("");
  const [pixKey, setPixKey] = useState("");
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
    setRefereeRoleId(ref.referee_role_id ?? "");
    setPhone(ref.phone ?? "");
    setPixKey(ref.pix_key ?? "");
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
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("referee_role_id", refereeRoleId);
      fd.append("phone", phone.trim());
      fd.append("pix_key", pixKey.trim());
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarArbitro(id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingPhoto(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      await load();
    } finally { setSaving(false); }
  }

  const displayPhoto = previewUrl ?? photoUrl;
  const roleLabel = REFEREE_ROLES.find(r => r.id === refereeRoleId)?.label ?? null;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  if (loading) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-4">
          <Breadcrumb items={[{ label: "Árbitros", href: "/arbitros" }, { label: fullName || "Árbitro" }]} />
          <div className="flex items-center gap-4">
            {displayPhoto ? (
              <img src={displayPhoto} alt="" className="h-14 w-14 shrink-0 rounded-full border object-cover"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {initialsFromName(fullName || "?")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {fullName || "Árbitro"}
              </h1>
              {roleLabel && (
                <span className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>{roleLabel}</span>
              )}
            </div>
            <button type="submit" form="form-arbitro" disabled={saving}
              className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6">
        <form id="form-arbitro" onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Foto */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Foto</h2>
              <div className="mb-4 flex justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="" className="h-32 w-32 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border text-2xl font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {initialsFromName(fullName || "?")}
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

            {/* Dados */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados</h2>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Função</span>
                  <select value={refereeRoleId} onChange={e => setRefereeRoleId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Selecione…</option>
                    {REFEREE_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Telefone</span>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Chave Pix</span>
                  <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" className={inputClass} style={inputStyle} />
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}