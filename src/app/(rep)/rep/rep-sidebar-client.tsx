"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { RepOrgInfo } from "@/app/(rep)/lib/rep-auth";
import type { RepNavTeam } from "@/app/(rep)/lib/rep-teams";
import { transitionFast } from "./components/rep-ui";

type Props = {
  orgInfo: RepOrgInfo;
  repName: string;
  teams: RepNavTeam[];
};

function teamNavLabel(team: RepNavTeam): string {
  return team.short_name?.trim() || team.abbreviation?.toUpperCase() || team.full_name;
}

export default function RepSidebarClient({ orgInfo, repName, teams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const displayName = orgInfo.short_name ?? orgInfo.name;
  const initials = displayName.slice(0, 2).toUpperCase();
  const isDashboard = pathname === "/rep";

  useEffect(() => {
    const match = pathname.match(/^\/rep\/equipes\/([^/]+)/);
    if (match?.[1]) {
      setExpandedTeams(prev => new Set(prev).add(match[1]));
    }
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleTeam(teamId: string) {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  return (
    <aside
      className="flex h-screen w-56 shrink-0 flex-col border-r"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="border-b px-4 py-5" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
            style={{ borderColor: "rgba(191,242,5,0.3)", backgroundColor: "var(--color-input-bg)" }}
          >
            {orgInfo.logo_url ? (
              <img src={orgInfo.logo_url} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <span className="font-mono text-xs font-bold" style={{ color: "var(--color-text-ghost)" }}>
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="truncate font-mono text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-primary)" }}
            >
              {displayName}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
              Representante
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/rep"
          className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider"
          style={{
            color: isDashboard ? "var(--color-brand)" : "var(--color-text-muted)",
            backgroundColor: isDashboard ? "rgba(191,242,5,0.08)" : "transparent",
            textDecoration: "none",
            transition: transitionFast,
          }}
        >
          <LayoutDashboard size={15} strokeWidth={2.5} />
          Dashboard
        </Link>

        {teams.length > 0 && (
          <p
            className="mb-2 px-3 font-mono text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-faint)" }}
          >
            Equipes
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {teams.map(team => {
            const rosterPath = `/rep/equipes/${team.id}`;
            const isTeamActive = pathname === rosterPath || pathname.startsWith(`${rosterPath}/`);
            const expanded = expandedTeams.has(team.id);
            const label = teamNavLabel(team);

            return (
              <div key={team.id}>
                <div style={{ display: "flex", alignItems: "stretch", gap: 2 }}>
                  <Link
                    href={rosterPath}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      color: isTeamActive ? "var(--color-brand)" : "var(--color-text-secondary)",
                      backgroundColor: isTeamActive ? "rgba(191,242,5,0.06)" : "transparent",
                      textDecoration: "none",
                      transition: transitionFast,
                    }}
                  >
                    <Users size={13} strokeWidth={2.25} />
                    <span className="truncate">{label}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    aria-label={expanded ? "Recolher menu" : "Expandir menu"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        borderRadius: 8,
                        border: "1px solid var(--color-input-border)",
                        backgroundColor: "transparent",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        transition: transitionFast,
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDown
                        size={14}
                        style={{
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: transitionFast,
                        }}
                      />
                    </button>
                </div>

                {expanded && (
                  <div style={{ marginLeft: 10, marginTop: 4, paddingLeft: 10, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                    <Link
                      href={rosterPath}
                      className="block rounded-md px-2 py-1.5 font-mono text-[10px] font-semibold"
                      style={{
                        color: pathname === rosterPath ? "var(--color-brand)" : "var(--color-text-muted)",
                        textDecoration: "none",
                        transition: transitionFast,
                      }}
                    >
                      Elenco geral
                    </Link>
                    {team.editions.map(ed => {
                      const edPath = `/rep/equipes/${team.id}/edicoes/${ed.editionId}`;
                      const isEdActive = pathname === edPath;
                      return (
                        <Link
                          key={ed.editionId}
                          href={edPath}
                          className="block truncate rounded-md px-2 py-1.5 font-mono text-[10px]"
                          style={{
                            color: isEdActive ? "var(--color-brand)" : "var(--color-text-faint)",
                            fontWeight: isEdActive ? 700 : 500,
                            textDecoration: "none",
                            transition: transitionFast,
                          }}
                          title={`${ed.competitionName} · ${ed.seasonName}`}
                        >
                          {ed.competitionName}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t px-4 py-4" style={{ borderColor: "var(--color-border)" }}>
        <p
          className="mb-3 truncate font-mono text-[11px] font-semibold"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {repName}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-input-border)",
            transition: transitionFast,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <LogOut size={14} strokeWidth={2} />
          Sair
        </button>
      </div>
    </aside>
  );
}
