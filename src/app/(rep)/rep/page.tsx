import { createClient } from "@/lib/supabase-server";
import { requireRepresentative } from "@/app/(rep)/lib/rep-auth";
import { getRepresentativeNavTeams } from "@/app/(rep)/lib/rep-teams";
import { listarSolicitacoesPendentes } from "./actions";
import RepDashboardClient from "./rep-dashboard-client";

export type { RepNavTeam as RepTeamCard } from "@/app/(rep)/lib/rep-teams";

export default async function RepDashboardPage() {
  const rep = await requireRepresentative();
  const supabase = await createClient();

  const [teams, requestsResult] = await Promise.all([
    getRepresentativeNavTeams(supabase, rep.id),
    listarSolicitacoesPendentes(),
  ]);

  const outgoing = "error" in requestsResult ? [] : requestsResult.outgoing;
  const counterparty = "error" in requestsResult ? [] : requestsResult.counterparty;

  return (
    <RepDashboardClient
      repName={rep.full_name}
      teams={teams}
      initialOutgoing={outgoing}
      initialCounterparty={counterparty}
    />
  );
}
