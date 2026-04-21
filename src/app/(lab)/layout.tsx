import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import LabSidebarClient from "./sidebar-client";

type PinnedCompetition = {
  id: string;
  displayName: string;
  logo_url: string | null;
};

export default async function LabLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, short_name, logo_url, favicon_url, slug, custom_domain")
    .eq("id", profile?.organization_id ?? "")
    .maybeSingle();

  const orgInfo = {
    name: org?.name ?? "06LAB",
    short_name: org?.short_name ?? null,
    logo_url: org?.logo_url ?? null,
    favicon_url: org?.favicon_url ?? null,
    slug: org?.slug ?? null,
    custom_domain: org?.custom_domain ?? null,
  };

  let pinnedCompetitions: PinnedCompetition[] = [];

  if (profile?.organization_id) {
    const { data: pinnedRows } = await supabase
      .from("competitions")
      .select("id, short_name, full_name, logo_url")
      .eq("organization_id", profile.organization_id)
      .eq("pinned_in_sidebar", true)
      .limit(3);

    pinnedCompetitions = (pinnedRows ?? []).map((row) => ({
      id: row.id as string,
      displayName: (row.short_name?.trim() || row.full_name?.trim() || "Competição").toUpperCase(),
      logo_url: row.logo_url ?? null,
    }));
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      <LabSidebarClient pinnedCompetitions={pinnedCompetitions} orgInfo={orgInfo} />
      <main className="min-w-0 flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-background)" }}>
        {children}
      </main>
    </div>
  );
}