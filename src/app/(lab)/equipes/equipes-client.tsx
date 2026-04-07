"use client";

import { NovaEquipeModal } from "./nova-equipe-modal";
import { useState } from "react";

export default function EquipesClient() {
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
        Nova equipe
      </button>
      <NovaEquipeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
