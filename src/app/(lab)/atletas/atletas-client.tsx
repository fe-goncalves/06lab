"use client";

import { useState } from "react";
import { NovoAtletaModal } from "./novo-atleta-modal";

export default function AtletasClient() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        style={{
          backgroundColor: "var(--color-brand)",
          color: "var(--color-background)",
          borderColor: "var(--color-brand)",
        }}
      >
        Novo atleta
      </button>
      <NovoAtletaModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}