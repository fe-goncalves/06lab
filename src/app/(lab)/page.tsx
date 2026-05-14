import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, full_name")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: org }, { data: teams }, { data: cache }] = await Promise.all([
    supabase.from("organizations").select("name, short_name, logo_url").eq("id", orgId).maybeSingle(),
    supabase.from("teams")
      .select("id, full_name, abbreviation, logo_url, primary_color")
      .eq("organization_id", orgId)
      .eq("is_virtual", false)
      .order("full_name"),
    supabase.from("dashboard_cache")
      .select("data, updated_at")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);

  const orgName = org?.short_name ?? org?.name ?? "Organização";
  const orgLogo = org?.logo_url ?? null;

  return (
    <DashboardClient
      orgName={orgName}
      orgLogo={orgLogo}
      orgId={orgId}
      teams={teams ?? []}
      cachedData={cache?.data ?? null}
      cacheUpdatedAt={cache?.updated_at ?? null}
    />
  );
}