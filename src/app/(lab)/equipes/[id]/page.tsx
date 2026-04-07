import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: team, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !team) redirect("/equipes");

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-4">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt={team.full_name}
            className="h-16 w-16 rounded-xl border object-contain"
            style={{ borderColor: "var(--color-border)" }}
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl border text-lg font-bold"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
            }}
          >
            {team.abbreviation ?? team.full_name?.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1
            className="font-display text-2xl"
            style={{ color: "var(--color-text-primary)" }}
          >
            {team.full_name}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {team.gender === "male" ? "Masculino" : "Feminino"}
          </p>
        </div>
      </div>

      {/* Cores extraídas */}
      {(team.primary_color || team.secondary_color || team.tertiary_color) && (
        <div className="mb-6 flex gap-3">
          {[team.primary_color, team.secondary_color, team.tertiary_color]
            .filter(Boolean)
            .map((color: string, i: number) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className="h-8 w-8 rounded-full border"
                  style={{
                    backgroundColor: color,
                    borderColor: "var(--color-border)",
                  }}
                />
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {color}
                </span>
              </div>
            ))}
        </div>
      )}

      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Página da equipe em construção. Em breve: elenco, histórico e estatísticas.
        </p>
      </div>
    </div>
  );
}