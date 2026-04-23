"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarCompeticao } from "../../actions";

export default function ConfiguracoesCompeticaoClient({
  competition,
  allCompetitions,
}: {
  competition: any;
  allCompetitions: any[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(competition.full_name ?? "");
  const [shortName, setShortName] = useState(competition.short_name ?? "");
  const [gender, setGender] = useState(competition.gender ?? "");
  const [pinned, setPinned] = useState(competition.pinned_in_sidebar ?? false);
  const [divisionAbove, setDivisionAbove] = useState(competition.division_above_id ?? "");
  const [divisionBelow, setDivisionBelow] = useState(competition.division_below_id ?? "");
  const [logoUrl, setLogoUrl] = useState(competition.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewLogo(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
  }

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("short_name", shortName.trim());
    fd.append("gender", gender);
    fd.append("pinned_in_sidebar", String(pinned));
    fd.append("division_above_id", divisionAbove);
    fd.append("division_below_id", divisionBelow);
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await editarCompeticao(competition.id, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Competição salva com sucesso.");
    router.refresh();
  }

  const displayLogo = previewLogo ?? logoUrl;

  return (
    <div className="p-6 md:p-8">
      <Breadcrumb items={[
        { label: "Competições", href: "/competicoes" },
        { label: competition.full_name ?? "Competição", href: `/competicoes/${competition.id}` },
        { label: "Configurações" },
      ]} />

      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {displayLogo ? (
            <img src={displayLogo} alt="" className="h-14 w-14 rounded-xl border object-contain"
              style={{ borderColor: "var(--color-border)" }} />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border font-display text-lg font-bold"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {fullName || "Competição"}
            </h1>
            <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Configurações gerais
            </p>
          </div>
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 max-w-3xl">
        {/* Logo */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Logo</h2>
          <div className="mb-4 flex justify-center">
            {displayLogo ? (
              <img src={displayLogo} alt="" className="h-28 w-28 rounded-xl border object-contain"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border font-display text-2xl font-bold"
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

        {/* Dados */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados gerais</h2>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome curto</span>
              <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
              <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Divisão acima</span>
              <select value={divisionAbove} onChange={e => setDivisionAbove(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Nenhuma</option>
                {allCompetitions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Divisão abaixo</span>
              <select value={divisionBelow} onChange={e => setDivisionBelow(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Nenhuma</option>
                {allCompetitions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Fixar na sidebar</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}