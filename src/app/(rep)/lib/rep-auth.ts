import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export type ActiveRepresentative = {
  id: string;
  full_name: string;
  email: string;
  organization_id: string;
  auth_user_id: string;
};

export type RepOrgInfo = {
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

export async function getActiveRepresentative(): Promise<ActiveRepresentative | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rep } = await supabase
    .from("representatives")
    .select("id, full_name, email, organization_id, auth_user_id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return rep;
}

export async function requireRepresentative(): Promise<ActiveRepresentative> {
  const rep = await getActiveRepresentative();
  if (!rep) redirect("/login");
  return rep;
}

export async function getRepOrgInfo(organizationId: string): Promise<RepOrgInfo> {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, short_name, logo_url")
    .eq("id", organizationId)
    .maybeSingle();

  return {
    name: org?.name ?? "Organização",
    short_name: org?.short_name ?? null,
    logo_url: org?.logo_url ?? null,
  };
}

export async function hasTeamAccess(repId: string, teamId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("representative_team_access")
    .select("id")
    .eq("representative_id", repId)
    .eq("team_id", teamId)
    .maybeSingle();

  return !!data;
}

export async function getRepresentativeTeamIds(repId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("representative_team_access")
    .select("team_id")
    .eq("representative_id", repId);

  return (data ?? []).map(row => row.team_id as string);
}

export async function requireTeamAccess(repId: string, teamId: string): Promise<void> {
  const allowed = await hasTeamAccess(repId, teamId);
  if (!allowed) redirect("/rep");
}
