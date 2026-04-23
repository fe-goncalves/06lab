"use client";

import Link from "next/link";
import { useState } from "react";
import { NovaCompeticaoModal } from "./nova-competicao-modal";
import { Plus, SquarePen, Eye, Trophy, Settings } from "lucide-react";

type Competition = {
  id: string;
  full_name: string;
  short_name: string | null;
  gender: string | null;
  logo_url: string | null;
  pinned_in_sidebar: boolean;
};

function normalizeGender(gender: string | null): "male" | "female" | "other" {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "male";
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "other";
}

export default function CompeticoesClient({ competitions: initialCompetitions }: { competitions: Competition[] }) {
  const [competitions] = useState(initialCompetitions);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"male" | "female">("male");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = competitions.filter(c => {
    const matchSearch = !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.short_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGender = normalizeGender(c.gender) === activeTab;
    return matchSearch && matchGender;
  });

  const maleCount = competitions.filter(c => normalizeGender(c.gender) === "male").length;
  const femaleCount = competitions.filter(c => normalizeGender(c.gender) === "female").length;

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
            style={{ color: activeTab === "male" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <Trophy size={16} strokeWidth={2} style={{ color: activeTab === "male" ? "var(--color-brand)" : "#A6A6A6" }} />
            MASCULINO
            <span className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeTab === "male" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeTab === "male" ? "var(--color-brand)" : "#555",
              }}>
              {maleCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("female")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "female" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <Trophy size={16} strokeWidth={2} style={{ color: activeTab === "female" ? "var(--color-brand)" : "#A6A6A6" }} />
            FEMININO
            <span className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeTab === "female" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeTab === "female" ? "var(--color-brand)" : "#555",
              }}>
              {femaleCount}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nova competição
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar competição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} w-full max-w-md`}
            style={is}
          />
        </div>

        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "competição" : "competições"}
        </p>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16 text-center"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search
                ? "Nenhuma competição encontrada."
                : `Nenhuma competição ${activeTab === "male" ? "masculina" : "feminina"} cadastrada ainda.`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((competition, idx) => (
              <CompetitionRow key={competition.id} competition={competition} isFirst={idx === 0} />
            ))}
          </div>
        )}
      </div>

      <NovaCompeticaoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function CompetitionRow({ competition, isFirst }: { competition: Competition; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: isFirst ? "none" : "1px solid var(--color-border)",
        opacity: hovered ? 1 : 0.45,
        transition: "opacity 0.15s ease",
      }}
    >
      <Link
        href={`/competicoes/${competition.id}`}
        className="flex items-center gap-6 py-4 pr-4"
      >
        {/* Logo */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {competition.logo_url ? (
            <img src={competition.logo_url} alt="" className="h-10 w-10 object-contain" />
          ) : (
            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {competition.full_name.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nome curto */}
        <span className="w-20 shrink-0 font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {(competition.short_name ?? competition.full_name).toUpperCase().slice(0, 8)}
        </span>

        {/* Nome completo */}
        <span className="flex-1 font-mono text-sm font-normal" style={{ color: "var(--color-text-primary)" }}>
          {competition.full_name.toUpperCase()}
        </span>

        {/* Badges e ações */}
        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
          {competition.pinned_in_sidebar && (
            <span className="font-mono text-xs rounded px-2 py-0.5"
              style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
              fixada
            </span>
          )}
          <Link
            href={`/competicoes/${competition.id}/configuracoes`}
            title="Configurações da competição"
            className="transition-colors hover:text-[var(--color-brand)]"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={e => e.stopPropagation()}
          >
            <Settings size={17} strokeWidth={1.8} />
          </Link>
          <Link
            href="#"
            title="Ver no 06.score"
            className="transition-colors hover:text-[var(--color-brand)]"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={e => e.stopPropagation()}
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