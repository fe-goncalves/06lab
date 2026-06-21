"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { UserPlus } from "lucide-react";
import RosterRequestModal from "../../components/roster-request-modal";
import PendingRequestsPanel from "../../components/pending-requests-panel";
import { listarSolicitacoesPendentes, type PendingRosterRequest } from "../../actions";
import {
  MemberAvatar,
  MemberRoleHint,
  RepBackLink,
  RepPageHeading,
  RosterCardHeader,
  RosterMemberRow,
  glassRosterCardStyle,
} from "../../components/rep-roster-ui";
import {
  applyButtonHover,
  clearButtonHover,
  primaryButtonStyle,
  teamShortLabel,
} from "../../components/rep-ui";

export type RosterMember = {
  id: string;
  member_type: "athlete" | "staff";
  display_name: string;
  subtitle: string;
  photo_url: string | null;
};

export default function TeamRosterClient({
  team,
  athletes,
  staff,
  initialOutgoing,
  initialCounterparty,
}: {
  team: {
    id: string;
    full_name: string;
    short_name: string | null;
    abbreviation: string | null;
    logo_url: string | null;
  };
  athletes: RosterMember[];
  staff: RosterMember[];
  initialOutgoing: PendingRosterRequest[];
  initialCounterparty: PendingRosterRequest[];
}) {
  const router = useRouter();
  const [showInclude, setShowInclude] = useState(false);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [counterparty, setCounterparty] = useState(initialCounterparty);

  const refresh = useCallback(async () => {
    const result = await listarSolicitacoesPendentes();
    if (!("error" in result)) {
      setOutgoing(result.outgoing);
      setCounterparty(result.counterparty);
    }
    router.refresh();
  }, [router]);

  const label = teamShortLabel(team);
  const allMembers = [...athletes, ...staff];
  const countLabel = allMembers.length === 1
    ? "1 no elenco"
    : `${allMembers.length} no elenco`;

  return (
    <div style={{ padding: "32px 32px", maxWidth: 760 }}>
      <RepBackLink href="/rep" label="Dashboard" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <RepPageHeading
          title={team.full_name}
          subtitle={`Elenco geral · ${label}`}
          logoUrl={team.logo_url}
          logoFallback={label}
        />
        <button
          type="button"
          onClick={() => setShowInclude(true)}
          style={{ ...primaryButtonStyle, flexShrink: 0 }}
          onMouseEnter={e => applyButtonHover(e)}
          onMouseLeave={e => clearButtonHover(e)}
        >
          <UserPlus size={14} strokeWidth={2.5} />
          Solicitar inclusão
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <PendingRequestsPanel outgoing={outgoing} counterparty={counterparty} onRefresh={refresh} />
      </div>

      <div style={glassRosterCardStyle}>
        <RosterCardHeader
          team={team}
          title="Elenco geral"
          countLabel={countLabel}
        />
        {allMembers.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-faint)", textAlign: "center", padding: "24px 0", margin: 0 }}>
            Nenhum membro no elenco.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {allMembers.map((m, i) => (
              <RosterMemberRow key={`${m.member_type}-${m.id}`} isLast={i === allMembers.length - 1}>
                <MemberAvatar name={m.display_name} photoUrl={m.photo_url} teamAccent />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    {m.display_name}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", margin: "3px 0 0" }}>
                    {m.subtitle}
                    <span style={{ color: "var(--color-text-faint)", margin: "0 6px" }}>·</span>
                    <MemberRoleHint memberType={m.member_type} />
                  </p>
                </div>
              </RosterMemberRow>
            ))}
          </div>
        )}
      </div>

      <RosterRequestModal
        open={showInclude}
        mode="include"
        teamId={team.id}
        pendingRequests={outgoing}
        onClose={() => setShowInclude(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
