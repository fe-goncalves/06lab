import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CompeticoesClient from "./competicoes-client";

export default async function CompeticoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, full_name, short_name, gender, logo_url, pinned_in_sidebar")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("full_name");

  const list = competitions ?? [];

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Competições</h1>
        <CompeticoesClient />
      </header>

      {list.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border px-6 py-16 text-center"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma competição cadastrada ainda.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(c => (
            <li key={c.id}>
              <Link href={`/competicoes/${c.id}`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-colors"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {c.full_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{c.full_name}</p>
                  {c.short_name && <p className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>{c.short_name}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {c.gender === "male" ? "Masculino" : "Feminino"}
                    </span>
                    {c.pinned_in_sidebar && (
                      <span className="rounded px-1.5 py-0.5 text-xs font-mono"
                        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                        fixada
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}