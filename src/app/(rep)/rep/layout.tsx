import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase-server";
import { requireRepresentative, getRepOrgInfo } from "@/app/(rep)/lib/rep-auth";
import { getRepresentativeNavTeams } from "@/app/(rep)/lib/rep-teams";
import RepSidebarClient from "./rep-sidebar-client";

export default async function RepLayout({ children }: { children: ReactNode }) {
  const rep = await requireRepresentative();
  const supabase = await createClient();
  const [orgInfo, teams] = await Promise.all([
    getRepOrgInfo(rep.organization_id),
    getRepresentativeNavTeams(supabase, rep.id),
  ]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      <RepSidebarClient orgInfo={orgInfo} repName={rep.full_name} teams={teams} />
      <main className="min-w-0 flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-background)" }}>
        {children}
      </main>
    </div>
  );
}
