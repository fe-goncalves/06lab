import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { verificarPodeExcluirCompeticao } from "../../actions";
import ConfiguracoesCompeticaoClient from "./configuracoes-client";

export default async function ConfiguracoesCompeticaoPage({
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
    { data: globalCategories },
    { data: editions },
    { data: seasons },
  ] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("competitions")
      .select("id, full_name, short_name, logo_url")
      .eq("organization_id", orgId)
      .eq("is_virtual", false)
      .neq("id", id)
      .order("full_name"),
    supabase.from("categories")
      .select("id, label, display_order")
      .eq("organization_id", orgId).order("display_order"),
    supabase.from("competition_editions")
      .select("id, status, season_id, custom_name, is_current, start_date, end_date, created_at, display_order, is_hidden, seasons(id, name, year_id, years(value))")
      .eq("competition_id", id)
      .order("display_order", { ascending: true }),
    supabase.from("seasons")
      .select("id, name, year_id, display_order, years(value)")
      .eq("organization_id", orgId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (error || !comp) redirect("/competicoes");

  const supportsLifecycle = Object.prototype.hasOwnProperty.call(comp, "is_active");
  const genderLocked = (editions ?? []).length > 0;

  const deleteCheck = supportsLifecycle
    ? await verificarPodeExcluirCompeticao(id)
    : { canDelete: false, reasons: [] as string[] };
  const deleteGuard = "error" in deleteCheck
    ? { canDelete: false, reasons: [] as string[] }
    : deleteCheck;

  const editionsList = (editions ?? []).map((e: any) => ({
    id: e.id,
    status: e.status,
    season_id: e.season_id,
    custom_name: e.custom_name ?? null,
    is_current: e.is_current ?? false,
    start_date: e.start_date ?? null,
    end_date: e.end_date ?? null,
    created_at: e.created_at ?? "",
    season_name: e.seasons?.name ?? "—",
    year_value: e.seasons?.years?.value ?? 0,
    display_order: e.display_order ?? 0,
    is_hidden: e.is_hidden ?? false,
  }));

  editionsList.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const seasonsList = (seasons ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    year_value: s.years?.value ?? 0,
  }));

  return (
    <ConfiguracoesCompeticaoClient
      competition={comp}
      allCompetitions={others ?? []}
      globalCategories={globalCategories ?? []}
      editions={editionsList}
      seasons={seasonsList}
      deleteCheck={deleteGuard}
      genderLocked={genderLocked}
      supportsLifecycle={supportsLifecycle}
    />
  );
}