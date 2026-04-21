import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import LocaisClient from "./locais-client";

export default async function LocaisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: venues } = await supabase
    .from("venues")
    .select("id, full_name, short_name, logo_url, address, display_order")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("display_order").order("full_name");

  return <LocaisClient venues={venues ?? []} />;
}
