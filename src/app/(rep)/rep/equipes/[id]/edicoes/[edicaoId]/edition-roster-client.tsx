"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { UserPlus } from "lucide-react";
import { findPendingRemovalForEditionMember } from "@/app/(rep)/lib/roster-pending";
import RosterRequestModal from "../../../../components/roster-request-modal";
import PendingRequestsPanel from "../../../../components/pending-requests-panel";
import { listarSolicitacoesPendentes, type PendingRosterRequest } from "../../../../actions";
import {
  MemberAvatar,
  MemberRoleHint,
  RepBackLink,
  RepPageHeading,
  RosterCardHeader,
  RosterMemberRow,
  RosterRemoveButton,
  glassRosterCardStyle,
} from "../../../../components/rep-roster-ui";
import { SubmittedRequestCard } from "../../../../components/rep-ui";
import {
  applyButtonHover,
  clearButtonHover,
  primaryButtonStyle,
  teamShortLabel,
} from "../../../../components/rep-ui";

export type EditionRosterMember = {
  rosterEntryId: string;
  member_type: "athlete" | "staff";
  display_name: string;
  subtitle: string;
  photo_url: string | null;
  athlete_id: string | null;
  staff_member_id: string | null;
};

export default function EditionRosterClient({
  team,
  edition,
  roster,
  athleteCount,
  maxAthletes,
  limitReached,
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
  edition: {
    id: string;
    competitionName: string;
    seasonName: string;
    competitionLogoUrl: string | null;
  };
  roster: EditionRosterMember[];
  athleteCount: number;
  maxAthletes: number | null;
  limitReached: boolean;
  initialOutgoing: PendingRosterRequest[];
  initialCounterparty: PendingRosterRequest[];
}) {
  const router = useRouter();
  const [showInclude, setShowInclude] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<EditionRosterMember | null>(null);
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
  const countLabel = maxAthletes != null
    ? `${athleteCount} / ${maxAthletes} inscritos`
    : `${roster.length} ${roster.length === 1 ? "inscrito" : "inscritos"}`;

  return (
    <div style={{ padding: "32px 32px", maxWidth: 760 }}>
      <RepBackLink
        href={`/rep/equipes/${team.id}`}
        label={team.full_name}
        logoUrl={team.logo_url}
        teamLabel={label}
        showLogo
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <RepPageHeading
          title={edition.competitionName}
          subtitle={`${edition.seasonName} · ${label}`}
          logoUrl={edition.competitionLogoUrl}
          logoFallback={edition.competitionName}
        />
        <button
          type="button"
          disabled={limitReached}
          onClick={() => setShowInclude(true)}
          title={limitReached ? "Limite de inscrições atingido" : undefined}
          style={{
            ...primaryButtonStyle,
            flexShrink: 0,
            backgroundColor: limitReached ? "var(--color-brand-muted-bg)" : "var(--color-brand)",
            color: limitReached ? "var(--color-text-muted)" : "#0a0a0a",
            cursor: limitReached ? "not-allowed" : "pointer",
          }}
          onMouseEnter={e => applyButtonHover(e, limitReached)}
          onMouseLeave={e => clearButtonHover(e, limitReached)}
        >
          <UserPlus size={14} strokeWidth={2.5} />
          Solicitar inscrição
        </button>
      </div>

      {limitReached && (
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "#F2C005",
          margin: "0 0 20px",
        }}>
          Limite de atletas inscritos atingido nesta competição.
        </p>
      )}

      <div style={{ marginBottom: 24 }}>
        <PendingRequestsPanel outgoing={outgoing} counterparty={counterparty} onRefresh={refresh} />
      </div>

      <div style={glassRosterCardStyle}>
        <RosterCardHeader
          team={team}
          title="Elenco inscrito"
          countLabel={countLabel}
          progress={maxAthletes != null ? { current: athleteCount, max: maxAthletes } : undefined}
        />
        {roster.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-faint)", textAlign: "center", padding: "24px 0", margin: 0 }}>
            Nenhum membro inscrito nesta competição.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {roster.map((m, i) => {
              const pendingRemoval = findPendingRemovalForEditionMember(outgoing, {
                teamId: team.id,
                editionId: edition.id,
                memberType: m.member_type,
                athleteId: m.athlete_id,
                staffMemberId: m.staff_member_id,
              });

              return (
                <RosterMemberRow key={m.rosterEntryId} isLast={i === roster.length - 1}>
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
                  {pendingRemoval ? (
                    <SubmittedRequestCard createdAt={pendingRemoval.created_at} compact />
                  ) : (
                    <RosterRemoveButton
                      onClick={() => setRemoveTarget(m)}
                      active={removeTarget?.rosterEntryId === m.rosterEntryId}
                    />
                  )}
                </RosterMemberRow>
              );
            })}
          </div>
        )}
      </div>

      <RosterRequestModal
        open={showInclude}
        mode="include"
        teamId={team.id}
        editionId={edition.id}
        pendingRequests={outgoing}
        onClose={() => setShowInclude(false)}
        onSuccess={refresh}
      />

      <RosterRequestModal
        open={!!removeTarget}
        mode="remove"
        teamId={team.id}
        editionId={edition.id}
        pendingRequests={outgoing}
        removeTarget={removeTarget ? {
          memberType: removeTarget.member_type,
          athleteId: removeTarget.athlete_id,
          staffMemberId: removeTarget.staff_member_id,
          displayName: removeTarget.display_name,
        } : null}
        onClose={() => setRemoveTarget(null)}
        onSuccess={refresh}
      />
    </div>
  );
}
