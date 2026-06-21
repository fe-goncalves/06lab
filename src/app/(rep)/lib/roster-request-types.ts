/** Valores aceitos pelo check constraint roster_requests_request_type_check no banco. */
export type DbRequestType = "new_athlete" | "existing_athlete" | "removal";

/** Tipos usados na UI / lógica da aplicação antes do mapeamento. */
export type AppRequestType = "new_member" | "add_existing" | "removal";

export function toDbRequestType(appType: AppRequestType): DbRequestType {
  switch (appType) {
    case "new_member":
      return "new_athlete";
    case "add_existing":
      return "existing_athlete";
    case "removal":
      return "removal";
  }
}

export function isNewMemberRequestType(type: string): boolean {
  return type === "new_member" || type === "new_athlete";
}

export function requestTypeLabel(type: string, memberType: string): string {
  if (isNewMemberRequestType(type)) {
    return memberType === "staff" ? "Novo Membro" : "Novo Atleta";
  }
  if (type === "add_existing" || type === "existing_athlete") return "Inclusão";
  if (type === "removal") return "Remoção";
  if (type === "transfer") return "Transferência";
  return type;
}
