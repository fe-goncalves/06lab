import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import LabSidebarClient, { type PinnedCompetition } from "./sidebar-client";

export default async function LabLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let pinnedCompetitions: PinnedCompetition[] = [];

  if (profile?.organization_id) {
    const { data: pinnedRows } = await supabase
      .from("competitions")
      .select("id, short_name, name")
      .eq("organization_id", profile.organization_id)
      .eq("pinned_in_sidebar", true)
      .limit(3);

    pinnedCompetitions = (pinnedRows ?? []).map((row) => {
      const short =
        row.short_name != null && String(row.short_name).trim() !== ""
          ? String(row.short_name).trim()
          : null;
      const name =
        row.name != null && String(row.name).trim() !== ""
          ? String(row.name).trim()
          : null;
      return {
        id: row.id as string,
        displayName: short ?? name ?? "Competição",
      };
    });
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <LabSidebarClient pinnedCompetitions={pinnedCompetitions} />

      <main
        className="min-w-0 flex-1 overflow-y-auto"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        {children}
      </main>
    </div>
  );
}
