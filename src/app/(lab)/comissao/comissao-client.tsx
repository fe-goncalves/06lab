"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoMembroModal } from "./novo-membro-modal";
import { Plus, ChevronRight } from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  staff_role_id: string | null;
  birth_date: string | null;
  staff_team_stints: { team_id: string; is_current: boolean; teams: { full_name: string; abbreviation: string | null } | null }[];
};

type Role = { id: string; full_name: string };

export default function ComissaoClient({ members: initialMembers, roles }: { members: Member[]; roles: Role[] }) {
  const [members] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.full_name]));

  const filtered = members.filter(m => {
    const name = `${m.full_name} ${m.surname ?? ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = !roleFilter || m.staff_role_id === roleFilter;
    return matchSearch && matchRole;
  });

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>COMISSÃO TÉCNICA</h1>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo membro
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar membro..." value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${ic} flex-1 min-w-[200px]`} style={is} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={ic} style={is}>
          <option value="">Todas as funções</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      </div>

      <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {filtered.length} {filtered.length === 1 ? "membro" : "membros"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border py-16"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {search ? "Nenhum membro encontrado." : "Nenhum membro cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          {filtered.map((member, idx) => {
            const currentStint = member.staff_team_stints?.find(s => s.is_current);
            return (
              <Link key={member.id} href={`/comissao/${member.id}`}
                className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border overflow-hidden"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  {member.photo_url ? (
                    <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
                      {(member.surname ?? member.full_name).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <span className="w-24 shrink-0 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {(member.surname ?? member.full_name.split(" ")[0]).toUpperCase()}
                </span>

                <span className="flex-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {member.full_name.toUpperCase()}
                </span>

                <div className="flex items-center gap-4 shrink-0">
                  {member.staff_role_id && (
                    <span className="font-mono text-xs rounded px-2 py-0.5"
                      style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {roleMap[member.staff_role_id] ?? "—"}
                    </span>
                  )}
                  {currentStint?.teams && (
                    <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {currentStint.teams.abbreviation ?? currentStint.teams.full_name}
                    </span>
                  )}
                  <ChevronRight size={16} style={{ color: "var(--color-text-secondary)" }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <NovoMembroModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
