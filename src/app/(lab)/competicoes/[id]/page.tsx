import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CompeticaoEditForm from "./competicao-edit-form";
import EdicoesSection from "./edicoes-section";

export default async function CompeticaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [
    { data: comp, error },
    { data: others },
    { data: editions },
    { data: seasons },
  ] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("competitions").select("id, full_name")
      .eq("organization_id", orgId).neq("id", id).order("full_name"),
    supabase.from("competition_editions")
      .select("id, season_id, status, seasons(name, years(value))")
      .eq("competition_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("seasons")
      .select("id, name, years(value)")
      .eq("organization_id", orgId)
      .order("display_order"),
  ]);

  if (error || !comp) redirect("/competicoes");

  const editionsList = (editions ?? []).map((e: any) => ({
    id: e.id,
    season_id: e.season_id,
    status: e.status,
    season_name: e.seasons?.name ?? "—",
    year_value: e.seasons?.years?.value ?? 0,
  }));

  const seasonsList = (seasons ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    year_value: s.years?.value ?? 0,
  }));

  return (
    <div className="p-6 md:p-8">
      <CompeticaoEditForm
        competition={comp}
        allCompetitions={others ?? []}
      />
      <EdicoesSection
        competitionId={id}
        seasons={seasonsList}
        editions={editionsList}
      />
    </div>
  );
}