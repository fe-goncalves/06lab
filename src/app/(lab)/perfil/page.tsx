import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("full_name, role")
    .eq("auth_user_id", user.id).maybeSingle();

  const roleLabel: Record<string, string> = {
    main: "Administrador",
    supporter: "Supporter",
    relator: "Relator",
  };

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Perfil
        </h1>
      </header>
      <div className="max-w-sm rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
          {profile?.full_name ?? "Usuário"}
        </p>
        <p className="mt-1 font-mono text-xs" style={{ color: "var(--color-brand)" }}>
          {roleLabel[profile?.role ?? ""] ?? profile?.role ?? "—"}
        </p>
        <p className="mt-2 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {user.email}
        </p>
      </div>
    </div>
  );
}