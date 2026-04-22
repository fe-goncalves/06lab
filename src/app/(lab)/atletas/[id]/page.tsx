"use client";

import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { editarAtleta, vincularAtleta } from "../actions";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type AthleteRow = {
  id: string;
  organization_id: string;
  full_name: string;
  surname: string | null;
  gender: string | null;
  photo_url: string | null;
  position_id: string | null;
  rg: string | null;
  cpf: string | null;
  birth_date: string | null;
};

type Position = { id: string; full_name: string; abbreviation: string };
type Team = { id: string; full_name: string };
type Stint = { id: string; team_id: string; teams: { id: string; full_name: string } };

function formatDateToBR(iso: string | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(br: string): string | null {
  const clean = br.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function AtletaPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [positions, setPositions] = useState<Position[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentStint, setCurrentStint] = useState<Stint | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTeamId, setTransferTeamId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState("");
  const [positionId, setPositionId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("user_profiles").select("organization_id")
      .eq("auth_user_id", user.id).maybeSingle();

    if (!profile?.organization_id) { setLoadError("Organização não encontrada."); setLoading(false); return; }

    const [{ data: athlete, error: athleteErr }, { data: posData }, { data: teamsData }, { data: stintData }] =
      await Promise.all([
        supabase.from("athletes").select("*").eq("id", id).maybeSingle(),
        supabase.from("player_positions").select("id, full_name, abbreviation").eq("sport_slug", "football7").order("display_order"),
        supabase.from("teams").select("id, full_name").eq("organization_id", profile.organization_id).order("full_name"),
        supabase.from("athlete_team_stints").select("id, team_id, teams(id, full_name)").eq("athlete_id", id).eq("is_current", true).maybeSingle(),
      ]);

    if (athleteErr || !athlete) { setLoadError("Atleta não encontrado."); setLoading(false); return; }

    const a = athlete as AthleteRow;
    setFullName(a.full_name ?? "");
    setSurname(a.surname ?? "");
    setGender(a.gender ?? "");
    setPositionId(a.position_id ?? "");
    setBirthDate(formatDateToBR(a.birth_date));
    setRg(a.rg ?? "");
    setCpf(a.cpf ?? "");
    setPhotoUrl(a.photo_url);
    setPositions((posData ?? []) as Position[]);
    setTeams((teamsData ?? []) as Team[]);
    setCurrentStint(stintData as Stint | null);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingPhoto(f);
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("surname", surname.trim());
      fd.append("gender", gender);
      fd.append("position_id", positionId);
      fd.append("birth_date", birthDate);
      fd.append("rg", rg);
      fd.append("cpf", cpf);
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarAtleta(id, fd);
      if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
      setFeedback({ type: "success", text: "Alterações salvas com sucesso." });
      setPendingPhoto(null);
      await load();
    } finally { setSaving(false); }
  }

  async function handleVincular() {
    if (!transferTeamId) return;
    setTransferring(true);
    const result = await vincularAtleta(id, transferTeamId);
    setTransferring(false);
    if ("error" in result) { setFeedback({ type: "error", text: result.error }); return; }
    setShowTransfer(false);
    setTransferTeamId("");
    await load();
  }

  const displayPhoto = previewUrl ?? photoUrl;
  const currentTeamName = (currentStint?.teams as { full_name: string } | null)?.full_name ?? null;

  if (loading) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };
  const labelStyle = { color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <Breadcrumb
        items={[
          { label: "Atletas", href: "/atletas" },
          { label: fullName || "Atleta" },
        ]}
      />
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {displayPhoto ? (
            <img src={displayPhoto} alt="" className="h-16 w-16 shrink-0 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-lg font-bold" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {initialsFromName(fullName || "?")}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>{fullName || "Atleta"}</h1>
            {surname && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{surname}</p>}
            {positionId && (
              <p className="text-xs font-mono" style={{ color: "var(--color-brand)" }}>
                {positions.find(p => p.id === positionId)?.abbreviation ?? ""}
              </p>
            )}
          </div>
        </div>
        <button type="submit" form="form-atleta" disabled={saving}
          className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </header>

      {feedback && (
        <div className="mb-6 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: feedback.type === "error" ? "var(--color-danger)" : "var(--color-success)" }} role="status">
          {feedback.text}
        </div>
      )}

      <form id="form-atleta" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card Foto */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Foto</h2>
            <div className="mb-4 flex justify-center">
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="h-32 w-32 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border text-2xl font-bold" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                  {initialsFromName(fullName || "?")}
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
              Trocar foto
            </button>
          </div>

          {/* Card Dados */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados</h2>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>Nome completo</span>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>Apelido</span>
                <input type="text" value={surname} onChange={e => setSurname(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>Gênero</span>
                <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Selecione…</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>Posição</span>
                <select value={positionId} onChange={e => setPositionId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>Data de nascimento</span>
                <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                  onChange={e => setBirthDate(applyDateMask(e.target.value))}
                  onPaste={e => { e.preventDefault(); const pasted = e.clipboardData.getData("text"); setBirthDate(applyDateMask(pasted)); }}
                  maxLength={10} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>RG</span>
                <input type="text" value={rg} onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={labelStyle}>CPF</span>
                <input type="text" value={cpf} onChange={e => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))} placeholder="000.000.000-00" className={inputClass} style={inputStyle} />
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* Vínculo com equipe */}
      <div className="mt-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Vínculo com equipe</h2>
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            Equipe atual: <span className="font-medium" style={{ color: currentTeamName ? "var(--color-brand)" : "var(--color-text-secondary)" }}>{currentTeamName ?? "Sem clube"}</span>
          </p>
          {!showTransfer ? (
            <button type="button" onClick={() => setShowTransfer(true)}
              className="self-start rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
              {currentTeamName ? "Transferir" : "Vincular equipe"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <select value={transferTeamId} onChange={e => setTransferTeamId(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                <option value="">Selecione a equipe…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
              <button type="button" onClick={handleVincular} disabled={!transferTeamId || transferring}
                className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {transferring ? "Salvando…" : "Confirmar"}
              </button>
              <button type="button" onClick={() => { setShowTransfer(false); setTransferTeamId(""); }}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}