"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoArbitroModal } from "./novo-arbitro-modal";
import { Plus, ChevronRight } from "lucide-react";

type Referee = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  profile_public: boolean;
  birth_date: string | null;
};

function getAge(birth_date: string | null): string {
  if (!birth_date) return "—";
  const diff = Date.now() - new Date(birth_date).getTime();
  return String(Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
}

export default function ArbitrosClient({ referees: initialReferees }: { referees: Referee[] }) {
  const [referees] = useState(initialReferees);
  const [search, setSearch] = useState("");
  const [publicFilter, setPublicFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = referees.filter(r => {
    const name = `${r.full_name} ${r.surname ?? ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchPublic = !publicFilter ||
      (publicFilter === "public" && r.profile_public) ||
      (publicFilter === "private" && !r.profile_public);
    return matchSearch && matchPublic;
  });

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>ÁRBITROS</h1>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo árbitro
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar árbitro..." value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${ic} flex-1 min-w-[200px]`} style={is} />
        <select value={publicFilter} onChange={e => setPublicFilter(e.target.value)} className={ic} style={is}>
          <option value="">Todos</option>
          <option value="public">Perfil público</option>
          <option value="private">Perfil privado</option>
        </select>
      </div>

      <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {filtered.length} {filtered.length === 1 ? "árbitro" : "árbitros"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border py-16"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {search ? "Nenhum árbitro encontrado." : "Nenhum árbitro cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          {filtered.map((ref, idx) => (
            <Link key={ref.id} href={`/arbitros/${ref.id}`}
              className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border overflow-hidden"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                {ref.photo_url ? (
                  <img src={ref.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
                    {(ref.surname ?? ref.full_name).slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="w-24 shrink-0 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {(ref.surname ?? ref.full_name.split(" ")[0]).toUpperCase()}
              </span>

              <span className="flex-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {ref.full_name.toUpperCase()}
              </span>

              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {getAge(ref.birth_date)} anos
                </span>
                <span className="font-mono text-xs rounded px-2 py-0.5"
                  style={{
                    backgroundColor: ref.profile_public ? "rgba(191,242,5,0.15)" : "var(--color-border)",
                    color: ref.profile_public ? "var(--color-brand)" : "var(--color-text-secondary)",
                  }}>
                  {ref.profile_public ? "Público" : "Privado"}
                </span>
                <ChevronRight size={16} style={{ color: "var(--color-text-secondary)" }} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <NovoArbitroModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
