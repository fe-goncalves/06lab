"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import type { RepNavTeam } from "@/app/(rep)/lib/rep-teams";
import PendingRequestsPanel from "./components/pending-requests-panel";
import { listarSolicitacoesPendentes, type PendingRosterRequest } from "./actions";
import {
  SectionHeader,
  applyButtonHover,
  applyCardHover,
  clearButtonHover,
  clearCardHover,
  glassCardStyle,
  primaryButtonStyle,
  teamCardTitle,
  teamShortLabel,
  transitionFast,
} from "./components/rep-ui";
import { logoPlaceholderStyle } from "@/lib/lab-ui-styles";

export default function RepDashboardClient({
  repName,
  teams,
  initialOutgoing,
  initialCounterparty,
}: {
  repName: string;
  teams: RepNavTeam[];
  initialOutgoing: PendingRosterRequest[];
  initialCounterparty: PendingRosterRequest[];
}) {
  const router = useRouter();
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [counterparty, setCounterparty] = useState(initialCounterparty);

  const refreshRequests = useCallback(async () => {
    const result = await listarSolicitacoesPendentes();
    if (!("error" in result)) {
      setOutgoing(result.outgoing);
      setCounterparty(result.counterparty);
    }
    router.refresh();
  }, [router]);

  return (
    <div style={{ padding: "32px 32px", maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900,
          color: "var(--color-text-primary)", margin: 0,
        }}>
          Olá, {repName.split(" ")[0]}
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-muted)", margin: "6px 0 0" }}>
          Gerencie elencos e inscrições das suas equipes.
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <PendingRequestsPanel
          outgoing={outgoing}
          counterparty={counterparty}
          onRefresh={refreshRequests}
        />
      </div>

      <SectionHeader title="Suas equipes" />

      {teams.length === 0 ? (
        <div style={{ ...glassCardStyle, textAlign: "center", padding: "40px 20px" }}>
          <Users size={32} color="var(--color-input-border-strong)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>
            Nenhuma equipe atribuída ao seu perfil.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {teams.map(team => {
            const badge = teamShortLabel(team);
            const title = teamCardTitle(team);
            return (
              <div
                key={team.id}
                style={glassCardStyle}
                onMouseEnter={applyCardHover}
                onMouseLeave={clearCardHover}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: team.editions.length > 0 ? 16 : 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    border: "1px solid var(--color-input-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", backgroundColor: "rgba(255,255,255,0.03)",
                  }}>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: "var(--color-brand)" }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
                      {title}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                      {team.full_name}
                    </p>
                  </div>
                  <Link
                    href={`/rep/equipes/${team.id}`}
                    style={{ ...primaryButtonStyle, textDecoration: "none" }}
                    onMouseEnter={e => applyButtonHover(e)}
                    onMouseLeave={e => clearButtonHover(e)}
                  >
                    Elenco geral
                    <ChevronRight size={14} />
                  </Link>
                </div>

                {team.editions.length > 0 && (
                  <div style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: 14,
                  }}>
                    <p style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: "var(--color-text-faint)", margin: "0 0 10px",
                    }}>
                      Competições inscritas
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {team.editions.map(ed => (
                        <Link
                          key={ed.editionId}
                          href={`/rep/equipes/${team.id}/edicoes/${ed.editionId}`}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", borderRadius: 8, textDecoration: "none",
                            border: "1px solid var(--color-input-border)",
                            backgroundColor: "rgba(255,255,255,0.02)",
                            transition: transitionFast,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "rgba(191,242,5,0.25)";
                            e.currentTarget.style.backgroundColor = "rgba(191,242,5,0.04)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--color-input-border)";
                            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                          }}
                        >
                          {ed.competitionLogoUrl ? (
                            <img
                              src={ed.competitionLogoUrl}
                              alt=""
                              style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ ...logoPlaceholderStyle, width: 22, height: 22 }} />
                          )}
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", flex: 1, minWidth: 0 }}>
                            {ed.competitionName}
                            <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}> · {ed.seasonName}</span>
                          </span>
                          <ChevronRight size={14} color="var(--color-text-muted)" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
