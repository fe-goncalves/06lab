"use client";

import { salvarOrganizacao, alterarSenha } from "./actions";
import { useRef, useState } from "react";

export default function ConfiguracoesClient({ org, userProfile }: { org: any; userProfile: any }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(org?.name ?? "");
  const [slug, setSlug] = useState(org?.slug ?? "");
  const [customDomain, setCustomDomain] = useState(org?.custom_domain ?? "");
  const [logoUrl, setLogoUrl] = useState(org?.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgFeedback, setOrgFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSaveOrg() {
    setSavingOrg(true);
    setOrgFeedback(null);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("custom_domain", customDomain);
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await salvarOrganizacao(org?.id, fd);
    setSavingOrg(false);
    if ("error" in result) { setOrgFeedback({ type: "error", text: result.error }); return; }
    setOrgFeedback({ type: "success", text: "Configurações salvas." });
    setPendingLogo(null);
  }

  async function handleSavePassword() {
    setSavingPassword(true);
    setPasswordFeedback(null);
    const fd = new FormData();
    fd.append("new_password", newPassword);
    const result = await alterarSenha(fd);
    setSavingPassword(false);
    if ("error" in result) { setPasswordFeedback({ type: "error", text: result.error }); return; }
    setPasswordFeedback({ type: "success", text: "Senha alterada com sucesso." });
    setNewPassword("");
  }

  const displayLogo = previewUrl ?? logoUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Organização */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Organização</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {displayLogo ? (
              <img src={displayLogo} alt="" className="h-16 w-16 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                Trocar logo
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome da organização</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={ic} style={is} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Slug</span>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className={ic} style={is} />
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Usado na URL pública: 06.score/{slug}
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Domínio personalizado (opcional)</span>
            <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="scores.suaorganizacao.com.br" className={ic} style={is} />
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>Status:</span>
            <span className="rounded px-2 py-0.5 text-xs font-mono"
              style={{ backgroundColor: org?.status === "active" ? "var(--color-brand)" : "var(--color-border)", color: org?.status === "active" ? "var(--color-background)" : "var(--color-text-secondary)" }}>
              {org?.status === "active" ? "Ativa" : org?.status ?? "—"}
            </span>
          </div>
        </div>
        {orgFeedback && (
          <p className="mt-3 text-sm" style={{ color: orgFeedback.type === "error" ? "var(--color-danger)" : "var(--color-success)" }}>
            {orgFeedback.text}
          </p>
        )}
        <button type="button" onClick={handleSaveOrg} disabled={savingOrg}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {savingOrg ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>

      {/* Conta */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Minha conta</h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {userProfile?.full_name ?? "Administrador"}
            </p>
            <p className="text-xs font-mono" style={{ color: "var(--color-brand)" }}>Administrador principal</p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nova senha</span>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={ic} style={is} />
          </label>
        </div>
        {passwordFeedback && (
          <p className="mt-3 text-sm" style={{ color: passwordFeedback.type === "error" ? "var(--color-danger)" : "var(--color-success)" }}>
            {passwordFeedback.text}
          </p>
        )}
        <button type="button" onClick={handleSavePassword} disabled={savingPassword || newPassword.length < 6}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {savingPassword ? "Alterando…" : "Alterar senha"}
        </button>
      </div>

      {/* Info do sistema */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Sistema</h2>
        <div className="space-y-1">
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Versão: 06.lab 0.1.0</p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Stack: Next.js 16 + Supabase</p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Organização ID: <span className="font-mono">{org?.id}</span></p>
        </div>
      </div>
    </div>
  );
}