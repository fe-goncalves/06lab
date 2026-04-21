import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrganizacaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cards = [
    { label: "Temporadas", href: "/temporadas", description: "Anos e temporadas ativas" },
    { label: "Usuários", href: "/usuarios", description: "Administradores e relatores" },
    { label: "Representantes", href: "/representantes", description: "Acesso de representantes" },
    { label: "Aprovações", href: "/aprovacoes", description: "Inscrições e relatórios pendentes" },
    { label: "Suspensões", href: "/suspensoes", description: "Suspensões ativas e históricas" },
    { label: "Configurações", href: "/configuracoes", description: "Dados e configurações da organização" },
  ];

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Organização
        </h1>
        <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Gestão e configuração da organização.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-2 rounded-xl border p-5 transition-colors hover:border-[var(--color-brand)]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {card.label}
            </p>
            <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}