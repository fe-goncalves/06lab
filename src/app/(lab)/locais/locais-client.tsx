"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoLocalModal } from "./novo-local-modal";
import { Plus, ChevronRight } from "lucide-react";

type Venue = {
  id: string;
  full_name: string;
  short_name: string | null;
  logo_url: string | null;
  address: string | null;
  display_order: number | null;
};

export default function LocaisClient({ venues: initialVenues }: { venues: Venue[] }) {
  const [venues] = useState(initialVenues);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = venues.filter(v =>
    !search ||
    v.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.short_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>LOCAIS</h1>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo local
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar local..." value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${ic} flex-1 min-w-[200px]`} style={is} />
      </div>

      <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {filtered.length} {filtered.length === 1 ? "local" : "locais"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border py-16"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {search ? "Nenhum local encontrado." : "Nenhum local cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          {filtered.map((venue, idx) => (
            <Link key={venue.id} href={`/locais/${venue.id}`}
              className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                {venue.logo_url ? (
                  <img src={venue.logo_url} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <span className="font-display text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
                    {venue.full_name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="w-24 shrink-0 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {(venue.short_name ?? venue.full_name).toUpperCase().slice(0, 8)}
              </span>

              <span className="flex-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {venue.full_name.toUpperCase()}
              </span>

              <div className="flex items-center gap-4 shrink-0">
                {venue.address && (
                  <span className="font-mono text-xs hidden lg:block" style={{ color: "var(--color-text-secondary)" }}>
                    {venue.address}
                  </span>
                )}
                <ChevronRight size={16} style={{ color: "var(--color-text-secondary)" }} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <NovoLocalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
