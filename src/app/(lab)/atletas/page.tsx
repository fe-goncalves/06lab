import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import AtletasClient from "./atletas-client";

export default async function AtletasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id ?? null;

  const [athletesRes, positionsRes] = await Promise.all([
    organizationId
      ? supabase
          .from("athletes")
          .select("id, full_name, surname, gender, photo_url, position_id, birth_date")
          .eq("organization_id", organizationId)
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("player_positions")
      .select("id, full_name")
      .eq("sport_slug", "football7"),
  ]);

  const athletes = athletesRes.data ?? [];
  const positions = positionsRes.data ?? [];
  const positionMap = Object.fromEntries(positions.map((p) => [p.id, p.full_name]));

  function initials(full_name: string, surname: string | null): string {
    const name = surname ?? full_name;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1
          className="font-display text-2xl font-semibold tracking-tight md:text-3xl"
          style={{ color: "var(--color-text-primary)" }}
        >
          Atletas
        </h1>
        <AtletasClient />
      </header>

      {athletes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhum atleta cadastrado ainda.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {athletes.map((athlete) => (
            <li key={athlete.id}>
              <Link
                href={`/atletas/${athlete.id}`}
                className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:border-[color-mix(in_oklab,var(--color-brand)_35%,var(--color-border))]"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {athlete.photo_url ? (
                  <img
                    src={athlete.photo_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full border object-cover"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {initials(athlete.full_name, athlete.surname)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {athlete.full_name}
                  </p>
                  {athlete.surname && (
                    <p className="truncate text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {athlete.surname}
                    </p>
                  )}
                  {athlete.position_id && positionMap[athlete.position_id] && (
                    <span
                      className="mt-1 inline-block rounded-md border px-2 py-0.5 text-xs"
                      style={{
                        borderColor: "var(--color-border)",
                        backgroundColor: "var(--color-background)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {positionMap[athlete.position_id]}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}