"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoMembroModal } from "./novo-membro-modal";
import { Plus, Eye, SquarePen } from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  staff_role_id: string | null;
  staff_team_stints: { team_id: string; is_current: boolean; teams: { full_name: string; abbreviation: string | null } | null }[];
};

type Role = { id: string; full_name: string };

function MemberRow({ member, roleMap, isFirst }: { member: Member; roleMap: Record<string, string>; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  const currentStint = member.staff_team_stints?.find(s => s.is_current);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: isFirst ? "none" : "1px solid var(--color-border)",
        opacity: hovered ? 1 : 0.45,
        transition: "opacity 0.15s ease",
      }}>
      <Link href={`/comissao/${member.id}`} className="flex items-center gap-6 py-4 pr-4">
        {/* Foto */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden border"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
          {member.photo_url ? (
            <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {(member.surname ?? member.full_name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Apelido / nome curto */}
        <span className="w-24 shrink-0 font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {(member.surname ?? member.full_name.split(" ")[0]).toUpperCase().slice(0, 10)}
        </span>

        {/* Nome completo */}
        <span className="flex-1 font-mono text-sm font-normal" style={{ color: "var(--color-text-primary)" }}>
          {member.full_name.toUpperCase()}
        </span>

        {/* Badges e ações */}
        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
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
          <Link href={`/comissao/${member.id}`}
            className="transition-colors hover:text-[var(--color-brand)]"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={e => e.stopPropagation()}>
            <SquarePen size={17} strokeWidth={1.8} />
          </Link>
          <Link href="#"
            className="transition-colors hover:text-[var(--color-brand)]"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={e => e.stopPropagation()}>
            <Eye size={17} strokeWidth={1.8} />
          </Link>
        </div>
      </Link>
    </div>
  );
}

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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "membro" : "membros"}
        </p>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo membro
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <input type="text" placeholder="Buscar membro…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} flex-1 min-w-[200px]`} style={is} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={ic} style={is}>
            <option value="">Todas as funções</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Nenhum membro encontrado." : "Nenhum membro cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((member, idx) => (
              <MemberRow key={member.id} member={member} roleMap={roleMap} isFirst={idx === 0} />
            ))}
          </div>
        )}
      </div>

      <NovoMembroModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}