import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function SistemaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Sistema
        </h1>
        <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Configurações técnicas do sistema.
        </p>
      </header>
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Em construção.
        </p>
      </div>
    </div>
  );
}