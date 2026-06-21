"use client";

import Link from "next/link";
import { useState } from "react";
import { NovaEquipeModal } from "./nova-equipe-modal";
import { Plus, SquarePen, Eye, Users } from "lucide-react";
import { entityColorHexAlpha } from "@/lib/lab-theme";

type Team = {
  id: string;
  full_name: string;
  short_name: string | null;
  abbreviation: string | null;
  gender: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  is_virtual?: boolean | null;
};

function normalizeGender(gender: string | null): "male" | "female" | "other" {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "male";
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "other";
}

export default function EquipesClient({ teams: initialTeams }: { teams: Team[] }) {
  const [teams] = useState(initialTeams);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"male" | "female">("male");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const filtered = teams.filter(t => {
    const matchSearch = !search ||
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.abbreviation ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGender = normalizeGender(t.gender) === activeTab;
    return matchSearch && matchGender;
  });

  const maleCount = teams.filter(t => normalizeGender(t.gender) === "male").length;
  const femaleCount = teams.filter(t => normalizeGender(t.gender) === "female").length;

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div
        className="flex h-14 shrink-0 items-center border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex flex-1 items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("male")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "male" ? "var(--color-brand)" : "var(--color-text-secondary)" }}
          >
            <Users size={16} strokeWidth={2} style={{ color: activeTab === "male" ? "var(--color-brand)" : "var(--color-text-secondary)" }} />
            MASCULINO
            <span
              className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeTab === "male" ? "var(--color-brand-filter-bg)" : "var(--color-divider-strong)",
                color: activeTab === "male" ? "var(--color-brand)" : "var(--color-inactive-label)",
              }}
            >
              {maleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("female")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "female" ? "var(--color-brand)" : "var(--color-text-secondary)" }}
          >
            <Users size={16} strokeWidth={2} style={{ color: activeTab === "female" ? "var(--color-brand)" : "var(--color-text-secondary)" }} />
            FEMININO
            <span
              className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeTab === "female" ? "var(--color-brand-filter-bg)" : "var(--color-divider-strong)",
                color: activeTab === "female" ? "var(--color-brand)" : "var(--color-inactive-label)",
              }}
            >
              {femaleCount}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => { setEditingTeam(null); setModalOpen(true); }}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nova equipe
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar equipe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} w-full max-w-md`}
            style={is}
          />
        </div>

        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "equipe" : "equipes"}
        </p>

        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center rounded-xl border py-16 text-center"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search
                ? "Nenhuma equipe encontrada."
                : `Nenhuma equipe ${activeTab === "male" ? "masculina" : "feminina"} cadastrada ainda.`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((team, idx) => (
              <TeamRow
                key={team.id}
                team={team}
                isFirst={idx === 0}
                onEdit={() => { setEditingTeam(team); setModalOpen(true); }}
              />
            ))}
          </div>
        )}
      </div>

      <NovaEquipeModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTeam(null); }}
        defaultGender={activeTab === "male" ? "male" : "female"}
        editingTeam={editingTeam}
      />
    </div>
  );
}

function TeamRow({
  team,
  isFirst,
  onEdit,
}: {
  team: Team;
  isFirst: boolean;
  onEdit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverColor = team.primary_color;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      className="relative overflow-hidden"
      style={{
        borderTop: isFirst ? "none" : "1px solid var(--color-border)",
        opacity: hovered ? 1 : "var(--list-row-opacity)",
        transition: "opacity 0.15s ease",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: hovered ? 0.45 : 0,
          transition: "opacity 0.18s ease",
          background: `radial-gradient(220px circle at ${mousePos.x}px ${mousePos.y}px, ${entityColorHexAlpha(hoverColor, "66")} 0%, transparent 70%)`,
        }}
      />
      <Link
        href={`/equipes/${team.id}`}
        className="relative z-10 flex items-center gap-6 py-4 pr-4"
      >
        {/* Logo */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {team.logo_url ? (
            <img src={team.logo_url} alt="" className="h-10 w-10 object-contain" />
          ) : (
            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {team.abbreviation?.slice(0, 3) ?? team.full_name.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        {/* Sigla */}
        <span className="min-w-[3rem] shrink-0 font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {team.abbreviation?.toUpperCase() ?? team.full_name.slice(0, 3).toUpperCase()}
        </span>

        {/* Nome completo */}
        <span className="flex-1 font-mono text-sm font-normal" style={{ color: "var(--color-text-primary)" }}>
          {team.full_name.toUpperCase()}
        </span>

        {/* Ações */}
        <div className="flex items-center gap-4 shrink-0">
          {!team.is_virtual && (
            <button
              type="button"
              title="Editar equipe"
              className="transition-colors hover:text-[var(--color-brand)]"
              style={{ color: "var(--color-text-secondary)" }}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
            >
              <SquarePen size={17} strokeWidth={1.8} />
            </button>
          )}
          <Link
            href="#"
            title="Ver no 06.score"
            className="transition-colors hover:text-[var(--color-brand)]"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye size={17} strokeWidth={1.8} />
          </Link>
        </div>
      </Link>
    </div>
  );
}