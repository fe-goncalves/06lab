import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import OrganizacaoClient from "./organizacao-client";

export default async function OrganizacaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) redirect("/");

  return (
    <Suspense>
      <OrganizacaoClient />
    </Suspense>
  );
}
