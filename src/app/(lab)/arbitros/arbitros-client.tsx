"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoArbitroModal } from "./novo-arbitro-modal";
import { Plus, Eye, SquarePen } from "lucide-react";

type Referee = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  profile_public: boolean;
  birth_date: string | null;
  referee_role_id: string | null;
};

const ROLE_TABS = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "ÁRBITRO" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "ASSISTENTE" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "MESÁRIO" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "STAFF" },
];

function RefereeRow({ referee, isFirst }: { referee: Referee; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: isFirst ? "none" : "1px solid var(--color-border)",
        opacity: hovered ? 1 : 0.45,
        transition: "opacity 0.15s ease",
      }}>
      <Link href={`/arbitros/${referee.id}`} className="flex items-center gap-6 py-4 pr-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden border"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
          {referee.photo_url ? (
            <img src={referee.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {(referee.surname ?? referee.full_name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <span className="w-24 shrink-0 font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {(referee.surname ?? referee.full_name.split(" ")[0]).toUpperCase().slice(0, 10)}
        </span>
        <span className="flex-1 font-mono text-sm font-normal" style={{ color: "var(--color-text-primary)" }}>
          {referee.full_name.toUpperCase()}
        </span>
        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
          {referee.profile_public && (
            <span className="font-mono text-xs rounded px-2 py-0.5"
              style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
              público
            </span>
          )}
          <Link href={`/arbitros/${referee.id}`}
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

export default function ArbitrosClient({ referees: initialReferees }: { referees: Referee[] }) {
  const [referees] = useState(initialReferees);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>(ROLE_TABS[0].id);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = referees.filter(r => {
    const name = `${r.full_name} ${r.surname ?? ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = r.referee_role_id === activeTab;
    return matchSearch && matchRole;
  });

  const countByRole = Object.fromEntries(
    ROLE_TABS.map(tab => [tab.id, referees.filter(r => r.referee_role_id === tab.id).length])
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
          Novo árbitro
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <input type="text" placeholder="Buscar árbitro…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} w-full max-w-md`} style={is} />
        </div>

        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "árbitro" : "árbitros"}
        </p>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Nenhum árbitro encontrado." : "Nenhum árbitro cadastrado nesta função."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((ref, idx) => (
              <RefereeRow key={ref.id} referee={ref} isFirst={idx === 0} />
            ))}
          </div>
        )}
      </div>

      <NovoArbitroModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultRoleId={activeTab} />
    </div>
  );
}