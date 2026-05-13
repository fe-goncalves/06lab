"use client";

import Link from "next/link";
import { useState } from "react";
import { NovoMembroModal } from "./novo-membro-modal";
import { Plus, SquarePen, Eye } from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  staff_role_id: string | null;
  gender: string | null;
  staff_team_stints: {
    team_id: string;
    is_current: boolean;
    teams: {
      full_name: string;
      abbreviation: string | null;
      logo_url: string | null;
      primary_color: string | null;
    } | null;
  }[];
};

type Role = { id: string; full_name: string };

const GENDER_TABS = [
  { id: "male",   label: "MASCULINO" },
  { id: "female", label: "FEMININO"  },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, marginTop: 24 }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase" as const,
        color: "#BFF205",
      }}>
        {title}
      </span>
      <div style={{
        flex: 1,
        height: 1,
        background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)",
      }} />
    </div>
  );
}

function MemberRow({ member, roleMap, isFirst }: { member: Member; roleMap: Record<string, string>; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const currentStint = member.staff_team_stints?.find(s => s.is_current);
  const currentTeam  = currentStint?.teams;
  const neonColor    = (currentTeam as any)?.primary_color ?? "#BFF205";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.06)",
        opacity: hovered ? 1 : 0.45,
        transition: "opacity 0.15s ease",
      }}
    >
      {/* Liquid glass hover */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: hovered ? 0.45 : 0,
          transition: "opacity 0.18s ease",
          background: `radial-gradient(220px circle at ${mousePos.x}px ${mousePos.y}px, ${neonColor}66 0%, transparent 70%)`,
        }}
      />

      <Link
        href={`/comissao/${member.id}`}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          textDecoration: "none",
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: `2px solid ${neonColor}44`,
          backgroundColor: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {member.photo_url ? (
            <img src={member.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
            }}>
              {(member.surname ?? member.full_name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Apelido */}
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          minWidth: "5rem",
          flexShrink: 0,
        }}>
          {(member.surname ?? member.full_name.split(" ")[0]).toUpperCase()}
        </span>

        {/* Nome completo */}
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          flex: 1,
        }}>
          {member.full_name.toUpperCase()}
        </span>

        {/* Logo da equipe atual */}
        {currentTeam && (
          <div style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "50%",
            border: `1px solid ${neonColor}33`,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}>
            {(currentTeam as any).logo_url ? (
              <img src={(currentTeam as any).logo_url} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
            ) : (
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.3)",
              }}>
                {(currentTeam.abbreviation ?? currentTeam.full_name ?? "—").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Ações */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}
          onClick={e => e.preventDefault()}
        >
          <Link
            href={`/comissao/${member.id}`}
            style={{ color: "rgba(255,255,255,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            <SquarePen size={16} strokeWidth={1.8} />
          </Link>
          <Link
            href="#"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            <Eye size={16} strokeWidth={1.8} />
          </Link>
        </div>
      </Link>
    </div>
  );
}

export default function ComissaoClient({
  members: initialMembers,
  roles,
}: {
  members: Member[];
  roles: Role[];
}) {
  const [activeTab, setActiveTab] = useState<string>("male");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.full_name]));

  const filtered = initialMembers.filter(m => {
    const matchGender = m.gender === activeTab;
    const name = `${m.full_name} ${m.surname ?? ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    return matchGender && matchSearch;
  });

  // Agrupa por função
  const groups: { role: Role; members: Member[] }[] = roles
    .map(role => ({
      role,
      members: filtered.filter(m => m.staff_role_id === role.id),
    }))
    .filter(g => g.members.length > 0);

  // Sem função definida
  const noRole = filtered.filter(m => !m.staff_role_id);

  const countByGender = Object.fromEntries(
    GENDER_TABS.map(tab => [
      tab.id,
      initialMembers.filter(m => m.gender === tab.id).length,
    ])
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      {/* Header bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        height: 56,
        flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "var(--color-surface)",
        padding: "0 32px",
      }}>
        {/* Abas de gênero */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", gap: 32 }}>
          {GENDER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: activeTab === tab.id ? "#BFF205" : "#555",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 4px",
                transition: "color 0.15s",
              }}
            >
              {tab.label}
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 20,
                backgroundColor: activeTab === tab.id ? "rgba(191,242,5,0.12)" : "rgba(255,255,255,0.05)",
                color: activeTab === tab.id ? "#BFF205" : "rgba(255,255,255,0.2)",
              }}>
                {countByGender[tab.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Botão novo membro */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#BFF205",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 9,
            padding: "8px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Novo membro
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: "24px 32px 64px" }}>

        {/* Busca */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar membro…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 360,
              padding: "9px 12px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 9,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 0",
            textAlign: "center",
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              fontSize: 22,
            }}>
              👤
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Nenhum membro encontrado
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
              {search ? "Tente outro termo de busca." : "Nenhum membro cadastrado nesta categoria."}
            </p>
          </div>
        ) : (
          <div>
            {/* Grupos por função */}
            {groups.map(({ role, members }) => (
              <div key={role.id}>
                <SectionHeader title={role.full_name} />
                <div style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "var(--color-surface)",
                }}>
                  {members.map((m, idx) => (
                    <MemberRow key={m.id} member={m} roleMap={roleMap} isFirst={idx === 0} />
                  ))}
                </div>
              </div>
            ))}

            {/* Sem função */}
            {noRole.length > 0 && (
              <div>
                <SectionHeader title="SEM FUNÇÃO" />
                <div style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "var(--color-surface)",
                  padding: "0 20px",
                }}>
                  {noRole.map((m, idx) => (
                    <MemberRow key={m.id} member={m} roleMap={roleMap} isFirst={idx === 0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NovoMembroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultGender={activeTab}
      />
    </div>
  );
}