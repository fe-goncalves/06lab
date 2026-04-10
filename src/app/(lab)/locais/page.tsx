import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
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

  const list = venues ?? [];

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Locais</h1>
        <LocaisClient />
      </header>

      {list.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border px-6 py-16 text-center"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum local cadastrado ainda.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(venue => (
            <li key={venue.id}>
              <Link href={`/locais/${venue.id}`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-colors"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {venue.logo_url ? (
                  <img src={venue.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-contain" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-sm font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {venue.full_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{venue.full_name}</p>
                  {venue.short_name && <p className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>{venue.short_name}</p>}
                  {venue.address && <p className="truncate text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{venue.address}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}