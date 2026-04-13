"use client";

import { editarCompeticao } from "../actions";
import { useRef, useState } from "react";

type Competition = {
  id: string;
  full_name: string;
  short_name: string | null;
  gender: string;
  logo_url: string | null;
  division_above_id: string | null;
  division_below_id: string | null;
  pinned_in_sidebar: boolean;
};

type Props = {
  competition: Competition;
  allCompetitions: { id: string; full_name: string }[];
};

export default function CompeticaoEditForm({ competition, allCompetitions }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [fullName, setFullName] = useState(competition.full_name ?? "");
  const [shortName, setShortName] = useState(competition.short_name ?? "");
  const [gender, setGender] = useState(competition.gender ?? "male");
  const [divisionAboveId, setDivisionAboveId] = useState(competition.division_above_id ?? "");
  const [divisionBelowId, setDivisionBelowId] = useState(competition.division_below_id ?? "");
  const [pinnedInSidebar, setPinnedInSidebar] = useState(competition.pinned_in_sidebar ?? false);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayLogo = previewUrl ?? competition.logo_url;

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
      fd.append("gender", gender);
      fd.append("division_above_id", divisionAboveId);
      fd.append("division_below_id", divisionBelowId);
      fd.append("pinned_in_sidebar", String(pinnedInSidebar));
      if (pendingLogo) fd.append("logo", pendingLogo);
      const result = await editarCompeticao(competition.id, fd);
      if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
      setFeedback({ type: "success", text: "Alterações salvas." });
      setPendingLogo(null);
    } finally { setSaving(false); }
  }

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <>
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
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>{fullName || "Competição"}</h1>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {gender === "male" ? "Masculino" : "Feminino"}
            </p>
          </div>
        </div>
        <button type="submit" form="form-competicao" disabled={saving}
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

      <form id="form-competicao" onSubmit={handleSubmit}>
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
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
                <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Divisão superior</span>
                <select value={divisionAboveId} onChange={e => setDivisionAboveId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Nenhuma</option>
                  {allCompetitions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Divisão inferior</span>
                <select value={divisionBelowId} onChange={e => setDivisionBelowId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Nenhuma</option>
                  {allCompetitions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={pinnedInSidebar} onChange={e => setPinnedInSidebar(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Fixar na sidebar</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}