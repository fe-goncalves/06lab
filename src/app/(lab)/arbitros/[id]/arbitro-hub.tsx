"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarArbitro } from "../actions";
import { Camera } from "lucide-react";
import { LabSelect } from "@/app/(lab)/components/lab-select";

// ─── Types ─────────────────────────────────────────────────────────────────────

type RefereeRole = { id: string; name: string };

type Referee = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  phone: string | null;
  pix_key: string | null;
  referee_role_id: string | null;
  profile_public: boolean;
  birth_date: string | null;
  gender: string | null;
};

type TeamInfo = {
  id: string;
  full_name: string;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
} | null;

type MatchEntry = {
  matchRefereeId: string;
  matchId: string;
  matchDate: string | null;
  status: string | null;
  scoreA: number | null;
  scoreB: number | null;
  teamA: TeamInfo;
  teamB: TeamInfo;
  phaseName: string | null;
  editionId: string | null;
  competitionId: string | null;
  competitionName: string | null;
  competitionShort: string | null;
  seasonName: string | null;
  yearValue: number | null;
  refereeRoleId: string | null;
};

type CardAction = {
  id: string;
  matchId: string;
  actionType: "yellow_card" | "red_card" | "yellow_red_card";
  teamId: string | null;
};

type Props = {
  referee: Referee;
  matches: MatchEntry[];
  refereeRoles: RefereeRole[];
  cardActions: CardAction[];
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const REFEREE_ROLES_STATIC = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "Árbitro" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "Assistente" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "Mesário" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "Staff" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return dateStr; }
}

function getRoleLabel(roleId: string | null, roles: RefereeRole[]): string {
  if (!roleId) return "—";
  return REFEREE_ROLES_STATIC.find(r => r.id === roleId)?.label
    ?? roles.find(r => r.id === roleId)?.name
    ?? "—";
}

