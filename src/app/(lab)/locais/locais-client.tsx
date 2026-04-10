"use client";

import { useState } from "react";
import { NovoLocalModal } from "./novo-local-modal";

export default function LocaisClient() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
        Novo local
      </button>
      <NovoLocalModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}