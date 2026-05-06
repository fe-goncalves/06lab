// EQUIPE EDICAO CLIENT

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import {
  removerAtletaEdicao, aprovarInscricao, desativarInscricao, reativarInscricao,
  transferirAtletaNaEdicao, inscreverAtletaQualquer, editarStint, editarStintStaff,
} from "@/app/(lab)/competicoes/[id]/edicoes/actions";

import { criarAtleta } from "@/app/(lab)/atletas/actions";
import { Plus, Check, X, ArrowRightLeft, Search, Ban, RotateCcw, Trash2, History } from "lucide-react";

type RosterEntry = {
  id: string;
  member_type: string;
  status: string;
  athlete_id: string | null;
  staff_member_id: string | null;
  position_label_at_inscription: string | null;
  athletes: {
    id: string; full_name: string; surname: string | null; photo_url: string | null;
    birth_date: string | null; rg: string | null;
    player_positions: { full_name: string; abbreviation: string } | null;
  } | null;
  staff_members: {
    id: string; full_name: string; surname: string | null; photo_url: string | null;
    staff_roles: { full_name: string } | null;
  } | null;
};

type Athlete = {
  id: string; full_name: string; surname: string | null; photo_url: string | null;
  player_positions: { full_name: string; abbreviation: string } | null;
};

type Staff = {
  id: string; full_name: string; surname: string | null; photo_url: string | null;
  staff_roles: { full_name: string } | null;
};

type EditionTeam = {
  id: string; team_id: string; is_free_agent_pool: boolean;
  teams: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null } | null;
};

type Position = { id: string; full_name: string; abbreviation: string };

type StintRecord = {
  id: string;
  team_id: string;
  team_name: string;
  started_at: string;
  ended_at: string | null;
  is_current: boolean;
  movement_type: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado",
  inactive: "Inativo", free_agent: "Sem clube",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#F2C005", approved: "var(--color-brand)", rejected: "var(--color-danger)",
  inactive: "#555", free_agent: "#A6A6A6",
};

