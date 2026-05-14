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
        opacity: hovered ? 1 : 0.82,
        transition: "opacity 0.15s ease",
      }}
    >
      <Link
        href={`/locais/${venue.id}`}
        className="flex items-center gap-6 py-4 pr-4"
        style={{ textDecoration: "none" }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {venue.logo_url ? (
            <img src={venue.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
              {(venue.short_name ?? venue.full_name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
          color: "var(--color-text-primary)", minWidth: "4rem", flexShrink: 0,
        }}>
          {(venue.short_name ?? venue.full_name).toUpperCase()}
        </span>

        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 400,
          color: "var(--color-text-secondary)", flex: 1,
        }}>
          {venue.full_name.toUpperCase()}
        </span>

        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
          {venue.address && (
            <span
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)" }}
              className="hidden lg:block"
            >
              {venue.address}
            </span>
          )}
          <Link
            href={`/locais/${venue.id}`}
            style={{ color: "var(--color-text-secondary)", transition: "color 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#BFF205")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            onClick={e => e.stopPropagation()}
          >
            <SquarePen size={16} strokeWidth={1.8} />
          </Link>
          <Link
            href="#"
            style={{ color: "var(--color-text-secondary)", transition: "color 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#BFF205")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            onClick={e => e.stopPropagation()}
          >
            <Eye size={16} strokeWidth={1.8} />
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      <div style={{
        display: "flex", alignItems: "center", height: 52, flexShrink: 0,
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        paddingLeft: 32, paddingRight: 32,
        justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          {filtered.length} {filtered.length === 1 ? "local" : "locais"}
        </span>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 14px", borderRadius: 9, border: "none",
            backgroundColor: "#BFF205", color: "#0a0a0a",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", transition: "opacity 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={13} strokeWidth={2.5} />
          Novo local
        </button>
      </div>

      <div style={{ flex: 1, padding: "24px 32px" }}>
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar local…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 12,
              padding: "8px 14px", borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
              outline: "none", width: 280,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#BFF205")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "80px 0", textAlign: "center",
            borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "var(--color-surface)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14, fontSize: 20,
            }}>
              🏟️
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              {search ? "Nenhum local encontrado" : "Nenhum local cadastrado"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>
              {search ? "Tente outro nome." : "Adicione locais usando o botão acima."}
            </p>
          </div>
        ) : (
          <div style={{
            borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "var(--color-surface)", overflow: "hidden",
          }}>
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