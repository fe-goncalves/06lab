import { redirect } from "next/navigation";
import { renderEquipeEdicaoPage } from "../equipe-edicao-page";

export default async function EquipeEdicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; teamId: string }>;
  searchParams: Promise<{ edicao?: string }>;
}) {
  const { id: competitionId, teamId } = await params;
  const { edicao: edicaoId } = await searchParams;

  if (!edicaoId) {
    redirect(`/competicoes/${competitionId}?aba=competicao&comp=equipes`);
  }

  return renderEquipeEdicaoPage(competitionId, edicaoId, teamId);
}