// ─── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205" }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{count}</span>
      )}
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.25), transparent)" }} />
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${color}22`,
      backgroundColor: `${color}08`,
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── FilterPill ────────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 20,
        border: `1px solid ${active ? "#BFF205" : "rgba(255,255,255,0.1)"}`,
        backgroundColor: active ? "rgba(191,242,5,0.1)" : "transparent",
        color: active ? "#BFF205" : "rgba(255,255,255,0.35)",
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.12s",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

// ─── MatchRow ──────────────────────────────────────────────────────────────────

function MatchRow({ match, roles, isFirst }: { match: MatchEntry; roles: RefereeRole[]; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  const scoreReady = match.status === "finished" && match.scoreA !== null && match.scoreB !== null;
  const competitionLabel = match.competitionShort ?? match.competitionName ?? "—";
  const roleLabel = getRoleLabel(match.refereeRoleId, roles);
  const colorA = match.teamA?.primary_color ?? "#555";
  const colorB = match.teamB?.primary_color ?? "#555";

  return (
    <Link
      href={`/partidas/${match.matchId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        padding: "0 16px", height: 58,
        textDecoration: "none",
        opacity: hovered ? 1 : 0.82,
        transition: "opacity 0.12s",
        position: "relative",
        borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${colorA}80 50%, ${colorB}80 50%)`, opacity: hovered ? 1 : 0, transition: "opacity 0.12s" }} />

      <div style={{ width: 80, flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{formatDate(match.matchDate)}</span>
      </div>

      <div style={{ width: 140, flexShrink: 0 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{competitionLabel}</p>
        {match.phaseName && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 1 }}>{match.phaseName}</p>}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flex: 1 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", textAlign: "right" }}>
            {(match.teamA?.abbreviation ?? match.teamA?.full_name ?? "?").toUpperCase()}
          </span>
          {match.teamA?.logo_url && <img src={match.teamA.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8, minWidth: 72, justifyContent: "center" }}>
          {scoreReady ? (
            <>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{match.scoreA}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>×</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{match.scoreB}</span>
            </>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{match.status === "ongoing" ? "AO VIVO" : "—"}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {match.teamB?.logo_url && <img src={match.teamB.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {(match.teamB?.abbreviation ?? match.teamB?.full_name ?? "?").toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ width: 100, flexShrink: 0, textAlign: "right" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20, backgroundColor: "rgba(191,242,5,0.08)", color: "#BFF205", border: "1px solid rgba(191,242,5,0.15)" }}>
          {roleLabel}
        </span>
      </div>
    </Link>
  );
}

// ─── AbaInformações ────────────────────────────────────────────────────────────

function AbaInformacoes({ referee, roles }: { referee: Referee; roles: RefereeRole[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(referee.full_name);
  const [refereeRoleId, setRefereeRoleId] = useState(referee.referee_role_id ?? "");
  const [gender, setGender] = useState(referee.gender ?? "");
  const [phone, setPhone] = useState(referee.phone ?? "");
  const [pixKey, setPix] = useState(referee.pix_key ?? "");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingPhoto(f);
    setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("referee_role_id", refereeRoleId);
      fd.append("gender", gender);
      fd.append("phone", phone.trim());
      fd.append("pix_key", pixKey.trim());
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarArbitro(referee.id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingPhoto(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      router.refresh();
    } finally { setSaving(false); }
  }

  const displayPhoto = previewUrl ?? referee.photo_url;

  const fieldLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-mono)", fontSize: 12,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.12s",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, alignItems: "start" }}>
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", padding: 20 }}>
        <SectionHeader label="Foto" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(191,242,5,0.3)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {displayPhoto
                ? <img src={displayPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>{initialsFromName(fullName || "?")}</span>
              }
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: "50%", backgroundColor: "#BFF205", border: "2px solid var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Camera size={11} strokeWidth={2.5} color="#0a0a0a" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoChange} />
          {pendingPhoto && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>{pendingPhoto.name}</p>}
        </div>
      </div>

      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", padding: 20 }}>
        <SectionHeader label="Dados" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={fieldLabel}>Função</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {REFEREE_ROLES_STATIC.map(role => (
                <button key={role.id} type="button" onClick={() => setRefereeRoleId(role.id)} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${refereeRoleId === role.id ? "#BFF205" : "rgba(255,255,255,0.1)"}`, backgroundColor: refereeRoleId === role.id ? "rgba(191,242,5,0.1)" : "transparent", color: refereeRoleId === role.id ? "#BFF205" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.12s" }}>
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span style={fieldLabel}>Nome completo *</span>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")} onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
          </div>
          <div>
            <span style={fieldLabel}>Gênero</span>
            <LabSelect
              value={gender}
              onChange={setGender}
              options={[
                { value: "male", label: "Masculino" },
                { value: "female", label: "Feminino" },
                { value: "other", label: "Outro" },
              ]}
              placeholder="Gênero"
            />
          </div>
          <div>
            <span style={fieldLabel}>Telefone</span>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")} onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
          </div>
          <div>
            <span style={fieldLabel}>Chave Pix</span>
            <input type="text" value={pixKey} onChange={e => setPix(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")} onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
          </div>
          <button type="button" onClick={handleSave} disabled={saving || !fullName.trim()} style={{ padding: "10px 0", borderRadius: 9, border: "none", backgroundColor: saving || !fullName.trim() ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", cursor: saving || !fullName.trim() ? "not-allowed" : "pointer", transition: "all 0.12s", marginTop: 4 }}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AbaJogos ──────────────────────────────────────────────────────────────────

function AbaJogos({ matches, roles }: { matches: MatchEntry[]; roles: RefereeRole[] }) {
  if (matches.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 20 }}>🏁</div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Nenhum jogo registrado</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>Este árbitro ainda não foi vinculado a nenhuma partida.</p>
      </div>
    );
  }

  const sorted = [...matches].sort((a, b) => {
    if (!a.matchDate && !b.matchDate) return 0;
    if (!a.matchDate) return 1;
    if (!b.matchDate) return -1;
    return b.matchDate.localeCompare(a.matchDate);
  });

  return (
    <div>
      <SectionHeader label="Jogos apitados" count={matches.length} />
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
        {sorted.map((match, idx) => (
          <MatchRow key={match.matchRefereeId} match={match} roles={roles} isFirst={idx === 0} />
        ))}
      </div>
    </div>
  );
}

// ─── AbaEstatisticas ───────────────────────────────────────────────────────────

function AbaEstatisticas({ matches, cardActions }: { matches: MatchEntry[]; cardActions: CardAction[] }) {
  const [filterCompetitionId, setFilterCompetitionId] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);

  const competitions = useMemo(() => {
    const map = new Map<string, string>();
    matches.forEach(m => {
      if (m.competitionId) map.set(m.competitionId, m.competitionShort ?? m.competitionName ?? m.competitionId);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [matches]);

  const teams = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    matches.forEach(m => {
      if (m.teamA) map.set(m.teamA.id, { id: m.teamA.id, label: m.teamA.abbreviation ?? m.teamA.full_name });
      if (m.teamB) map.set(m.teamB.id, { id: m.teamB.id, label: m.teamB.abbreviation ?? m.teamB.full_name });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [matches]);

  const years = useMemo(() => {
    const set = new Set<number>();
    matches.forEach(m => { if (m.yearValue) set.add(m.yearValue); });
    return Array.from(set).sort((a, b) => b - a);
  }, [matches]);

  const filteredMatchIds = useMemo(() => {
    return new Set(
      matches
        .filter(m => {
          if (filterCompetitionId && m.competitionId !== filterCompetitionId) return false;
          if (filterTeamId && m.teamA?.id !== filterTeamId && m.teamB?.id !== filterTeamId) return false;
          if (filterYear && m.yearValue !== filterYear) return false;
          return true;
        })
        .map(m => m.matchId)
    );
  }, [matches, filterCompetitionId, filterTeamId, filterYear]);

  const stats = useMemo(() => {
    const filtered = cardActions.filter(a => filteredMatchIds.has(a.matchId));
    return {
      total_matches: filteredMatchIds.size,
      amarelos: filtered.filter(a => a.actionType === "yellow_card").length,
      vermelhos: filtered.filter(a => a.actionType === "red_card").length,
      amarelovermelhos: filtered.filter(a => a.actionType === "yellow_red_card").length,
    };
  }, [cardActions, filteredMatchIds]);

  const hasFilters = filterCompetitionId || filterTeamId || filterYear;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Filtros */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--color-surface)", padding: 20 }}>
        <SectionHeader label="Filtros" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {competitions.length > 0 && (
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8, margin: 0, marginBottom: 8 }}>Competição</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <FilterPill label="Todas" active={!filterCompetitionId} onClick={() => setFilterCompetitionId(null)} />
                {competitions.map(c => (
                  <FilterPill key={c.id} label={c.label} active={filterCompetitionId === c.id} onClick={() => setFilterCompetitionId(filterCompetitionId === c.id ? null : c.id)} />
                ))}
              </div>
            </div>
          )}

          {teams.length > 0 && (
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: 0, marginBottom: 8 }}>Equipe</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <FilterPill label="Todas" active={!filterTeamId} onClick={() => setFilterTeamId(null)} />
                {teams.map(t => (
                  <FilterPill key={t.id} label={t.label.toUpperCase()} active={filterTeamId === t.id} onClick={() => setFilterTeamId(filterTeamId === t.id ? null : t.id)} />
                ))}
              </div>
            </div>
          )}

          {years.length > 0 && (
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: 0, marginBottom: 8 }}>Ano</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <FilterPill label="Todos" active={!filterYear} onClick={() => setFilterYear(null)} />
                {years.map(y => (
                  <FilterPill key={y} label={String(y)} active={filterYear === y} onClick={() => setFilterYear(filterYear === y ? null : y)} />
                ))}
              </div>
            </div>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setFilterCompetitionId(null); setFilterTeamId(null); setFilterYear(null); }}
              style={{ alignSelf: "flex-start", fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#FF4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              × Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Painel de estatísticas */}
      <div>
        <SectionHeader label={hasFilters ? "Estatísticas (filtradas)" : "Estatísticas gerais"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatCard value={stats.total_matches} label="Jogos" color="#BFF205" />
          <StatCard value={stats.amarelos} label="Amarelos" color="#F2C005" />
          <StatCard value={stats.amarelovermelhos} label="Amarelo-vermelho" color="#F27405" />
          <StatCard value={stats.vermelhos} label="Vermelhos" color="#FF4444" />
        </div>
      </div>

      {cardActions.length === 0 && matches.length > 0 && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "16px 0" }}>
          Nenhuma ação de cartão registrada nos jogos deste árbitro.
        </p>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

type Tab = "informacoes" | "jogos" | "estatisticas";

const TAB_LABELS: Record<Tab, string> = {
  informacoes: "Informações",
  jogos: "Jogos",
  estatisticas: "Estatísticas",
};

export default function ArbitroHub({ referee, matches, refereeRoles, cardActions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("informacoes");

  const displayName = referee.full_name;
  const roleLabel = getRoleLabel(referee.referee_role_id, refereeRoles);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      <div style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding: "20px 32px 0" }}>
          <Breadcrumb items={[{ label: "Árbitros", href: "/arbitros" }, { label: displayName }]} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(191,242,5,0.3)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {referee.photo_url
                ? <img src={referee.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{initialsFromName(displayName)}</span>
              }
            </div>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.1 }}>
                {displayName.toUpperCase()}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#BFF205" }}>{roleLabel}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.15)" }}>·</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                  {matches.length} {matches.length === 1 ? "jogo" : "jogos"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.15)" }}>·</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                  {cardActions.filter(a => a.actionType === "yellow_card").length}🟡 {cardActions.filter(a => a.actionType === "red_card").length}🔴
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0 }}>
            {(["informacoes", "jogos", "estatisticas"] as Tab[]).map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 18px",
                    paddingBottom: isActive ? 8 : 10,
                    borderBottom: isActive ? "2px solid #BFF205" : "2px solid transparent",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: isActive ? "2px solid #BFF205" : "2px solid transparent",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: isActive ? "#BFF205" : "rgba(255,255,255,0.3)",
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {TAB_LABELS[tab]}
                  {tab === "jogos" && matches.length > 0 && (
                    <span style={{ marginLeft: 7, fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", borderRadius: 10, backgroundColor: isActive ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)", color: isActive ? "#BFF205" : "rgba(255,255,255,0.2)" }}>
                      {matches.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 32px" }}>
        {activeTab === "informacoes" && <AbaInformacoes referee={referee} roles={refereeRoles} />}
        {activeTab === "jogos" && <AbaJogos matches={matches} roles={refereeRoles} />}
        {activeTab === "estatisticas" && <AbaEstatisticas matches={matches} cardActions={cardActions} />}
      </div>
    </div>
  );
}