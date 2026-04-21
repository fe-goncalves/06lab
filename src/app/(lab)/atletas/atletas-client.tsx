"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoAtletaModal } from "./novo-atleta-modal";
import { Plus, ChevronRight } from "lucide-react";

type Athlete = {
  id: string;
  full_name: string;
  surname: string | null;
  gender: string | null;
  photo_url: string | null;
  position_id: string | null;
  birth_date: string | null;
  athlete_team_stints: { team_id: string; is_current: boolean; teams: { full_name: string; abbreviation: string | null } | null }[];
};

type Position = { id: string; full_name: string; abbreviation: string };

function getAge(birth_date: string | null): string {
  if (!birth_date) return "—";
  const diff = Date.now() - new Date(birth_date).getTime();
  return String(Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
}

function getInitials(name: string, surname: string | null): string {
  if (surname) return surname.slice(0, 3).toUpperCase();
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
  const [positionFilter, setPositionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const posMap = Object.fromEntries(positions.map(p => [p.id, p]));

  const filtered = athletes.filter(a => {
    const name = `${a.full_name} ${a.surname ?? ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchPos = !positionFilter || a.position_id === positionFilter;
    const matchGender = !genderFilter || (a.gender ?? "").toLowerCase().startsWith(genderFilter);
    return matchSearch && matchPos && matchGender;
  });

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>ATLETAS</h1>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo atleta
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar atleta..." value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${ic} flex-1 min-w-[200px]`} style={is} />
        <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)} className={ic} style={is}>
          <option value="">Todas as posições</option>
          {positions.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className={ic} style={is}>
          <option value="">Todos os gêneros</option>
          <option value="m">Masculino</option>
          <option value="f">Feminino</option>
        </select>
      </div>

      <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {filtered.length} {filtered.length === 1 ? "atleta" : "atletas"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border py-16"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {search ? "Nenhum atleta encontrado." : "Nenhum atleta cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          {filtered.map((athlete, idx) => {
            const currentStint = athlete.athlete_team_stints?.find(s => s.is_current);
            const pos = posMap[athlete.position_id ?? ""];
            return (
              <Link key={athlete.id} href={`/atletas/${athlete.id}`}
                className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                {/* Foto */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border overflow-hidden"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  {athlete.photo_url ? (
                    <img src={athlete.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
                      {getInitials(athlete.full_name, athlete.surname)}
                    </span>
                  )}
                </div>

                {/* Apelido/iniciais */}
                <span className="w-20 shrink-0 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {(athlete.surname ?? athlete.full_name.split(" ")[0]).toUpperCase()}
                </span>

                {/* Nome completo */}
                <span className="flex-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {athlete.full_name.toUpperCase()}
                </span>

                {/* Infos */}
                <div className="flex items-center gap-4 shrink-0">
                  {pos && (
                    <span className="font-mono text-xs rounded px-2 py-0.5"
                      style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {pos.abbreviation}
                    </span>
                  )}
                  {currentStint?.teams && (
                    <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {currentStint.teams.abbreviation ?? currentStint.teams.full_name}
                    </span>
                  )}
                  <span className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {getAge(athlete.birth_date)} anos
                  </span>
                  <ChevronRight size={16} style={{ color: "var(--color-text-secondary)" }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <NovoAtletaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
