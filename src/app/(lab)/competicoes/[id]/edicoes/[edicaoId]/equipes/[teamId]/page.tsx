import { redirect } from "next/navigation";

/** Rota legada — redireciona para URL registrada pelo App Router. */
export default async function EquipeEdicaoLegacyPage({
  params,
}: {
  params: Promise<{ id: string; edicaoId: string; teamId: string }>;
}) {
  const { id: competitionId, edicaoId, teamId } = await params;
  redirect(`/competicoes/${competitionId}/equipes/${teamId}?edicao=${edicaoId}`);
}
