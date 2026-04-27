"use client";

import { useState } from "react";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { inscreverAtleta, removerAtletaEdicao, aprovarInscricao } from "../../../actions";
import { Plus, Check } from "lucide-react";

type RosterEntry = {
  id: string;
  member_type: string;
  status: string;
  athlete_id: string | null;
  staff_member_id: string | null;
  position_label_at_inscription: string | null;
  athletes: {
    id: string; full_name: string; surname: string | null; photo_url: string | null;
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

type Position = { id: string; full_name: string; abbreviation: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#F2C005",
  approved: "var(--color-brand)",
  rejected: "var(--color-danger)",
};

export default function EquipeEdicaoClient({
  competitionId, competitionName, edicaoId, edicaoName,
  editionTeam, rosterEntries: initialEntries,
  availableAthletes: initialAthletes, availableStaff: initialStaff, positions,
}: {
  competitionId: string; competitionName: string;
  edicaoId: string; edicaoName: string;
  editionTeam: any;
  rosterEntries: RosterEntry[];
  availableAthletes: Athlete[];
  availableStaff: Staff[];
  positions: Position[];
}) {
  const [entries, setEntries] = useState<RosterEntry[]>(initialEntries);
  const [availableAthletes, setAvailableAthletes] = useState<Athlete[]>(initialAthletes);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>(initialStaff);
  const [activeTab, setActiveTab] = useState<"atletas" | "comissao">("atletas");
  const [processing, setProcessing] = useState<string | null>(null);

  const team = editionTeam.teams;
  const teamColor = team?.primary_color ?? "var(--color-brand)";

  const athletes = entries.filter(e => e.member_type === "athlete");
  const staff = entries.filter(e => e.member_type === "staff");

  const pendingCount = entries.filter(e => e.status === "pending").length;

  async function handleInscriverAtleta(athleteId: string, positionId: string | null) {
    setProcessing(athleteId);
    const result = await inscreverAtleta(editionTeam.id, athleteId, positionId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Atleta inscrito.");
    const athlete = availableAthletes.find(a => a.id === athleteId);
    if (athlete) {
      setEntries(prev => [...prev, {
        id: (result as any).id ?? crypto.randomUUID(),
        member_type: "athlete",
        status: "approved",
        athlete_id: athleteId,
        staff_member_id: null,
        position_label_at_inscription: athlete.player_positions?.full_name ?? null,
        athletes: athlete as any,
        staff_members: null,
      }]);
      setAvailableAthletes(prev => prev.filter(a => a.id !== athleteId));
    }
  }

  async function handleRemover(entryId: string, memberId: string | null, memberType: string) {
    if (!confirm("Remover desta edição?")) return;
    setProcessing(entryId);
    const result = await removerAtletaEdicao(entryId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Removido.");
    const removed = entries.find(e => e.id === entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
    if (removed?.athletes) setAvailableAthletes(prev => [...prev, removed.athletes as Athlete]);
    if (removed?.staff_members) setAvailableStaff(prev => [...prev, removed.staff_members as Staff]);
  }

  async function handleAprovar(entryId: string) {
    setProcessing(entryId);
    const result = await aprovarInscricao(entryId);
    setProcessing(null);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Aprovado.");
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "approved" } : e));
  }

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competitionName, href: `/competicoes/${competitionId}` },
            { label: edicaoName, href: `/competicoes/${competitionId}?edicao=${edicaoId}` },
            { label: team?.full_name ?? "Equipe" },
          ]} />

          <div className="mb-4 flex items-center gap-4">
            {team?.logo_url ? (
              <img src={team.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-contain border"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {team?.abbreviation?.slice(0, 2) ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {team?.full_name ?? "Equipe"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs" style={{ color: teamColor }}>{competitionName}</span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>· {edicaoName}</span>
                {pendingCount > 0 && (
                  <span className="font-mono text-xs rounded px-2 py-0.5"
                    style={{ backgroundColor: "rgba(242,192,5,0.15)", color: "#F2C005" }}>
                    {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-6">
            {[
              { key: "atletas", label: `ATLETAS (${athletes.length})` },
              { key: "comissao", label: `COMISSÃO (${staff.length})` },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors"
                style={{
                  borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent",
                  color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6 space-y-6">

        {/* ABA ATLETAS */}
        {activeTab === "atletas" && (
          <>
            {/* Inscritos */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Inscritos ({athletes.length})
                </h2>
              </div>
              {athletes.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum atleta inscrito.</p>
              ) : (
                athletes.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-3 group"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {entry.athletes?.photo_url ? (
                      <img src={entry.athletes.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {(entry.athletes?.surname ?? entry.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {entry.athletes?.surname ?? entry.athletes?.full_name ?? "—"}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {entry.position_label_at_inscription ?? entry.athletes?.player_positions?.full_name ?? "—"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs rounded px-2 py-0.5"
                      style={{
                        backgroundColor: `${STATUS_COLOR[entry.status]}22`,
                        color: STATUS_COLOR[entry.status] ?? "#A6A6A6",
                      }}>
                      {STATUS_LABEL[entry.status] ?? entry.status}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {entry.status === "pending" && (
                        <button type="button" onClick={() => handleAprovar(entry.id)}
                          disabled={processing === entry.id}
                          className="flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs disabled:opacity-50 hover:border-[var(--color-brand)]"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                          <Check size={11} /> Aprovar
                        </button>
                      )}
                      <button type="button"
                        onClick={() => handleRemover(entry.id, entry.athlete_id, "athlete")}
                        disabled={processing === entry.id}
                        className="rounded border px-2 py-1 font-mono text-xs disabled:opacity-50 hover:border-[var(--color-danger)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Disponíveis */}
            {availableAthletes.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Disponíveis para inscrição ({availableAthletes.length})
                  </h2>
                </div>
                {availableAthletes.map((athlete, idx) => (
                  <div key={athlete.id} className="flex items-center gap-4 px-5 py-3 group"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: 0.55, transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}>
                    {athlete.photo_url ? (
                      <img src={athlete.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {(athlete.surname ?? athlete.full_name).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {athlete.surname ?? athlete.full_name}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {athlete.player_positions?.full_name ?? "—"}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => handleInscriverAtleta(athlete.id, null)}
                      disabled={processing === athlete.id}
                      className="shrink-0 flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-xs disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity hover:border-[var(--color-brand)]"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                      <Plus size={12} /> Inscrever
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA COMISSÃO */}
        {activeTab === "comissao" && (
          <>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Inscritos ({staff.length})
                </h2>
              </div>
              {staff.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum membro inscrito.</p>
              ) : (
                staff.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-3 group"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {entry.staff_members?.photo_url ? (
                      <img src={entry.staff_members.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {(entry.staff_members?.surname ?? entry.staff_members?.full_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {entry.staff_members?.surname ?? entry.staff_members?.full_name ?? "—"}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {entry.staff_members?.staff_roles?.full_name ?? "—"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs rounded px-2 py-0.5"
                      style={{
                        backgroundColor: `${STATUS_COLOR[entry.status]}22`,
                        color: STATUS_COLOR[entry.status] ?? "#A6A6A6",
                      }}>
                      {STATUS_LABEL[entry.status] ?? entry.status}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {entry.status === "pending" && (
                        <button type="button" onClick={() => handleAprovar(entry.id)}
                          disabled={processing === entry.id}
                          className="flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs disabled:opacity-50 hover:border-[var(--color-brand)]"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                          <Check size={11} /> Aprovar
                        </button>
                      )}
                      <button type="button"
                        onClick={() => handleRemover(entry.id, entry.staff_member_id, "staff")}
                        disabled={processing === entry.id}
                        className="rounded border px-2 py-1 font-mono text-xs disabled:opacity-50 hover:border-[var(--color-danger)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {availableStaff.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Disponíveis ({availableStaff.length})
                  </h2>
                </div>
                {availableStaff.map((member, idx) => (
                  <div key={member.id} className="flex items-center gap-4 px-5 py-3 group"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", opacity: 0.55, transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}>
                    {member.photo_url ? (
                      <img src={member.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {(member.surname ?? member.full_name).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {member.surname ?? member.full_name}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {member.staff_roles?.full_name ?? "—"}
                      </p>
                    </div>
                    <button type="button"
                      onClick={async () => {
                        setProcessing(member.id);
                        const result = await inscreverAtleta(editionTeam.id, member.id, null);
                        setProcessing(null);
                        if ("error" in result) { toast("error", result.error); return; }
                        toast("success", "Membro inscrito.");
                        setEntries(prev => [...prev, {
                          id: (result as any).id ?? crypto.randomUUID(),
                          member_type: "staff",
                          status: "approved",
                          athlete_id: null,
                          staff_member_id: member.id,
                          position_label_at_inscription: null,
                          athletes: null,
                          staff_members: member as any,
                        }]);
                        setAvailableStaff(prev => prev.filter(s => s.id !== member.id));
                      }}
                      disabled={processing === member.id}
                      className="shrink-0 flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-xs disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity hover:border-[var(--color-brand)]"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                      <Plus size={12} /> Inscrever
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}