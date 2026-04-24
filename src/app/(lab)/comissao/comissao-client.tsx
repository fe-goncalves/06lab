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

const ROLE_TABS = [
  { id: "04ccaa97-71ed-4060-946a-b1dc995c1652", label: "TÉCNICO" },
  { id: "a1071e25-462a-4c62-b81c-c144f4d0594a", label: "AUXILIAR" },
  { id: "eaeb900a-14ce-4d78-9ba5-e689f51ef8d6", label: "DIRETORIA" },
  { id: "f683bc09-1397-406d-bcf8-bb541d991974", label: "REPRESENTANTE" },
];

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
        <span className="w-24 shrink-0 font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {(member.surname ?? member.full_name.split(" ")[0]).toUpperCase().slice(0, 10)}
        </span>
        <span className="flex-1 font-mono text-sm font-normal" style={{ color: "var(--color-text-primary)" }}>
          {member.full_name.toUpperCase()}
        </span>
        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
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
  const [activeTab, setActiveTab] = useState<string>(ROLE_TABS[0].id);
  const [modalOpen, setModalOpen] = useState(false);

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.full_name]));

  const filtered = members.filter(m => {
    const name = `${m.full_name} ${m.surname ?? ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = m.staff_role_id === activeTab;
    return matchSearch && matchRole;
  });

  const countByRole = Object.fromEntries(
    ROLE_TABS.map(tab => [tab.id, members.filter(m => m.staff_role_id === tab.id).length])
  );

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div className="flex h-14 shrink-0 items-center border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="flex flex-1 items-center justify-center gap-6">
          {ROLE_TABS.map(tab => (
            <button key={tab.id} type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 font-mono text-sm transition-opacity"
              style={{ color: activeTab === tab.id ? "var(--color-brand)" : "#A6A6A6" }}>
              {tab.label}
              <span className="font-mono text-xs rounded px-1.5 py-0.5"
                style={{
                  backgroundColor: activeTab === tab.id ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                  color: activeTab === tab.id ? "var(--color-brand)" : "#555",
                }}>
                {countByRole[tab.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo membro
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <input type="text" placeholder="Buscar membro…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} w-full max-w-md`} style={is} />
        </div>

        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "membro" : "membros"}
        </p>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Nenhum membro encontrado." : "Nenhum membro cadastrado nesta função."}
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

      <NovoMembroModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultRoleId={activeTab} />
    </div>
  );
}