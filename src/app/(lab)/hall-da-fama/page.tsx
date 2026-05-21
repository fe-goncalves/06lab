import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import HallDaFamaClient from "./hall-da-fama-client";
import { buscarHallDaFama, buscarOpcoesFiltro } from "./actions";

export const metadata = {
  title: "Hall da Fama",
};

export default async function HallDaFamaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [initialDataResult, opcoesFiltroResult] = await Promise.all([
    buscarHallDaFama({}),
    buscarOpcoesFiltro(),
  ]);

  if ("error" in initialDataResult || "error" in opcoesFiltroResult) {
    return (
      <div style={{ padding: 32 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-danger)",
          }}
        >
          Erro ao carregar Hall da Fama.{" "}
          {"error" in initialDataResult ? initialDataResult.error : ""}
        </p>
      </div>
    );
  }

  return (
    <HallDaFamaClient
      initialData={initialDataResult}
      opcoesFiltro={opcoesFiltroResult}
    />
  );
}