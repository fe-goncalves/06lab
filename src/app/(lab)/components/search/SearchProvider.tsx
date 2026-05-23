// components/search/SearchProvider.tsx
"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { SearchModal } from "./SearchModal";

interface SearchContextValue {
  open: () => void;
  close: () => void;
}

const SearchContext = createContext<SearchContextValue>({
  open: () => {},
  close: () => {},
});

export function useSearchModal() {
  return useContext(SearchContext);
}

interface SearchProviderProps {
  children: React.ReactNode;
  organizationId: string | null;
}

export function SearchProvider({ children, organizationId }: SearchProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Atalho global Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <SearchContext.Provider value={{ open, close }}>
      {children}
      <SearchModal isOpen={isOpen} onClose={close} organizationId={organizationId} />
    </SearchContext.Provider>
  );
}