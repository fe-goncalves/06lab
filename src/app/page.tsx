import { createClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return (
      <main className="p-8">
        <p className="text-red-600" role="alert">
          {authError.message}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-8">
        <p>Não autenticado</p>
      </main>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, full_name, organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <main className="p-8">
        <p className="text-red-600" role="alert">
          {profileError.message}
        </p>
      </main>
    );
  }

  let organizationName: string | null = null;
  if (profile?.organization_id) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();

    if (orgError) {
      return (
        <main className="p-8">
          <p className="text-red-600" role="alert">
            {orgError.message}
          </p>
        </main>
      );
    }

    organizationName = org?.name ?? null;
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">Teste de sessão</h1>
      <dl className="max-w-md space-y-2">
        <div>
          <dt className="font-medium text-zinc-600">Email</dt>
          <dd>{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-600">Role</dt>
          <dd>{profile?.role ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-600">Nome completo</dt>
          <dd>{profile?.full_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-600">Organização</dt>
          <dd>{organizationName ?? "—"}</dd>
        </div>
      </dl>
    </main>
  );
}n=