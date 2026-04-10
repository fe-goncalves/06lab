"use client";

import { useState } from "react";
import { NovoArbitroModal } from "./novo-arbitro-modal";

export default function ArbitrosClient() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
        Novo árbitro
      </button>
      <NovoArbitroModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}