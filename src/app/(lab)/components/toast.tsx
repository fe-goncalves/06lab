"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type Toast = {
  id: string;
  type: "success" | "error";
  message: string;
};

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify() {
  listeners.forEach(l => l([...toasts]));
}

export function toast(type: "success" | "error", message: string) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 4000);
}

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter(l => l !== setItems);
    };
  }, []);

  function dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: item.type === "success"
              ? "rgba(191,242,5,0.3)"
              : "rgba(255,68,68,0.3)",
            minWidth: "280px",
            maxWidth: "400px",
          }}
        >
          {item.type === "success" ? (
            <CheckCircle size={16} strokeWidth={2} style={{ color: "var(--color-brand)", flexShrink: 0 }} />
          ) : (
            <XCircle size={16} strokeWidth={2} style={{ color: "#FF4444", flexShrink: 0 }} />
          )}
          <p className="flex-1 font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
            {item.message}
          </p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="shrink-0 transition-opacity hover:opacity-70"
            style={{ color: "#A6A6A6" }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}