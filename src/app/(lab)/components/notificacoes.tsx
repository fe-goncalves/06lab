"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  context: any;
};

const TYPE_ICONS: Record<string, string> = {
  report_approved: "✓",
  report_rejected: "✗",
  roster_approved: "✓",
  roster_rejected: "✗",
  suspension_completed: "⚠",
  yellow_card_threshold: "🟨",
  pending_review: "◉",
  player_expelled: "🟥",
};

export default function Notificacoes({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (!profile) { setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllAsRead() {
    const supabase = createClient();
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-80 rounded-xl border shadow-lg"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--color-border)" }}>
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
              Notificações
            </p>
            {unread > 0 && (
              <button type="button" onClick={markAllAsRead}
                className="text-xs" style={{ color: "var(--color-brand)" }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Carregando…</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma notificação.</p>
            ) : (
              <ul>
                {notifications.map(n => (
                  <li
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="flex gap-3 cursor-pointer border-b px-4 py-3 transition-colors last:border-b-0"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: n.is_read ? "transparent" : "var(--color-brand-hover-bg)",
                    }}
                  >
                    <span className="shrink-0 text-sm">{TYPE_ICONS[n.type] ?? "·"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug" style={{ color: "var(--color-text-primary)" }}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: "var(--color-brand)" }} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}