"use client";

import {
  editarMembro, vincularMembroEquipe,
  adicionarStintMembro, removerStintMembro, editarStintMembro,
} from "../actions";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

type StaffRole  = { id: string; full_name: string };
type Team       = { id: string; full_name: string };
type StintHistory = {
  id: string; team_id: string; started_at: string; ended_at: string | null;
  is_current: boolean; movement_type: string | null;
  teams: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null } | null;
};

const MOVEMENT_LABELS: Record<string, string> = {
  arrival: "Chegada", transfer: "Transferência", loan: "Empréstimo", departure: "Saída",
};
const MOVEMENT_COLORS: Record<string, string> = {
  arrival: "#BFF205", transfer: "#A6A6A6", loan: "#F2C005", departure: "#FF4444",
};

const TABS = [
  { key: "informacoes",  label: "INFORMAÇÕES"  },
  { key: "historico",    label: "HISTÓRICO"    },
  { key: "estatisticas", label: "ESTATÍSTICAS" },
];

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
function parseDateToISO(br: string): string | null {
  const c = br.replace(/\D/g, "");
  if (c.length !== 8) return null;
  return `${c.slice(4, 8)}-${c.slice(2, 4)}-${c.slice(0, 2)}`;
}
function initialsFromName(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9, fontFamily: "var(--font-mono)", fontSize: 12,
  color: "var(--color-text-primary)", outline: "none", colorScheme: "dark" as any,
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.12em", textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.35)", marginBottom: 6, display: "block",
};

function SectionHeader({ title, accentColor }: { title: string; accentColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase" as const,
        color: accentColor,
      }}>
        {title}
      </span>
      <div style={{
        flex: 1, height: 1,
        background: `linear-gradient(to right, ${accentColor}44, transparent)`,
      }} />
    </div>
  );
}

