import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import LocalHub from "./local-hub";

export default async function LocalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const { data: venue } = await supabase
    .from("venues")
    .select("id, full_name, short_name, address, display_order, logo_url")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!venue) notFound();

  return <LocalHub venue={venue} />;
}