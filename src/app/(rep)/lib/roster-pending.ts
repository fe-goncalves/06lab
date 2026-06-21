import type { PendingRosterRequest } from "@/app/(rep)/rep/actions";

export function findPendingRequestForMember(
  outgoing: PendingRosterRequest[],
  opts: {
    teamId: string;
    editionId?: string | null;
    memberType: "athlete" | "staff";
    memberId: string;
  },
): PendingRosterRequest | undefined {
  return outgoing.find(req => {
    if (req.requesting_team_id !== opts.teamId) return false;
    if ((req.edition_id ?? null) !== (opts.editionId ?? null)) return false;
    if (opts.memberType === "athlete") return req.athlete_id === opts.memberId;
    return req.staff_member_id === opts.memberId;
  });
}

export function findPendingRemovalForEditionMember(
  outgoing: PendingRosterRequest[],
  opts: {
    teamId: string;
    editionId: string;
    memberType: "athlete" | "staff";
    athleteId?: string | null;
    staffMemberId?: string | null;
  },
): PendingRosterRequest | undefined {
  const memberId = opts.memberType === "athlete" ? opts.athleteId : opts.staffMemberId;
  if (!memberId) return undefined;
  return outgoing.find(req =>
    req.requesting_team_id === opts.teamId
    && req.edition_id === opts.editionId
    && req.request_type === "removal"
    && (opts.memberType === "athlete"
      ? req.athlete_id === memberId
      : req.staff_member_id === memberId),
  );
}
