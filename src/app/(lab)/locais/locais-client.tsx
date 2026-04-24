"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoLocalModal } from "./novo-local-modal";
import { Plus, SquarePen, Eye } from "lucide-react";

type Venue = {
  id: string;
  full_name: string;
  short_name: string | null;
  logo_url: string | null;
  address: string | null;
  display_order: number | null;
};

function VenueRow({ venue, isFirst }: { venue: Venue; isFirst: boolean }) {
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
      <Link href={`/locais/${venue.id}`} className="flex items-center gap-6 py-4 pr-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
          {venue.logo_url ? (
            <img src={venue.logo_url} alt="" className="h-9 w-9 object-contain" />
          ) : (
            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {(venue.short_name ?? venue.full_name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <span className="min-w-[4rem] shrink-0 font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          {(venue.short_name ?? venue.full_name).toUpperCase()}
        </span>

        <span className="flex-1 font-mono text-sm font-normal" style={{ color: "var(--color-text-primary)" }}>
          {venue.full_name.toUpperCase()}
        </span>

        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
          {venue.address && (
            <span className="font-mono text-xs hidden lg:block" style={{ color: "var(--color-text-secondary)" }}>
              {venue.address}
            </span>
          )}
          <Link href={`/locais/${venue.id}`}
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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} {filtered.length === 1 ? "local" : "locais"}
        </p>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          <Plus size={15} strokeWidth={2.5} />
          Novo local
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <input type="text" placeholder="Buscar local…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${ic} w-full max-w-md`} style={is} />
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border py-16"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Nenhum local encontrado." : "Nenhum local cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((venue, idx) => (
              <VenueRow key={venue.id} venue={venue} isFirst={idx === 0} />
            ))}
          </div>
        )}
      </div>

      <NovoLocalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}