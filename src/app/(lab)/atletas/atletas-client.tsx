"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { NovoAtletaModal } from "./novo-atleta-modal";
import { Plus, SquarePen, Eye, Users } from "lucide-react";

type TeamInfo = {
  full_name: string;
  abbreviation: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
} | null;

type Athlete = {
  id: string;
  full_name: string;
  surname: string | null;
  gender: string | null;
  photo_url: string | null;
  position_id: string | null;
  birth_date: string | null;
  athlete_team_stints: { team_id: string; is_current: boolean; teams: TeamInfo }[];
};

type Position = { id: string; full_name: string; abbreviation: string };

type GenderTab = "male" | "female";
type SortBy = "name" | "age_asc" | "age_desc" | "position";

function normalizeGender(gender: string | null): "male" | "female" | "other" {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "male";
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "other";
}

function getAgeNumber(birth_date: string | null): number | null {
  if (!birth_date) return null;
  const diff = Date.now() - new Date(birth_date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function getNickname(fullName: string, surname: string | null): string {
  return (surname ?? fullName.split(" ")[0] ?? fullName).toUpperCase();
}

function getInitials(name: string, surname: string | null): string {
  if (surname) return surname.slice(0, 3).toUpperCase();
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getCurrentStint(athlete: Athlete) {
  return athlete.athlete_team_stints?.find(stint => stint.is_current);
}

export default function AtletasClient({
  athletes: initialAthletes,
  positions,
}: {
  athletes: Athlete[];
  positions: Position[];
}) {
  const [athletes] = useState(initialAthletes);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<GenderTab>("male");
  const [teamFilter, setTeamFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [modalOpen, setModalOpen] = useState(false);

  const posMap = useMemo(() => Object.fromEntries(positions.map(p => [p.id, p])), [positions]);

  const teamsForFilter = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    athletes.forEach(athlete => {
      const current = getCurrentStint(athlete);
      if (!current?.team_id || !current.teams) return;
      map.set(current.team_id, {
        id: current.team_id,
        label: current.teams.abbreviation ?? current.teams.full_name,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [athletes]);

  const filtered = useMemo(() => {
    const base = athletes.filter(athlete => {
      const fullSearch = `${athlete.full_name} ${athlete.surname ?? ""}`.toLowerCase();
      const matchSearch = !search || fullSearch.includes(search.toLowerCase());
      const matchGender = normalizeGender(athlete.gender) === activeTab;
      const current = getCurrentStint(athlete);
      const matchTeam = !teamFilter || current?.team_id === teamFilter;
      const matchPosition = !positionFilter || athlete.position_id === positionFilter;
      return matchSearch && matchGender && matchTeam && matchPosition;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "age_asc" || sortBy === "age_desc") {
        const ageA = getAgeNumber(a.birth_date);
        const ageB = getAgeNumber(b.birth_date);
        const fallbackA = ageA ?? (sortBy === "age_asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const fallbackB = ageB ?? (sortBy === "age_asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        return sortBy === "age_asc" ? fallbackA - fallbackB : fallbackB - fallbackA;
      }
      if (sortBy === "position") {
        const posA = posMap[a.position_id ?? ""]?.abbreviation ?? "ZZZ";
        const posB = posMap[b.position_id ?? ""]?.abbreviation ?? "ZZZ";
        return posA.localeCompare(posB);
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, [athletes, activeTab, posMap, positionFilter, search, sortBy, teamFilter]);

  const maleCount = athletes.filter(a => normalizeGender(a.gender) === "male").length;
  const femaleCount = athletes.filter(a => normalizeGender(a.gender) === "female").length;

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-background)",
    color: "var(--color-text-primary)",
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      <div
        className="flex h-14 shrink-0 items-center justify-center border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("male")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "male" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <Users size={16} strokeWidth={2} style={{ color: activeTab === "male" ? "var(--color-brand)" : "#A6A6A6" }} />
            MASCULINO
            <span
              className="font-mono rounded px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: activeTab === "male" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeTab === "male" ? "var(--color-brand)" : "#555",
              }}
            >
              {maleCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("female")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "female" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <Users size={16} strokeWidth={2} style={{ color: activeTab === "female" ? "var(--color-brand)" : "#A6A6A6" }} />
            FEMININO
            <span
              className="font-mono rounded px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: activeTab === "female" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeTab === "female" ? "var(--color-brand)" : "#555",
              }}
            >
              {femaleCount}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} min-w-[220px] flex-1`}
            style={is}
          />
          <div className="flex flex-wrap items-center gap-3">
            <LabSelect value={teamFilter} onChange={setTeamFilter} placeholder="Todas as equipes"
              options={teamsForFilter.map((team) => ({ value: team.id, label: team.label }))} />
            <LabSelect value={positionFilter} onChange={setPositionFilter} placeholder="Todas as posições"
              options={positions.map((position) => ({ value: position.id, label: position.full_name }))} />
            <LabSelect value={sortBy} onChange={(v) => setSortBy(v as SortBy)} options={[
              { value: "name", label: "Ordenar: Nome (A-Z)" },
              { value: "age_asc", label: "Ordenar: Idade (menor para maior)" },
              { value: "age_desc", label: "Ordenar: Idade (maior para menor)" },
              { value: "position", label: "Ordenar: Posição (A-Z)" },
            ]} />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Novo atleta
          </button>
        </div>

        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "atleta" : "atletas"}
        </p>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16 text-center" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Nenhum atleta encontrado." : `Nenhum atleta ${activeTab === "male" ? "masculino" : "feminino"} cadastrado ainda.`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((athlete, idx) => (
              <AthleteRow
                key={athlete.id}
                athlete={athlete}
                isFirst={idx === 0}
                positionAbbr={posMap[athlete.position_id ?? ""]?.abbreviation ?? "—"}
              />
            ))}
          </div>
        )}
      </div>

      <NovoAtletaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultGender={activeTab === "male" ? "male" : "female"} />
    </div>
  );
}

function AthleteRow({ athlete, isFirst, positionAbbr }: { athlete: Athlete; isFirst: boolean; positionAbbr: string }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const currentStint = getCurrentStint(athlete);
  const currentTeam = currentStint?.teams;
  const neonColor = currentTeam?.primary_color ?? "var(--color-brand)";

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
        opacity: hovered ? 1 : 0.45,
        transition: "opacity 0.15s ease",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: hovered ? 0.45 : 0,
          transition: "opacity 0.18s ease",
          background: `radial-gradient(220px circle at ${mousePos.x}px ${mousePos.y}px, ${neonColor}66 0%, transparent 70%)`,
        }}
      />

      <Link href={`/atletas/${athlete.id}`} className="relative z-10 flex items-center gap-6 py-4 pr-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
          {athlete.photo_url ? (
            <img src={athlete.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {getInitials(athlete.full_name, athlete.surname)}
            </span>
          )}
        </div>

        <span className="shrink-0 whitespace-nowrap font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {getNickname(athlete.full_name, athlete.surname)}
        </span>

        <span className="min-w-0 flex-1 font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>
          {athlete.full_name.toUpperCase()}
        </span>

        <div className="ml-auto flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
          <span className="w-10 text-right font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {positionAbbr}
          </span>
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
            {currentTeam?.logo_url ? (
              <img src={currentTeam.logo_url} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <span className="font-mono text-[10px] font-bold" style={{ color: "var(--color-text-secondary)" }}>
                {(currentTeam?.abbreviation ?? currentTeam?.full_name ?? "—").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <Link
            href={`/atletas/${athlete.id}`}
            title="Editar atleta"
            className="transition-colors hover:text-[var(--color-brand)]"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={e => e.stopPropagation()}
          >
            <SquarePen size={17} strokeWidth={1.8} />
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
