export const ORG_GESTAO_HREF = "/organizacao?tab=gestao";

export const ORG_GESTAO_PATHS = [
  "/temporadas",
  "/categorias",
  "/representantes",
  "/aprovacoes",
  "/suspensoes",
] as const;

export type OrgGestaoPath = (typeof ORG_GESTAO_PATHS)[number];

export function isOrgGestaoPath(pathname: string): pathname is OrgGestaoPath {
  return (ORG_GESTAO_PATHS as readonly string[]).includes(pathname);
}