function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function RosterCard({
  photoUrl, displayName, fullName, subtitle, positionAbbr, birthDate, rg,
  teamColor, statusEl, actionsEl,
}: {
  photoUrl: string | null;
  displayName: string;
  fullName: string;
  subtitle: string;
  positionAbbr: string | null;
  birthDate: string | null;
  rg: string | null;
  teamColor: string;
  statusEl: React.ReactNode;
  actionsEl: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  function formatDate(raw: string | null): string {
    if (!raw) return "";
    try {
      const d = new Date(raw + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return raw; }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 px-5 transition-all duration-200"
      style={{
        paddingTop: hovered ? 14 : 9,
        paddingBottom: hovered ? 14 : 9,
        borderTop: "1px solid var(--color-border)",
        backgroundColor: hovered ? "rgba(255,255,255,0.025)" : "transparent",
      }}
    >
      {/* Foto */}
      <div
        className="shrink-0 overflow-hidden rounded-full transition-all duration-200"
        style={{
          width: hovered ? 44 : 36,
          height: hovered ? 44 : 36,
          border: `2px solid ${hovered ? teamColor : "var(--color-border)"}`,
          backgroundColor: `${teamColor}22`,
          flexShrink: 0,
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs font-bold"
            style={{ color: teamColor }}>
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        {/* Linha 1: Apelido + Posição */}
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm font-bold leading-tight truncate" style={{ color: "var(--color-text-primary)" }}>
            {displayName.toUpperCase()}
          </p>
          {positionAbbr && (
            <span className="shrink-0 font-mono text-xs rounded px-1.5 py-0.5 font-bold"
              style={{ backgroundColor: `${teamColor}22`, color: teamColor, fontSize: 10 }}>
              {positionAbbr}
            </span>
          )}
        </div>
        {/* Linha 2: Nome completo */}
        <p className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
          {fullName}
        </p>
        {/* Linha 3: Dados extras — aparecem no hover */}
        <div
          className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
          style={{
            maxHeight: hovered ? "20px" : "0px",
            opacity: hovered ? 1 : 0,
            marginTop: hovered ? 3 : 0,
          }}
        >
          {birthDate && (
            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.65 }}>
              🗓 {formatDate(birthDate)}
            </span>
          )}
          {rg && (
            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.65 }}>
              RG {rg}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0">{statusEl}</div>

      {/* Ações com ícones + tooltip no hover */}
      <div className="flex items-center gap-1 shrink-0">
        {actionsEl}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, color, borderColor }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  borderColor?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div className="relative flex items-center" style={{ flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="flex items-center justify-center rounded border transition-all duration-150 disabled:opacity-40"
        style={{
          width: 30,
          height: 30,
          borderColor: hov ? (color ?? "var(--color-brand)") : (borderColor ?? "var(--color-border)"),
          color: color ?? "var(--color-text-secondary)",
          backgroundColor: hov ? `${color ?? "var(--color-brand)"}11` : "transparent",
        }}
      >
        {icon}
      </button>
      {hov && (
        <div
          className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 font-mono text-xs pointer-events-none z-10"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default function EquipeEdicaoClient({
  competitionId, competitionName, edicaoId, edicaoName,
  editionTeam, rosterEntries: initialEntries,
  availableAthletes: initialAvailable, availableStaff: initialStaff,
  allEditionTeams, freeAgentPoolId, positions, competitionGender,
}: {
  competitionId: string; competitionName: string;
  edicaoId: string; edicaoName: string;
  editionTeam: any;
  rosterEntries: RosterEntry[];
  availableAthletes: Athlete[];
  availableStaff: Staff[];
  allEditionTeams: EditionTeam[];
  freeAgentPoolId: string | null;
  positions: Position[];
  competitionGender: string | null;
}) {
  const [entries, setEntries] = useState<RosterEntry[]>(initialEntries);
  const [availableAthletes, setAvailableAthletes] = useState<Athlete[]>(initialAvailable);
  const [activeTab, setActiveTab] = useState<"atletas" | "comissao">("atletas");
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal busca atleta/comissão
  const isFreeAgentPool = editionTeam.is_free_agent_pool === true;
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [staffSearchResults, setStaffSearchResults] = useState<Staff[]>([]);
  const [searching, setSearching] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>(initialStaff);

  // Modal criar atleta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createSurname, setCreateSurname] = useState("");
  const [createGender, setCreateGender] = useState("male");
  const [createPositionId, setCreatePositionId] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createRg, setCreateRg] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreview, setCreatePreview] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Modal transferir
  const [transferEntryId, setTransferEntryId] = useState<string | null>(null);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferDate, setTransferDate] = useState("");

  // Modal remover
  const [removeConfirmEntryId, setRemoveConfirmEntryId] = useState<string | null>(null);
  const [removeBlocked, setRemoveBlocked] = useState(false);
  const [checkingRemove, setCheckingRemove] = useState(false);

  // Modal rejeitar
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

// Modal histórico de stints
const [historyAthleteId, setHistoryAthleteId] = useState<string | null>(null);
const [historyAthleteName, setHistoryAthleteName] = useState<string>("");
const [historyStints, setHistoryStints] = useState<StintRecord[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [editingStintId, setEditingStintId] = useState<string | null>(null);
const [editStintStarted, setEditStintStarted] = useState("");
const [editStintEnded, setEditStintEnded] = useState("");
const [savingStint, setSavingStint] = useState(false);
const [historyMemberType, setHistoryMemberType] = useState<"athlete" | "staff">("athlete");
  
  // Modal aprovar — data de início
  const [approveEntryId, setApproveEntryId] = useState<string | null>(null);
  const [approveStartDate, setApproveStartDate] = useState("");

  const team = editionTeam.teams;
  const teamColor = team?.primary_color ?? "var(--color-brand)";

  const athletes = entries
    .filter(e => e.member_type === "athlete" && (isFreeAgentPool ? e.status !== "inactive" : true))
    .sort((a, b) => {
      const nameA = (a.athletes?.surname ?? a.athletes?.full_name ?? "").toLowerCase();
      const nameB = (b.athletes?.surname ?? b.athletes?.full_name ?? "").toLowerCase();
      return nameA.localeCompare(nameB, "pt-BR");
    });

    const staff = entries
    .filter(e => e.member_type === "staff" && (isFreeAgentPool ? e.status !== "inactive" : true))
    .sort((a, b) => {
      const nameA = (a.staff_members?.surname ?? a.staff_members?.full_name ?? "").toLowerCase();
      const nameB = (b.staff_members?.surname ?? b.staff_members?.full_name ?? "").toLowerCase();
      return nameA.localeCompare(nameB, "pt-BR");
    });
  const pendingCount = entries.filter(e => e.status === "pending").length;

  const inscribedAthleteIds = new Set(entries.filter(e => e.member_type === "athlete").map(e => e.athlete_id));

  // Aplica filtro de gênero da competição nos atletas disponíveis (apenas exibição no modal)
  const filteredAvailableAthletes = competitionGender
    ? availableAthletes.filter((a: any) => a.gender === competitionGender)
    : availableAthletes;

  // Busca em tempo real
  useEffect(() => {
    if (activeTab === "comissao") {
      if (!searchQuery.trim()) {
        setStaffSearchResults(availableStaff.slice(0, 20));
        return;
      }
      const q = searchQuery.toLowerCase();
      const filtered = availableStaff.filter((s: Staff) => {
        const name = `${s.full_name} ${s.surname ?? ""}`.toLowerCase();
        return name.includes(q);
      });
      setStaffSearchResults(filtered.slice(0, 20));
    } else {
      if (!searchQuery.trim()) {
        setSearchResults(filteredAvailableAthletes.slice(0, 20));
        return;
      }
      const q = searchQuery.toLowerCase();
      const filtered = filteredAvailableAthletes.filter(a => {
        const name = `${a.full_name} ${a.surname ?? ""}`.toLowerCase();
        return name.includes(q);
      });
      setSearchResults(filtered.slice(0, 20));
    }
  }, [searchQuery, availableAthletes, availableStaff, activeTab]);

  // Inicializa resultados ao abrir
  useEffect(() => {
    if (showSearchModal) {
      setSearchQuery("");
      if (activeTab === "comissao") {
        setStaffSearchResults(availableStaff.slice(0, 20));
      } else {
        setSearchResults(filteredAvailableAthletes.slice(0, 20));
      }
    }
  }, [showSearchModal, activeTab]);

  function resetCreateForm() {
    setCreateFullName(""); setCreateSurname(""); setCreateGender("male");
    setCreatePositionId(""); setCreateBirthDate(""); setCreateRg("");
    setCreateFile(null); setCreatePreview(null); setCreateError(null);
  }

  async function handleAprovar(entryId: string) {
    if (!approveStartDate) return;
    // Converte DD/MM/YYYY → YYYY-MM-DD
    const parts = approveStartDate.split("/");
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : approveStartDate;
    setProcessing(entryId);
    const result = await aprovarInscricao(entryId, isoDate);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Aprovado.");
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "approved" } : e));
    setApproveEntryId(null);
    setApproveStartDate("");
  }

  async function handleRejeitar(entryId: string, reason: string) {
    setProcessing(entryId);
    const supabase = createClient();
    const { error } = await supabase
      .from("edition_roster_entries")
      .update({ status: "rejected", rejection_reason: reason || null })
      .eq("id", entryId);
    setProcessing(null);
    if (error) { toast("error", error.message); return; }
    toast("success", "Inscrição rejeitada.");
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "rejected" } : e));
    setRejectEntryId(null);
    setRejectReason("");
  }

  async function handleDesativar(entryId: string) {
    setProcessing(entryId);
    const result = await desativarInscricao(entryId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Inscrição desativada.");
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "inactive" } : e));
  }

  async function handleReativar(entryId: string) {
    setProcessing(entryId);
    const result = await reativarInscricao(entryId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Inscrição reativada.");
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "approved" } : e));
  }

  async function handleRemover(entryId: string) {
    setCheckingRemove(true);
    setRemoveConfirmEntryId(entryId);
    // Verifica se o atleta tem dados na edição (partidas jogadas)
    const entry = entries.find(e => e.id === entryId);
    if (entry?.athlete_id) {
      const supabase = createClient();
      const { data: lineups } = await supabase
        .from("match_lineups")
        .select("id")
        .eq("athlete_id", entry.athlete_id)
        .limit(1);
      setRemoveBlocked((lineups ?? []).length > 0);
    } else {
      setRemoveBlocked(false);
    }
    setCheckingRemove(false);
  }

  async function handleConfirmarRemocao() {
    if (!removeConfirmEntryId) return;
    setProcessing(removeConfirmEntryId);
    const result = await removerAtletaEdicao(removeConfirmEntryId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Removido.");
    const removed = entries.find(e => e.id === removeConfirmEntryId);
    setEntries(prev => prev.filter(e => e.id !== removeConfirmEntryId));
    if (removed?.athletes) setAvailableAthletes(prev => [...prev, removed.athletes as Athlete]);
    setRemoveConfirmEntryId(null);
    setRemoveBlocked(false);
  }

  async function handleOpenHistory(memberId: string, memberName: string, memberType: "athlete" | "staff") {
    setHistoryAthleteId(memberId);
    setHistoryMemberType(memberType);
    setHistoryAthleteName(memberName);
    setHistoryStints([]);
    setEditingStintId(null);
    setHistoryLoading(true);

    const supabase = createClient();

    const { data: editionTeamsData } = await supabase
      .from("edition_teams")
      .select("team_id, teams(full_name, abbreviation)")
      .eq("edition_id", edicaoId);

    const teamIds = (editionTeamsData ?? []).map((et: any) => et.team_id);
    const teamMap: Record<string, string> = {};
    (editionTeamsData ?? []).forEach((et: any) => {
      teamMap[et.team_id] = et.teams?.full_name ?? et.teams?.abbreviation ?? "—";
    });

    if (teamIds.length === 0) {
      setHistoryLoading(false);
      return;
    }

    const table = memberType === "athlete" ? "athlete_team_stints" : "staff_team_stints";
    const column = memberType === "athlete" ? "athlete_id" : "staff_member_id";

    const { data: stints } = await supabase
      .from(table)
      .select("id, team_id, started_at, ended_at, is_current, movement_type")
      .eq(column, memberId)
      .in("team_id", teamIds)
      .order("started_at", { ascending: true });

    setHistoryStints(
      (stints ?? []).map((s: any) => ({
        ...s,
        team_name: teamMap[s.team_id] ?? "—",
      }))
    );
    setHistoryLoading(false);
  }
  
  async function handleSaveStint(stintId: string) {
    if (!editStintStarted) return;
    const toISO = (val: string) => {
      const parts = val.split("/");
      return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : val;
    };
    const startedISO = toISO(editStintStarted);
    const endedISO = editStintEnded && editStintEnded.length === 10 ? toISO(editStintEnded) : null;

    setSavingStint(true);
    const result = historyMemberType === "athlete"
      ? await editarStint(stintId, startedISO, endedISO)
      : await editarStintStaff(stintId, startedISO, endedISO);
    setSavingStint(false);

    if ("error" in result) { toast("error", result.error); return; }

    toast("success", "Stint atualizado.");
    setHistoryStints(prev => prev.map(s =>
      s.id === stintId
        ? { ...s, started_at: startedISO, ended_at: endedISO, is_current: endedISO === null }
        : s
    ));
    setEditingStintId(null);
  }

  async function handleTransferir() {
    if (!transferEntryId || !transferTargetId || !transferDate) return;
    const parts = transferDate.split("/");
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : transferDate;
    setProcessing(transferEntryId);
    const result = await transferirAtletaNaEdicao(transferEntryId, transferTargetId, isoDate);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", transferTargetId === freeAgentPoolId ? "Atleta movido para sem clube." : "Transferência realizada.");
    setEntries(prev => prev.filter(e => e.id !== transferEntryId));
    setTransferEntryId(null);
    setTransferTargetId("");
    setTransferDate("");
  }

  async function handleInscrever(athlete: Athlete) {
    setProcessing(athlete.id);
    const result = await inscreverAtletaQualquer(editionTeam.id, athlete.id, null);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Atleta submetido para aprovação.");
    setEntries(prev => [...prev, {
      id: (result as any).id ?? crypto.randomUUID(),
      member_type: "athlete",
      status: "pending",
      athlete_id: athlete.id,
      staff_member_id: null,
      position_label_at_inscription: athlete.player_positions?.full_name ?? null,
      athletes: athlete as any,
      staff_members: null,
    }]);
    setAvailableAthletes(prev => prev.filter(a => a.id !== athlete.id));
    setSearchResults(prev => prev.filter(a => a.id !== athlete.id));
  }

  async function handleInscreverStaff(member: Staff) {
    setProcessing(member.id);
    const result = await inscreverAtletaQualquer(editionTeam.id, member.id, null, "staff");
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }

    toast("success", "Membro submetido para aprovação.");
    setEntries(prev => [...prev, {
      id: (result as any).id ?? crypto.randomUUID(),
      member_type: "staff",
      status: "pending",
      athlete_id: null,
      staff_member_id: member.id,
      position_label_at_inscription: null,
      athletes: null,
      staff_members: member as any,
    }]);
    setAvailableStaff(prev => prev.filter(s => s.id !== member.id));
    setStaffSearchResults(prev => prev.filter(s => s.id !== member.id));
  }

  async function handleCriarAtleta() {
    if (!createFullName.trim()) { setCreateError("Nome completo é obrigatório."); return; }
    setCreateLoading(true); setCreateError(null);
    const fd = new FormData();
    fd.append("full_name", createFullName.trim());
    if (createSurname) fd.append("surname", createSurname.trim());
    fd.append("gender", createGender);
    if (createPositionId) fd.append("position_id", createPositionId);
    if (createBirthDate) fd.append("birth_date", createBirthDate);
    if (createRg) fd.append("rg", createRg);
    if (createFile) fd.append("photo", createFile);

    const result = await criarAtleta(fd);
    if ("error" in result) { setCreateError(result.error); setCreateLoading(false); return; }

    // Inscreve na edição automaticamente
    const inscResult = await inscreverAtletaQualquer(editionTeam.id, result.id, createPositionId || null);
    setCreateLoading(false);

    if ("error" in inscResult) {
      toast("error", `Atleta criado mas erro ao inscrever: ${inscResult.error}`);
    } else {
      toast("success", "Atleta criado e submetido para aprovação.");
      const newAthlete: Athlete = {
        id: result.id,
        full_name: createFullName.trim(),
        surname: createSurname.trim() || null,
        photo_url: null,
        player_positions: positions.find(p => p.id === createPositionId) ? {
          full_name: positions.find(p => p.id === createPositionId)!.full_name,
          abbreviation: positions.find(p => p.id === createPositionId)!.abbreviation,
        } : null,
      };
      setEntries(prev => [...prev, {
        id: (inscResult as any).id ?? crypto.randomUUID(),
        member_type: "athlete",
        status: "pending",
        athlete_id: result.id,
        staff_member_id: null,
        position_label_at_inscription: newAthlete.player_positions?.full_name ?? null,
        athletes: newAthlete as any,
        staff_members: null,
      }]);
    }
    setShowCreateModal(false);
    setShowSearchModal(false);
    resetCreateForm();
  }

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b relative overflow-hidden"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse at top left, ${teamColor}18 0%, transparent 60%)` }} />
        <div className="relative px-8 pt-6 pb-0">
        <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competitionName, href: `/competicoes/${competitionId}` },
            { label: edicaoName, href: `/competicoes/${competitionId}?edicao=${edicaoId}&aba=competicao&comp=equipes` },
            { label: (team?.short_name ?? team?.full_name ?? "Equipe") },
          ]} />
          <div className="mb-6 flex items-center gap-6">
            <div className="relative shrink-0">
              {team?.logo_url ? (
                <img src={team.logo_url} alt="" className="h-24 w-24 rounded-xl object-contain"
                style={{ filter: `drop-shadow(0 0 14px ${teamColor}77)` }} />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border font-display text-2xl font-bold"
                  style={{ borderColor: teamColor, backgroundColor: `${teamColor}11`, color: teamColor }}>
                  {team?.abbreviation?.slice(0, 2) ?? "?"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs truncate mb-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {team?.full_name ?? ""}
              </p>
              <h1 className="font-display text-3xl font-bold truncate leading-tight" style={{ color: "var(--color-text-primary)" }}>
                {(team?.short_name ?? team?.full_name ?? "Equipe").toUpperCase()}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-xs font-bold" style={{ color: teamColor }}>{competitionName}</span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>· {edicaoName}</span>
                {pendingCount > 0 && (
                  <span className="font-mono text-xs rounded px-2 py-0.5"
                    style={{ backgroundColor: "rgba(242,192,5,0.15)", color: "#F2C005" }}>
                    {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            {editionTeam.is_free_agent_pool !== true && (
              <button type="button" onClick={() => setShowSearchModal(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shrink-0"
                style={{ backgroundColor: teamColor, color: "#0D0D0D" }}>
                <Plus size={15} strokeWidth={2.5} />
                {activeTab === "atletas" ? "Novo atleta" : "Nova comissão"}
              </button>
            )}
          </div>
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${teamColor}88 0%, transparent 60%)` }} />
          <div className="flex gap-6">
            {[
              { key: "atletas", label: `ATLETAS (${athletes.length})` },
              { key: "comissao", label: `COMISSÃO (${staff.length})` },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors mt-1"
                style={{
                  borderColor: activeTab === tab.key ? teamColor : "transparent",
                  color: activeTab === tab.key ? teamColor : "#A6A6A6",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6 space-y-4">
        {activeTab === "atletas" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Elenco inscrito ({athletes.length})
              </h2>
              <div className="flex gap-3">
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {athletes.filter(e => e.status === "approved").length} ativos
                </span>
                {athletes.filter(e => e.status === "inactive").length > 0 && (
                  <span className="font-mono text-xs" style={{ color: "#555" }}>
                    · {athletes.filter(e => e.status === "inactive").length} inativos
                  </span>
                )}
              </div>
            </div>
            {athletes.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
                Nenhum atleta inscrito. Clique em "Novo atleta" para começar.
              </p>
            ) : (
              athletes.map((entry) => (
                <div key={entry.id} style={{ opacity: entry.status === "inactive" ? 0.45 : 1, transition: "opacity 0.15s" }}>
                  <RosterCard
                    photoUrl={entry.athletes?.photo_url ?? null}
                    displayName={entry.athletes?.surname ?? entry.athletes?.full_name ?? "?"}
                    fullName={entry.athletes?.full_name ?? "—"}
                    subtitle={entry.position_label_at_inscription ?? entry.athletes?.player_positions?.full_name ?? "—"}
                    positionAbbr={entry.athletes?.player_positions?.abbreviation ?? null}
                    birthDate={(entry.athletes as any)?.birth_date ?? null}
                    rg={(entry.athletes as any)?.rg ?? null}
                    teamColor={teamColor}
                    statusEl={
                      <span className="font-mono text-xs rounded px-2 py-0.5"
                        style={{ backgroundColor: `${STATUS_COLOR[entry.status] ?? "#555"}22`, color: STATUS_COLOR[entry.status] ?? "#555" }}>
                        {STATUS_LABEL[entry.status] ?? entry.status}
                      </span>
                    }
                    actionsEl={
                      <>
                        {entry.status === "pending" && (
                          <>
                            <ActionButton icon={<Check size={14} strokeWidth={2.5} />} label="Aprovar"
                              onClick={() => { setApproveEntryId(entry.id); setApproveStartDate(""); }}
                              disabled={processing === entry.id}
                              color="var(--color-brand)" />
                            <ActionButton icon={<X size={14} strokeWidth={2.5} />} label="Rejeitar"
                              onClick={() => { setRejectEntryId(entry.id); setRejectReason(""); }}
                              disabled={processing === entry.id}
                              color="var(--color-danger)" />
                          </>
                        )}
                        {entry.status === "approved" && (
                          <>
                            <ActionButton icon={<ArrowRightLeft size={14} strokeWidth={2.5} />} label="Transferir"
                              onClick={() => { setTransferEntryId(entry.id); setTransferTargetId(""); }}
                              disabled={processing === entry.id} />
                            <ActionButton icon={<Ban size={14} strokeWidth={2.5} />} label="Desativar"
                              onClick={() => handleDesativar(entry.id)} disabled={processing === entry.id}
                              color="#F2C005" />
                          </>
                        )}
                        {entry.status === "inactive" && (
                          <ActionButton icon={<RotateCcw size={14} strokeWidth={2.5} />} label="Reativar"
                            onClick={() => handleReativar(entry.id)} disabled={processing === entry.id}
                            color="var(--color-brand)" />
                        )}
                        {entry.member_type === "athlete" && entry.athlete_id && (
  <ActionButton
    icon={<History size={14} strokeWidth={2.5} />}
    label="Histórico"
    onClick={() => handleOpenHistory(
      entry.athlete_id!,
      entry.athletes?.surname ?? entry.athletes?.full_name ?? "Atleta",
      "athlete"
    )}
    disabled={processing === entry.id}
  />
)}
<ActionButton icon={<Trash2 size={14} strokeWidth={2.5} />} label="Remover"
  onClick={() => handleRemover(entry.id)} disabled={processing === entry.id}
  color="var(--color-danger)" />
                      </>
                    }
                  />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "comissao" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Comissão inscrita ({staff.length})
              </h2>
            </div>
            {staff.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
                Nenhum membro inscrito.
              </p>
            ) : (
              staff.map((entry) => (
                <div key={entry.id} style={{ opacity: entry.status === "inactive" ? 0.45 : 1, transition: "opacity 0.15s" }}>
                  <RosterCard
                    photoUrl={entry.staff_members?.photo_url ?? null}
                    displayName={entry.staff_members?.surname ?? entry.staff_members?.full_name ?? "?"}
                    fullName={entry.staff_members?.full_name ?? "—"}
                    subtitle={entry.staff_members?.staff_roles?.full_name ?? "—"}
                    positionAbbr={null}
                    birthDate={null}
                    rg={null}
                    teamColor={teamColor}
                    statusEl={
                      <span className="font-mono text-xs rounded px-2 py-0.5"
                        style={{ backgroundColor: `${STATUS_COLOR[entry.status] ?? "#555"}22`, color: STATUS_COLOR[entry.status] ?? "#555" }}>
                        {STATUS_LABEL[entry.status] ?? entry.status}
                      </span>
                    }
                    actionsEl={
                      <>
                        {entry.status === "pending" && (
                          <>
                            <ActionButton icon={<Check size={14} strokeWidth={2.5} />} label="Aprovar"
                              onClick={() => { setApproveEntryId(entry.id); setApproveStartDate(""); }}
                              disabled={processing === entry.id}
                              color="var(--color-brand)" />
                            <ActionButton icon={<X size={14} strokeWidth={2.5} />} label="Rejeitar"
                              onClick={() => { setRejectEntryId(entry.id); setRejectReason(""); }}
                              disabled={processing === entry.id}
                              color="var(--color-danger)" />
                          </>
                        )}
                        {entry.status === "approved" && (
  <>
    <ActionButton icon={<ArrowRightLeft size={14} strokeWidth={2.5} />} label="Transferir"
      onClick={() => { setTransferEntryId(entry.id); setTransferTargetId(""); setTransferDate(""); }}
      disabled={processing === entry.id} />
    <ActionButton icon={<Ban size={14} strokeWidth={2.5} />} label="Desativar"
      onClick={() => handleDesativar(entry.id)} disabled={processing === entry.id}
      color="#F2C005" />
  </>
)}
                        
                        {entry.status === "inactive" && (
                          <ActionButton icon={<RotateCcw size={14} strokeWidth={2.5} />} label="Reativar"
                            onClick={() => handleReativar(entry.id)} disabled={processing === entry.id}
                            color="var(--color-brand)" />
                        )}
                        {entry.member_type === "staff" && entry.staff_member_id && (
  <ActionButton
    icon={<History size={14} strokeWidth={2.5} />}
    label="Histórico"
    onClick={() => handleOpenHistory(
      entry.staff_member_id!,
      entry.staff_members?.surname ?? entry.staff_members?.full_name ?? "Membro",
      "staff"
    )}
    disabled={processing === entry.id}
  />
)}
<ActionButton icon={<Trash2 size={14} strokeWidth={2.5} />} label="Remover"
  onClick={() => handleRemover(entry.id)} disabled={processing === entry.id}
  color="var(--color-danger)" />
                      </>
                    }
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── MODAL CONFIRMAR REMOÇÃO ── */}
      {removeConfirmEntryId && !removeBlocked && !checkingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-2 font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Remover membro</h2>
            <p className="mb-5 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Esta ação é permanente. O membro será removido da inscrição desta edição.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setRemoveConfirmEntryId(null); setRemoveBlocked(false); }}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmarRemocao}
                disabled={processing === removeConfirmEntryId}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
                {processing === removeConfirmEntryId ? "Removendo…" : "Confirmar remoção"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REMOÇÃO BLOQUEADA ── */}
      {removeConfirmEntryId && removeBlocked && !checkingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255,68,68,0.12)" }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
              </div>
              <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Remoção bloqueada</h2>
            </div>
            <p className="mb-2 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Este membro possui dados registrados na competição (partidas, ações, etc.) e não pode ser removido.
            </p>
            <p className="mb-5 font-mono text-sm rounded-lg border px-3 py-2"
              style={{ color: "#F2C005", borderColor: "rgba(242,192,5,0.2)", backgroundColor: "rgba(242,192,5,0.06)" }}>
              Para removê-lo da visibilidade, <strong>desative a inscrição</strong> ou <strong>transfira para "Sem clube"</strong>.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setRemoveConfirmEntryId(null); setRemoveBlocked(false); }}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REJEITAR ── */}
      {rejectEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-display text-base" style={{ color: "var(--color-text-primary)" }}>Rejeitar inscrição</h2>
              <button type="button" onClick={() => setRejectEntryId(null)}
                style={{ color: "var(--color-text-secondary)" }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Motivo da rejeição:</p>
              <div className="space-y-2">
                {[
                  "Documento inválido ou ilegível",
                  "Documento não corresponde ao membro",
                  "Fora da faixa etária permitida",
                  "Informações cadastrais incompletas",
                  "Foto de perfil inadequada ou ausente",
                  "Outro motivo",
                ].map(reason => (
                  <button key={reason} type="button"
                    onClick={() => setRejectReason(reason)}
                    className="flex items-center gap-2 w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={{
                      borderColor: rejectReason === reason ? "var(--color-danger)" : "var(--color-border)",
                      backgroundColor: rejectReason === reason ? "rgba(255,68,68,0.06)" : "transparent",
                      color: rejectReason === reason ? "var(--color-danger)" : "var(--color-text-primary)",
                    }}>
                    <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: rejectReason === reason ? "var(--color-danger)" : "var(--color-border)" }}>
                      {rejectReason === reason && (
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-danger)" }} />
                      )}
                    </div>
                    <span className="font-mono text-xs">{reason}</span>
                  </button>
                ))}
              </div>
              {rejectReason === "Outro motivo" && (
                <input type="text" placeholder="Descreva o motivo…"
                  value={rejectReason === "Outro motivo" ? "" : rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }} />
              )}
            </div>
            <div className="flex gap-2 justify-end border-t px-5 py-4"
              style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setRejectEntryId(null)}
                className="rounded-lg border px-4 py-2 font-mono text-xs"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button"
                onClick={() => rejectEntryId && handleRejeitar(rejectEntryId, rejectReason)}
                disabled={processing === rejectEntryId || !rejectReason}
                className="rounded-lg px-4 py-2 font-mono text-xs font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
                {processing === rejectEntryId ? "Rejeitando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE BUSCA ── */}
      {showSearchModal && !showCreateModal && !isFreeAgentPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-xl border shadow-xl flex flex-col"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", maxHeight: "75vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0"
              style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>
                {activeTab === "atletas" ? "Adicionar atleta" : "Adicionar membro"}
              </h2>
              <button type="button" onClick={() => { setShowSearchModal(false); setSearchQuery(""); }}
                style={{ color: "var(--color-text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Campo de busca */}
            <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <Search size={14} style={{ color: "var(--color-text-secondary)" }} />
                <input type="text" autoFocus
                  placeholder="Buscar por nome ou apelido…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "var(--color-text-primary)" }} />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")}
                    style={{ color: "var(--color-text-secondary)" }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Resultados */}
            <div className="overflow-y-auto flex-1">
            {activeTab === "atletas" ? (
              searchResults.length === 0 ? (
                <p className="px-6 py-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
                  {searchQuery ? "Nenhum atleta encontrado com este nome." : "Todos os atletas já estão inscritos."}
                </p>
              ) : (
                searchResults.map((athlete, idx) => (
                  <div key={athlete.id} className="flex items-center gap-3 px-6 py-3 group transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {athlete.photo_url ? (
                      <img src={athlete.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {(athlete.surname ?? athlete.full_name).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                        {athlete.full_name}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {athlete.surname ? `"${athlete.surname}" · ` : ""}{athlete.player_positions?.full_name ?? "—"}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => handleInscrever(athlete)}
                      disabled={processing === athlete.id}
                      className="shrink-0 rounded border px-3 py-1.5 font-mono text-xs disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ borderColor: teamColor, color: teamColor }}>
                      {processing === athlete.id ? "…" : "Inscrever"}
                    </button>
                  </div>
                ))
              )
            ) : (
              staffSearchResults.length === 0 ? (
                <p className="px-6 py-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
                  {searchQuery ? "Nenhum membro encontrado com este nome." : "Toda a comissão já está inscrita."}
                </p>
              ) : (
                staffSearchResults.map((member, idx) => (
                  <div key={member.id} className="flex items-center gap-3 px-6 py-3 group transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {member.photo_url ? (
                      <img src={member.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {(member.surname ?? member.full_name).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                        {member.full_name}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {member.surname ? `"${member.surname}" · ` : ""}{member.staff_roles?.full_name ?? "—"}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => handleInscreverStaff(member)}
                      disabled={processing === member.id}
                      className="shrink-0 rounded border px-3 py-1.5 font-mono text-xs disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ borderColor: teamColor, color: teamColor }}>
                      {processing === member.id ? "…" : "Inscrever"}
                    </button>
                  </div>
                ))
              )
            )}
            </div>

            {/* Rodapé — criar novo */}
            <div className="border-t px-6 py-4 shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <button type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full rounded-lg border py-3 text-sm font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Não encontrou? <span style={{ color: teamColor }}>Criar novo atleta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRIAR ATLETA ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-xl border shadow-xl flex flex-col"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0"
              style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="font-mono text-xs"
                  style={{ color: "var(--color-text-secondary)" }}>
                  ← Voltar
                </button>
                <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Novo atleta</h2>
              </div>
              <button type="button" onClick={() => { setShowCreateModal(false); setShowSearchModal(false); resetCreateForm(); }}
                style={{ color: "var(--color-text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* Foto */}
              <div className="flex flex-col items-center gap-3 pb-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 overflow-hidden transition-opacity hover:opacity-80"
                  style={{ borderColor: teamColor, backgroundColor: `${teamColor}11` }}>
                  {createPreview ? (
                    <img src={createPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl">📷</span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setCreateFile(f);
                    setCreatePreview(f ? URL.createObjectURL(f) : null);
                  }} />
                <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Foto (opcional)</p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo *</span>
                <input type="text" value={createFullName} onChange={e => setCreateFullName(e.target.value)}
                  className={inputClass} style={inputStyle} placeholder="Ex: João da Silva" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Apelido</span>
                <input type="text" value={createSurname} onChange={e => setCreateSurname(e.target.value)}
                  className={inputClass} style={inputStyle} placeholder="Ex: Joãozinho" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
                  <select value={createGender} onChange={e => setCreateGender(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Posição</span>
                  <select value={createPositionId} onChange={e => setCreatePositionId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Selecione…</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data de nascimento</span>
                  <input type="text" placeholder="DD/MM/AAAA" value={createBirthDate} maxLength={10}
                    onChange={e => setCreateBirthDate(applyDateMask(e.target.value))}
                    className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>RG</span>
                  <input type="text" value={createRg}
                    onChange={e => setCreateRg(e.target.value.replace(/[^\d.\-]/g, ""))}
                    className={inputClass} style={inputStyle} placeholder="000.000.000-0" />
                </label>
              </div>

              {createError && (
                <p className="text-sm" style={{ color: "var(--color-danger)" }}>{createError}</p>
              )}
            </div>

            <div className="flex gap-3 border-t px-6 py-4 justify-end shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setShowCreateModal(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleCriarAtleta} disabled={createLoading || !createFullName.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: teamColor, color: "#0D0D0D" }}>
                {createLoading ? "Criando…" : "Criar e inscrever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TRANSFERIR ── */}
{transferEntryId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
    <div className="w-full max-w-sm rounded-xl border shadow-xl p-6"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <h2 className="mb-4 font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Transferir atleta</h2>
      <div className="space-y-3 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Destino</span>
          <select value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}
            className={inputClass} style={inputStyle}>
            <option value="">Selecione…</option>
            {freeAgentPoolId && (
              <option value={freeAgentPoolId}>⚪ Sem clube (free agent)</option>
            )}
            {allEditionTeams.map(et => (
              <option key={et.id} value={et.id}>{et.teams?.full_name ?? "—"}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Data da transferência <span style={{ color: "var(--color-danger)" }}>*</span>
          </span>
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={transferDate}
            maxLength={10}
            onChange={e => setTransferDate(applyDateMask(e.target.value))}
            className={inputClass}
            style={inputStyle}
          />
          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Partidas anteriores a esta data mantêm o atleta na equipe de origem.
          </span>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button"
          onClick={() => { setTransferEntryId(null); setTransferTargetId(""); setTransferDate(""); }}
          className="rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          Cancelar
        </button>
        <button type="button" onClick={handleTransferir}
          disabled={!transferTargetId || !transferDate || transferDate.length < 10 || processing === transferEntryId}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {processing === transferEntryId ? "Transferindo…" : "Confirmar"}
        </button>
      </div>
    </div>
  </div>
)}

{/* ── MODAL APROVAR ── */}
{approveEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-1 font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Aprovar inscrição</h2>
            <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Informe a data de início do atleta nesta equipe. Esta data define a partir de quando ele pode jogar.
            </p>
            <label className="flex flex-col gap-1 mb-4">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Data de início <span style={{ color: "var(--color-danger)" }}>*</span>
              </span>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={approveStartDate}
                maxLength={10}
                autoFocus
                onChange={e => setApproveStartDate(applyDateMask(e.target.value))}
                className={inputClass}
                style={inputStyle}
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button"
                onClick={() => { setApproveEntryId(null); setApproveStartDate(""); }}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button"
                onClick={() => approveEntryId && handleAprovar(approveEntryId)}
                disabled={!approveStartDate || approveStartDate.length < 10 || processing === approveEntryId}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {processing === approveEntryId ? "Aprovando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
        )}

{/* ── MODAL HISTÓRICO DE STINTS ── */}
{historyAthleteId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
    <div className="w-full max-w-lg rounded-xl border shadow-xl flex flex-col"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", maxHeight: "80vh" }}>

      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0"
        style={{ borderColor: "var(--color-border)" }}>
        <div>
          <h2 className="font-display text-lg" style={{ color: "var(--color-text-primary)" }}>
            Histórico na edição
          </h2>
          <p className="font-mono text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {historyAthleteName.toUpperCase()}
          </p>
        </div>
        <button type="button"
          onClick={() => { setHistoryAthleteId(null); setEditingStintId(null); }}
          style={{ color: "var(--color-text-secondary)" }}>
          <X size={18} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="overflow-y-auto flex-1 px-6 py-4">
        {historyLoading ? (
          <p className="text-center py-8 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Carregando…
          </p>
        ) : historyStints.length === 0 ? (
          <p className="text-center py-8 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhum stint registrado nesta edição.
          </p>
        ) : (
          <div className="space-y-2">
            {historyStints.map((stint) => (
              <div key={stint.id} className="rounded-lg border p-4"
                style={{
                  borderColor: stint.is_current ? teamColor : "var(--color-border)",
                  backgroundColor: stint.is_current ? `${teamColor}08` : "transparent",
                }}>

                {editingStintId === stint.id ? (
                  // Modo edição
                  <div className="space-y-3">
                    <p className="font-mono text-xs font-bold" style={{ color: teamColor }}>
                      {stint.team_name.toUpperCase()}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          Data de entrada
                        </span>
                        <input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={editStintStarted}
                          maxLength={10}
                          onChange={e => setEditStintStarted(applyDateMask(e.target.value))}
                          className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          Data de saída
                        </span>
                        <input
                          type="text"
                          placeholder="DD/MM/AAAA ou vazio"
                          value={editStintEnded}
                          maxLength={10}
                          onChange={e => setEditStintEnded(applyDateMask(e.target.value))}
                          className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
                        />
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          Deixe vazio se ainda está ativo
                        </span>
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button"
                        onClick={() => setEditingStintId(null)}
                        className="rounded-lg border px-3 py-1.5 font-mono text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Cancelar
                      </button>
                      <button type="button"
                        onClick={() => handleSaveStint(stint.id)}
                        disabled={!editStintStarted || editStintStarted.length < 10 || savingStint}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs font-medium disabled:opacity-50"
                        style={{ backgroundColor: teamColor, color: "#0D0D0D" }}>
                        {savingStint ? "Salvando…" : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo visualização
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-sm font-bold truncate"
                          style={{ color: "var(--color-text-primary)" }}>
                          {stint.team_name.toUpperCase()}
                        </p>
                        {stint.is_current && (
                          <span className="shrink-0 font-mono text-xs rounded px-1.5 py-0.5"
                            style={{ backgroundColor: `${teamColor}22`, color: teamColor }}>
                            ATUAL
                          </span>
                        )}
                        {stint.movement_type && (
                          <span className="shrink-0 font-mono text-xs rounded px-1.5 py-0.5"
                            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}>
                            {stint.movement_type === "arrival" ? "chegada" : stint.movement_type === "transfer" ? "transferência" : stint.movement_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs"
                        style={{ color: "var(--color-text-secondary)" }}>
                        <span>
                          {new Date(stint.started_at + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span>→</span>
                        <span style={{ color: stint.is_current ? teamColor : "var(--color-text-secondary)" }}>
                          {stint.ended_at
                            ? new Date(stint.ended_at + "T00:00:00").toLocaleDateString("pt-BR")
                            : "Atual"}
                        </span>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => {
                        setEditingStintId(stint.id);
                        const toDisplay = (iso: string) => {
                          const [y, m, d] = iso.split("-");
                          return `${d}/${m}/${y}`;
                        };
                        setEditStintStarted(toDisplay(stint.started_at));
                        setEditStintEnded(stint.ended_at ? toDisplay(stint.ended_at) : "");
                      }}
                      className="shrink-0 rounded border px-3 py-1.5 font-mono text-xs transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Editar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 shrink-0 flex justify-end"
        style={{ borderColor: "var(--color-border)" }}>
        <button type="button"
          onClick={() => { setHistoryAthleteId(null); setEditingStintId(null); }}
          className="rounded-lg border px-4 py-2 font-mono text-xs"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          Fechar
        </button>
      </div>
    </div>
  </div>
)}

</div>
  );
}