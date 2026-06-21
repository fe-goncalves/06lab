import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { OrgGestaoPageShell } from "@/app/(lab)/components/org-gestao-page-shell";
import RepresentantesClient from "./representantes-client";

export default async function RepresentantesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const orgId = profile?.organization_id ?? "";
  if (!orgId) redirect("/");

  return (
    <OrgGestaoPageShell>
      <RepresentantesClient orgId={orgId} />
    </OrgGestaoPageShell>
  );
}
