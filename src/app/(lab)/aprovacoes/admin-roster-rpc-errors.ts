const ADMIN_RPC_ERROR_MESSAGES: Record<string, string> = {
  team_not_registered_in_edition: "A equipe não está inscrita nesta competição.",
  cross_organization_denied: "Erro de permissão.",
};

export function mapAdminRosterRpcError(error: { message?: string } | null): string {
  if (!error?.message) return "Erro desconhecido ao processar solicitação.";

  const msg = error.message;
  for (const [code, friendly] of Object.entries(ADMIN_RPC_ERROR_MESSAGES)) {
    if (msg.includes(code)) return friendly;
  }

  return msg;
}

export const REP_REQUEST_TYPE_LABELS: Record<string, string> = {
  new_member: "Novo Atleta",
  new_athlete: "Novo Atleta",
  add_existing: "Inclusão",
  existing_athlete: "Inclusão",
  transfer: "Transferência",
  removal: "Remoção",
};

export function repRequestTypeLabel(requestType: string, memberType: string): string {
  if (requestType === "new_member" || requestType === "new_athlete") {
    return memberType === "staff" ? "Novo Membro" : "Novo Atleta";
  }
  if (requestType === "add_existing" || requestType === "existing_athlete") return "Inclusão";
  if (requestType === "removal") return "Remoção";
  if (requestType === "transfer") return "Transferência";
  return REP_REQUEST_TYPE_LABELS[requestType] ?? requestType;
}

export type DraftMemberData = {
  full_name: string;
  surname?: string | null;
  nationality?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  position_id?: string | null;
  staff_role_id?: string | null;
};

export type RepRosterRequest = {
  id: string;
  requestType: string;
  memberType: string;
  createdAt: string;
  repName: string;
  requestingTeamName: string;
  requestingTeamAbbr: string | null;
  typeLabel: string;
  personName: string;
  personPhoto: string | null;
  personSubtitle: string | null;
  contextLabel: string;
  requiresCounterparty: boolean;
  counterpartyApproved: boolean;
  draftData: DraftMemberData | null;
  athleteId: string | null;
  staffMemberId: string | null;
  editionId: string | null;
  sourceTeamName: string | null;
};
