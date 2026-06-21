const RPC_ERROR_MESSAGES: Record<string, string> = {
  roster_limit_reached: "Limite de inscrições desta competição já foi atingido.",
  team_not_registered_in_edition: "Esta equipe ainda não está inscrita nesta competição. Contate o administrador.",
  not_authorized_for_team: "Você não tem permissão para esta equipe.",
};

export function mapRosterRpcError(error: { message?: string; code?: string } | null): string {
  if (!error) return "Erro desconhecido ao processar solicitação.";

  const msg = error.message ?? "";
  for (const [code, friendly] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (msg.includes(code)) return friendly;
  }

  return msg || "Erro ao processar solicitação.";
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  new_member: "Novo membro",
  new_athlete: "Novo membro",
  add_existing: "Inclusão",
  existing_athlete: "Inclusão",
  removal: "Remoção",
  transfer: "Transferência",
};