export default function MembroPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = typeof params.id === "string" ? params.id : "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab,    setActiveTab]    = useState<string>("informacoes");
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);

  const [roles,         setRoles]         = useState<StaffRole[]>([]);
  const [teams,         setTeams]         = useState<Team[]>([]);
  const [accentColor,   setAccentColor]   = useState("#BFF205");
  const [currentTeamName, setCurrentTeamName] = useState<string | null>(null);
  const [stintHistory,  setStintHistory]  = useState<StintHistory[]>([]);

  const [showTransfer,   setShowTransfer]   = useState(false);
  const [transferTeamId, setTransferTeamId] = useState("");
  const [transferring,   setTransferring]   = useState(false);

  const [editingStintId,    setEditingStintId]    = useState<string | null>(null);
  const [editStintMovement, setEditStintMovement] = useState("");
  const [editStintStarted,  setEditStintStarted]  = useState("");
  const [editStintEnded,    setEditStintEnded]     = useState("");
  const [savingStint,       setSavingStint]        = useState(false);

  const [showAddStint,    setShowAddStint]    = useState(false);
  const [addStintTeamId,  setAddStintTeamId]  = useState("");
  const [addStintMovement,setAddStintMovement]= useState("arrival");
  const [addStintStarted, setAddStintStarted] = useState("");
  const [addStintEnded,   setAddStintEnded]   = useState("");
  const [addingStint,     setAddingStint]     = useState(false);

  const [fullName,     setFullName]     = useState("");
  const [surname,      setSurname]      = useState("");
  const [gender,       setGender]       = useState("");
  const [staffRoleId,  setStaffRoleId]  = useState("");
  const [rg,           setRg]           = useState("");
  const [cpf,          setCpf]          = useState("");
  const [birthDate,    setBirthDate]    = useState("");
  const [photoUrl,     setPhotoUrl]     = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: profile } = await supabase
      .from("user_profiles").select("organization_id")
      .eq("auth_user_id", user.id).maybeSingle();

    const [
      { data: member, error },
      { data: rolesData },
      { data: teamsData },
      { data: stintData },
      { data: historyData },
    ] = await Promise.all([
      supabase.from("staff_members").select("*").eq("id", id).maybeSingle(),
      supabase.from("staff_roles").select("id, full_name").eq("sport_slug", "football7").order("display_order"),
      supabase.from("teams").select("id, full_name").eq("organization_id", profile?.organization_id ?? "").order("full_name"),
      supabase.from("staff_team_stints")
        .select("id, team_id, teams(full_name, primary_color)")
        .eq("staff_member_id", id).eq("is_current", true).maybeSingle(),
      supabase.from("staff_team_stints")
        .select("id, team_id, started_at, ended_at, is_current, movement_type, teams(id, full_name, abbreviation, logo_url)")
        .eq("staff_member_id", id).order("started_at", { ascending: false }),
    ]);

    if (error || !member) { setLoadError("Membro não encontrado."); setLoading(false); return; }

    setFullName(member.full_name ?? "");
    setSurname(member.surname ?? "");
    setGender(member.gender ?? "");
    setStaffRoleId(member.staff_role_id ?? "");
    setRg(member.rg ?? "");
    setCpf(member.cpf ?? "");
    setBirthDate(formatDateToBR(member.birth_date));
    setPhotoUrl(member.photo_url);
    setRoles((rolesData ?? []) as StaffRole[]);
    setTeams((teamsData ?? []) as Team[]);
    setCurrentTeamName((stintData as any)?.teams?.full_name ?? null);
    setAccentColor((stintData as any)?.teams?.primary_color ?? "#BFF205");
    setStintHistory((historyData ?? []) as StintHistory[]);
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
      fd.append("surname", surname.trim());
      fd.append("gender", gender);
      fd.append("staff_role_id", staffRoleId);
      fd.append("rg", rg);
      fd.append("cpf", cpf);
      fd.append("birth_date", birthDate);
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarMembro(id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingPhoto(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      await load();
    } finally { setSaving(false); }
  }

  async function handleVincular() {
    if (!transferTeamId) return;
    setTransferring(true);
    const result = await vincularMembroEquipe(id, transferTeamId);
    setTransferring(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo atualizado.");
    setShowTransfer(false); setTransferTeamId("");
    await load();
  }

  function openEditStint(stint: StintHistory) {
    setEditingStintId(stint.id);
    setEditStintMovement(stint.movement_type ?? "arrival");
    setEditStintStarted(formatDateToBR(stint.started_at));
    setEditStintEnded(formatDateToBR(stint.ended_at));
  }

  async function handleSaveStint(stintId: string) {
    setSavingStint(true);
    const started = parseDateToISO(editStintStarted);
    const ended   = editStintEnded ? parseDateToISO(editStintEnded) : null;
    if (!started) { toast("error", "Data de início inválida."); setSavingStint(false); return; }
    const result = await editarStintMembro(stintId, editStintMovement, started, ended);
    setSavingStint(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo atualizado.");
    setEditingStintId(null);
    await load();
  }

  async function handleAddStint() {
    if (!addStintTeamId || !addStintStarted) { toast("error", "Equipe e data de início são obrigatórios."); return; }
    const started = parseDateToISO(addStintStarted);
    if (!started) { toast("error", "Data de início inválida."); return; }
    const ended = addStintEnded ? parseDateToISO(addStintEnded) : null;
    setAddingStint(true);
    const result = await adicionarStintMembro(id, addStintTeamId, addStintMovement, started, ended);
    setAddingStint(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo adicionado.");
    setShowAddStint(false);
    setAddStintTeamId(""); setAddStintMovement("arrival");
    setAddStintStarted(""); setAddStintEnded("");
    await load();
  }

  async function handleRemoveStint(stintId: string) {
    if (!confirm("Remover este vínculo da linha do tempo?")) return;
    const result = await removerStintMembro(stintId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo removido.");
    await load();
  }

  const displayPhoto = previewUrl ?? photoUrl;
  const roleLabel    = roles.find(r => r.id === staffRoleId)?.full_name ?? null;
  const genderLabel  = gender === "male" ? "Masculino" : gender === "female" ? "Feminino" : null;

  if (loading)   return <div style={{ padding: 32, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div style={{ padding: 32, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)" }}>{loadError}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
        {/* Degradê de acento */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(135deg, ${accentColor}22 0%, transparent 55%)`,
        }} />
        {/* Overlay surface */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundColor: "var(--color-surface)", opacity: 0.85,
        }} />
        {/* Faixa 1px inferior */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1, pointerEvents: "none",
          background: `linear-gradient(90deg, ${accentColor}80 0%, transparent 60%)`,
        }} />

        <div style={{ padding: "20px 32px 0", position: "relative", zIndex: 1 }}>
          <Breadcrumb items={[
            { label: "Comissão Técnica", href: "/comissao" },
            { label: surname || fullName || "Membro" },
          ]} />

          {/* Logo + nome + pills + botão */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {/* Avatar com botão de câmera */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
                border: `2px solid ${accentColor}44`,
                backgroundColor: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {displayPhoto ? (
                  <img src={displayPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                    {initialsFromName(fullName || "?")}
                  </span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoChange} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: "50%",
                  backgroundColor: accentColor,
                  border: "2px solid var(--color-background)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Camera size={9} strokeWidth={2.5} color="#0a0a0a" />
              </button>
            </div>

            {/* Nome + pills */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900,
                color: "var(--color-text-primary)", margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {(surname || fullName || "Membro").toUpperCase()}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                {roleLabel && (
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                    border: `1px solid ${accentColor}44`,
                    color: accentColor, backgroundColor: `${accentColor}11`,
                  }}>
                    {roleLabel.toUpperCase()}
                  </span>
                )}
                {genderLabel && (
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.04)",
                  }}>
                    {genderLabel.toUpperCase()}
                  </span>
                )}
                {currentTeamName && (
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.04)",
                  }}>
                    {currentTeamName.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Botão salvar */}
            {activeTab === "informacoes" && (
              <button
                type="submit"
                form="form-membro"
                disabled={saving}
                style={{
                  flexShrink: 0, padding: "9px 20px", borderRadius: 9, border: "none",
                  backgroundColor: saving ? "rgba(191,242,5,0.3)" : accentColor,
                  color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 12,
                  fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {saving ? "Salvando…" : "SALVAR"}
              </button>
            )}
          </div>

          {/* Abas */}
          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "11px 18px", border: "none",
                  borderBottom: `2px solid ${activeTab === tab.key ? accentColor : "transparent"}`,
                  backgroundColor: "transparent",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: activeTab === tab.key ? accentColor : "rgba(255,255,255,0.25)",
                  cursor: "pointer", transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, padding: "32px 32px 64px" }}>

        {/* ABA INFORMAÇÕES */}
        {activeTab === "informacoes" && (
          <form id="form-membro" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>

              {/* Card Dados */}
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                <SectionHeader title="Dados" accentColor={accentColor} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <span style={labelStyle}>Nome completo</span>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <span style={labelStyle}>Apelido</span>
                    <input type="text" value={surname} onChange={e => setSurname(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <span style={labelStyle}>Gênero</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[{ value: "male", label: "Masculino" }, { value: "female", label: "Feminino" }].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setGender(opt.value)} style={{
                          padding: "6px 16px", borderRadius: 20,
                          border: gender === opt.value ? `1px solid ${accentColor}44` : "1px solid rgba(255,255,255,0.08)",
                          backgroundColor: gender === opt.value ? `${accentColor}11` : "rgba(255,255,255,0.03)",
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          fontWeight: gender === opt.value ? 700 : 400,
                          color: gender === opt.value ? accentColor : "rgba(255,255,255,0.4)",
                          cursor: "pointer",
                        }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={labelStyle}>Função</span>
                    <select value={staffRoleId} onChange={e => setStaffRoleId(e.target.value)} style={inputStyle}>
                      <option value="">Selecione…</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <span style={labelStyle}>RG</span>
                    <input type="text" value={rg} onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))} style={inputStyle} />
                  </div>
                  <div>
                    <span style={labelStyle}>CPF</span>
                    <input type="text" value={cpf} onChange={e => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))} placeholder="000.000.000-00" style={inputStyle} />
                  </div>
                  <div>
                    <span style={labelStyle}>Data de nascimento</span>
                    <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                      onChange={e => setBirthDate(applyDateMask(e.target.value))}
                      onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
                      maxLength={10} style={{ ...inputStyle, letterSpacing: "0.05em" }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Card Foto */}
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                  <SectionHeader title="Foto" accentColor={accentColor} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 96, height: 96, borderRadius: "50%", overflow: "hidden",
                      border: `2px solid ${accentColor}44`,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {displayPhoto ? (
                        <img src={displayPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                          {initialsFromName(fullName || "?")}
                        </span>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoChange} />
                    <button type="button" onClick={() => fileRef.current?.click()} style={{
                      padding: "8px 20px", borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                      color: "rgba(255,255,255,0.6)", cursor: "pointer",
                    }}>
                      Trocar foto
                    </button>
                  </div>
                </div>

                {/* Card Vínculo */}
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                  <SectionHeader title="Vínculo" accentColor={accentColor} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                      Equipe atual:{" "}
                      <span style={{ color: currentTeamName ? accentColor : "rgba(255,255,255,0.2)", fontWeight: 700 }}>
                        {currentTeamName ?? "Sem clube"}
                      </span>
                    </p>
                    {!showTransfer ? (
                      <button type="button" onClick={() => setShowTransfer(true)} style={{
                        alignSelf: "flex-start", padding: "7px 16px", borderRadius: 9,
                        border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                        color: "rgba(255,255,255,0.6)", cursor: "pointer",
                      }}>
                        {currentTeamName ? "Transferir" : "Vincular equipe"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <select value={transferTeamId} onChange={e => setTransferTeamId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                          <option value="">Selecione a equipe…</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                        <button type="button" onClick={handleVincular} disabled={!transferTeamId || transferring} style={{
                          padding: "9px 16px", borderRadius: 9, border: "none",
                          backgroundColor: transferring ? "rgba(191,242,5,0.3)" : accentColor,
                          color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11,
                          fontWeight: 700, cursor: transferring ? "not-allowed" : "pointer",
                        }}>
                          {transferring ? "Salvando…" : "Confirmar"}
                        </button>
                        <button type="button" onClick={() => { setShowTransfer(false); setTransferTeamId(""); }} style={{
                          padding: "9px 16px", borderRadius: 9,
                          border: "1px solid rgba(255,255,255,0.08)",
                          backgroundColor: "transparent",
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          color: "rgba(255,255,255,0.4)", cursor: "pointer",
                        }}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ABA HISTÓRICO */}
        {activeTab === "historico" && (
          <div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
              {/* Header do card */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: accentColor }}>
                  LINHA DO TEMPO
                </span>
                <button type="button" onClick={() => setShowAddStint(v => !v)} style={{
                  padding: "5px 14px", borderRadius: 9,
                  border: `1px solid ${accentColor}44`,
                  backgroundColor: `${accentColor}0a`,
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  color: accentColor, cursor: "pointer",
                }}>
                  + Adicionar
                </button>
              </div>

              {/* Form adicionar stint */}
              {showAddStint && (
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                    <div>
                      <span style={labelStyle}>Equipe *</span>
                      <select value={addStintTeamId} onChange={e => setAddStintTeamId(e.target.value)} style={inputStyle}>
                        <option value="">Selecione…</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <span style={labelStyle}>Tipo</span>
                      <select value={addStintMovement} onChange={e => setAddStintMovement(e.target.value)} style={inputStyle}>
                        {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <span style={labelStyle}>Início *</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={addStintStarted}
                        onChange={e => setAddStintStarted(applyDateMask(e.target.value))}
                        maxLength={10} style={{ ...inputStyle, letterSpacing: "0.05em" }} />
                    </div>
                    <div>
                      <span style={labelStyle}>Fim</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={addStintEnded}
                        onChange={e => setAddStintEnded(applyDateMask(e.target.value))}
                        maxLength={10} style={{ ...inputStyle, letterSpacing: "0.05em" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={handleAddStint} disabled={addingStint} style={{
                      padding: "7px 16px", borderRadius: 9, border: "none",
                      backgroundColor: addingStint ? "rgba(191,242,5,0.3)" : accentColor,
                      color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11,
                      fontWeight: 700, cursor: addingStint ? "not-allowed" : "pointer",
                    }}>
                      {addingStint ? "Adicionando…" : "Confirmar"}
                    </button>
                    <button type="button" onClick={() => setShowAddStint(false)} style={{
                      padding: "7px 16px", borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                      fontFamily: "var(--font-mono)", fontSize: 11,
                      color: "rgba(255,255,255,0.4)", cursor: "pointer",
                    }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de stints */}
              {stintHistory.length === 0 ? (
                <p style={{ padding: "24px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  Nenhum vínculo registrado.
                </p>
              ) : (
                stintHistory.map((stint, idx) => (
                  <div key={stint.id} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    {editingStintId === stint.id ? (
                      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          {stint.teams?.logo_url ? (
                            <img src={stint.teams.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} />
                          ) : null}
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                            {stint.teams?.full_name ?? "Equipe"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                          <div>
                            <span style={labelStyle}>Tipo</span>
                            <select value={editStintMovement} onChange={e => setEditStintMovement(e.target.value)} style={inputStyle}>
                              {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <span style={labelStyle}>Início</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={editStintStarted}
                              onChange={e => setEditStintStarted(applyDateMask(e.target.value))}
                              maxLength={10} style={{ ...inputStyle, letterSpacing: "0.05em" }} />
                          </div>
                          <div>
                            <span style={labelStyle}>Fim</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={editStintEnded}
                              onChange={e => setEditStintEnded(applyDateMask(e.target.value))}
                              maxLength={10} style={{ ...inputStyle, letterSpacing: "0.05em" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => handleSaveStint(stint.id)} disabled={savingStint} style={{
                            padding: "7px 16px", borderRadius: 9, border: "none",
                            backgroundColor: savingStint ? "rgba(191,242,5,0.3)" : accentColor,
                            color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11,
                            fontWeight: 700, cursor: savingStint ? "not-allowed" : "pointer",
                          }}>
                            {savingStint ? "Salvando…" : "Salvar"}
                          </button>
                          <button type="button" onClick={() => setEditingStintId(null)} style={{
                            padding: "7px 16px", borderRadius: 9,
                            border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                            fontFamily: "var(--font-mono)", fontSize: 11,
                            color: "rgba(255,255,255,0.4)", cursor: "pointer",
                          }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group"
                        style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px" }}
                      >
                        {/* Badge de movimento */}
                        <div style={{ flexShrink: 0, width: 88 }}>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                            letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 20,
                            backgroundColor: `${MOVEMENT_COLORS[stint.movement_type ?? "arrival"]}18`,
                            color: MOVEMENT_COLORS[stint.movement_type ?? "arrival"],
                          }}>
                            {MOVEMENT_LABELS[stint.movement_type ?? "arrival"] ?? "—"}
                          </span>
                        </div>

                        {/* Logo */}
                        {stint.teams?.logo_url ? (
                          <img src={stint.teams.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 28, height: 28, flexShrink: 0, borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.08)",
                            backgroundColor: "rgba(255,255,255,0.04)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                            color: "rgba(255,255,255,0.3)",
                          }}>
                            {stint.teams?.abbreviation?.slice(0, 2) ?? "?"}
                          </div>
                        )}

                        {/* Nome + datas */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                            {stint.teams?.full_name ?? "Equipe desconhecida"}
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            {new Date(stint.started_at + "T00:00:00").toLocaleDateString("pt-BR")}
                            {" → "}
                            {stint.ended_at ? new Date(stint.ended_at + "T00:00:00").toLocaleDateString("pt-BR") : "atual"}
                          </p>
                        </div>

                        {/* Badge atual */}
                        {stint.is_current && (
                          <span style={{
                            flexShrink: 0, padding: "2px 8px", borderRadius: 20,
                            backgroundColor: `${accentColor}18`,
                            color: accentColor,
                            border: `1px solid ${accentColor}33`,
                            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                          }}>
                            atual
                          </span>
                        )}

                        {/* Ações */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <button type="button" onClick={() => openEditStint(stint)} style={{
                            padding: "4px 12px", borderRadius: 7,
                            border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                            color: "rgba(255,255,255,0.4)", cursor: "pointer",
                          }}>
                            Editar
                          </button>
                          {!stint.is_current && (
                            <button type="button" onClick={() => handleRemoveStint(stint.id)} style={{
                              padding: "4px 12px", borderRadius: 7,
                              border: "1px solid rgba(255,68,68,0.25)", backgroundColor: "transparent",
                              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                              color: "#FF4444", cursor: "pointer",
                            }}>
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA ESTATÍSTICAS */}
        {activeTab === "estatisticas" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "80px 0", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16, fontSize: 22,
            }}>
              📊
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Estatísticas
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
              Em construção — partidas dirigidas, títulos e histórico de competições.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}