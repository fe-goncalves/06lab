import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EquipesClient from "./equipes-client";

type TeamRow = {
  id: string;
  full_name: string;
  short_name: string | null;
  abbreviation: string | null;
  gender: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  founded_year: number | null;
  home_venue_id: string | null;
};

function genderLabel(gender: string | null): string {
  if (!gender) return "—";
  const g = gender.trim().toLowerCase();
  if (g === "m" || g === "male" || g === "masculino") return "Masculino";
  if (g === "f" || g === "female" || g === "feminino") return "Feminino";
  return gender;
}

function initialsFromTeam(team: TeamRow): string {
  const abbr = team.abbreviation?.trim();
  if (abbr && abbr.length >= 1) {
    return abbr.slice(0, 2).toUpperCase();
  }
  const name = team.full_name.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "—";
}

export default async function EquipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id ?? null;

  let teams: TeamRow[] = [];
  let fetchError: string | null = null;

  if (organizationId) {
    const { data, error } = await supabase
      .from("teams")
      .select(
        "id, full_name, short_name, abbreviation, gender, logo_url, primary_color, secondary_color, tertiary_color, founded_year, home_venue_id",
      )
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });

    if (error) {
      fetchError = error.message;
    } else {
      teams = (data ?? []) as TeamRow[];
    }
  }

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
        className="font-display text-2xl font-semibold tracking-tight md:text-3xl"
        style={{ color: "var(--color-text-primary)" }}
        >
        Equipes
        </h1>
        <EquipesClient />
        </header>

      {fetchError ? (
        <p
          className="mb-6 rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text-primary)",
          }}
          role="alert"
        >
          {fetchError}
        </p>
      ) : null}

      {teams.length === 0 && !fetchError ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <p className="max-w-sm text-sm">
            Nenhuma equipe cadastrada ainda.
          </p>
        </div>
      ) : null}

      {teams.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const initials = initialsFromTeam(team);
            const gender = genderLabel(team.gender);
            const dotColor =
              team.primary_color?.trim() || "var(--color-border)";

            return (
              <li
                key={team.id}
                className="flex flex-col rounded-xl border p-4 transition-colors hover:border-[color-mix(in_oklab,var(--color-brand)_35%,var(--color-border))]"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex gap-3">
                  <div
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-xs font-bold"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span style={{ color: "var(--color-text-primary)" }}>
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        className="truncate text-base font-semibold leading-snug"
                        style={{ color: "var(--color-text-primary)" }}
                        title={team.full_name}
                      >
                        {team.full_name}
                      </h2>
                      <span
                        className="mt-1.5 h-3 w-3 shrink-0 rounded-full border"
                        style={{
                          backgroundColor: dotColor,
                          borderColor: "var(--color-border)",
                        }}
                        title={team.primary_color ?? undefined}
                        aria-hidden
                      />
                    </div>
                    {team.abbreviation ? (
                      <p
                        className="mt-0.5 text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Sigla:{" "}
                        <span
                          className="font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {team.abbreviation}
                        </span>
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <span
                        className="inline-block rounded-md border px-2 py-0.5 text-xs font-medium"
                        style={{
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-primary)",
                          backgroundColor: "var(--color-background)",
                        }}
                      >
                        {gender}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
