import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ComissaoClient from "./comissao-client";

export default async function ComissaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: members } = await supabase
    .from("staff_members")
    .select("id, full_name, surname, photo_url, staff_role_id, staff_roles(full_name)")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("full_name");

  const list = members ?? [];

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Comissão Técnica</h1>
        <ComissaoClient />
      </header>

      {list.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border px-6 py-16 text-center"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum membro cadastrado ainda.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m: any) => (
            <li key={m.id}>
              <Link href={`/comissao/${m.id}`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-colors"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {m.full_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{m.full_name}</p>
                  {m.surname && <p className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>{m.surname}</p>}
                  {m.staff_roles?.full_name && (
                    <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-mono"
                      style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {m.staff_roles.full_name}
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