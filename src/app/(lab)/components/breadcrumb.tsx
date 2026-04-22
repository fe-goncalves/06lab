"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 font-mono text-xs">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight
                size={12}
                strokeWidth={2}
                style={{ color: "var(--color-border)" }}
              />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-[var(--color-brand)]"
                style={{ color: "#A6A6A6" }}
              >
                {item.label.toUpperCase()}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? "var(--color-text-primary)" : "#A6A6A6",
                }}
              >
                {item.label.toUpperCase()}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
