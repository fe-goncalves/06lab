"use client";

import { useState } from "react";
import { NovaCompeticaoModal } from "./nova-competicao-modal";

export default function CompeticoesClient() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
        Nova competição
      </button>
      <NovaCompeticaoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}