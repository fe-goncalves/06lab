"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/app/(lab)/components/auth-shell";
import styles from "@/app/(lab)/components/entity-hub.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      setError("Email ou senha incorretos.");
      setLoading(false);
      return;
    }

    const { data: repRecord } = await supabase
      .from("representatives")
      .select("id, status")
      .eq("auth_user_id", signInData.user.id)
      .maybeSingle();

    if (repRecord && repRecord.status !== "active") {
      await supabase.auth.signOut();
      setError("Esta conta de representante está desativada. Entre em contato com a organização.");
      setLoading(false);
      return;
    }

    const { data: rep } = await supabase
      .from("representatives")
      .select("id")
      .eq("auth_user_id", signInData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (rep) {
      router.push("/rep");
    } else {
      router.push("/");
    }

    router.refresh();
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
        </div>

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={styles.authSubmitBtn}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
