const TECHNICAL_HINTS = [
  "error:",
  "violates",
  "constraint",
  "null value",
  "invalid input",
  "jwt expired",
  "token expired",
  "permission denied",
  "row-level security",
  "duplicate key",
  "foreign key",
  "not-null",
  "pgrst",
] as const;

function looksTechnical(message: string): boolean {
  const lower = message.toLowerCase();
  return TECHNICAL_HINTS.some((hint) => lower.includes(hint));
}

export function parseSupabaseError(error: string): string {
  if (!error?.trim()) {
    return "Ocorreu um erro inesperado. Tente novamente.";
  }

  const lower = error.toLowerCase();

  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "Já existe um registro com essas informações.";
  }
  if (lower.includes("foreign key") || lower.includes("violates foreign key")) {
    return "Este item está sendo usado e não pode ser removido.";
  }
  if (lower.includes("null value") || lower.includes("not-null constraint")) {
    return "Preencha todos os campos obrigatórios.";
  }
  if (lower.includes("jwt expired") || lower.includes("token expired")) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (lower.includes("permission denied") || lower.includes("row-level security")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (lower.includes("invalid input")) {
    return "Valor inválido. Verifique os dados informados.";
  }

  if (looksTechnical(error)) {
    return "Ocorreu um erro inesperado. Tente novamente.";
  }

  return error;
}
