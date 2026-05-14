"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoArbitroModal } from "./novo-arbitro-modal";
import { Plus, SquarePen, Eye } from "lucide-react";

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
        opacity: hovered ? 1 : 0.82,
        transition: "opacity 0.15s ease",
      }}
    >
      <Link href={`/arbitros/${referee.id}`} className="flex items-center gap-6 py-4 pr-4" style={{ textDecoration: "none" }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {referee.photo_url ? (
            <img src={referee.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
              {(referee.surname ?? referee.full_name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", minWidth: "4rem", flexShrink: 0 }}>
          {(referee.surname ?? referee.full_name.split(" ")[0]).toUpperCase()}
        </span>

        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 400, color: "var(--color-text-secondary)", flex: 1 }}>
          {referee.full_name.toUpperCase()}
        </span>

        <div className="flex items-center gap-4 shrink-0" onClick={e => e.preventDefault()}>
          {referee.profile_public && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
              letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20,
              backgroundColor: "rgba(191,242,5,0.1)", color: "#BFF205",
              border: "1px solid rgba(191,242,5,0.2)",
            }}>
              público
            </span>
          )}
          <Link href={`/arbitros/${referee.id}`}
            style={{ color: "var(--color-text-secondary)", transition: "color 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#BFF205")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            onClick={e => e.stopPropagation()}>
            <SquarePen size={16} strokeWidth={1.8} />
          </Link>
          <Link href="#"
            style={{ color: "var(--color-text-secondary)", transition: "color 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#BFF205")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            onClick={e => e.stopPropagation()}>
            <Eye size={16} strokeWidth={1.8} />
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      {/* Header bar com abas */}
      <div style={{
        display: "flex", alignItems: "center", height: 52, flexShrink: 0,
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        paddingLeft: 32, paddingRight: 32, gap: 0,
      }}>
        {/* Abas de função */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}>
          {ROLE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 12px", borderRadius: 8, border: "none",
                backgroundColor: activeTab === tab.id ? "rgba(191,242,5,0.08)" : "transparent",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.12em",
                color: activeTab === tab.id ? "#BFF205" : "rgba(255,255,255,0.3)",
                transition: "color 0.12s",
              }}>
                {tab.label}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                padding: "2px 6px", borderRadius: 10,
                backgroundColor: activeTab === tab.id ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeTab === tab.id ? "#BFF205" : "rgba(255,255,255,0.2)",
                transition: "all 0.12s",
              }}>
                {countByRole[tab.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Botão novo árbitro */}
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
          Novo árbitro
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: "24px 32px" }}>

        {/* Busca + contagem */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar árbitro…"
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            {filtered.length} {filtered.length === 1 ? "árbitro" : "árbitros"}
          </span>
        </div>

        {/* Lista */}
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
              🧑‍⚖️
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              {search ? "Nenhum árbitro encontrado" : "Nenhum árbitro nesta função"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>
              {search ? "Tente outro nome." : "Adicione árbitros usando o botão acima."}
            </p>
          </div>
        ) : (
          <div style={{
            borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "var(--color-surface)",
            overflow: "hidden",
          }}>
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