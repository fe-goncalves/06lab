"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/app/(lab)/components/toast";
import { editarLocal } from "../actions";
import { EntityHubShell } from "@/app/(lab)/components/entity-hub-shell";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import { EntityLogoUpload } from "@/app/(lab)/components/entity-logo-upload";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Venue = {
  id: string;
  full_name: string;
  short_name: string | null;
  address: string | null;
  display_order: number | null;
  logo_url: string | null;
};

function initialsFromVenue(venue: Venue): string {
  const src = (venue.short_name ?? venue.full_name).trim();
  return src.slice(0, 2).toUpperCase() || "—";
}

export default function LocalHub({ venue }: { venue: Venue }) {
  const router = useRouter();

  const [fullName, setFullName] = useState(venue.full_name);
  const [shortName, setShortName] = useState(venue.short_name ?? "");
  const [address, setAddress] = useState(venue.address ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(venue.display_order ?? 0));
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(venue.logo_url);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pendingLogo) {
      setHeaderLogoUrl(venue.logo_url);
      return;
    }
    const url = URL.createObjectURL(pendingLogo);
    setHeaderLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo, venue.logo_url]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("address", address.trim());
      fd.append("display_order", displayOrder);
      if (pendingLogo) fd.append("logo", pendingLogo);
      const result = await editarLocal(venue.id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingLogo(null);
      router.refresh();
    } finally { setSaving(false); }
  }

  const headerTitle = (fullName.trim() || venue.full_name).toUpperCase();
  const headerDetail = shortName.trim()
    ? shortName.trim().toUpperCase()
    : (venue.address?.trim() || "—");

  return (
    <EntityHubShell
      breadcrumb={[{ label: "Locais", href: "/locais" }, { label: headerTitle }]}
      avatar={
        <div className={styles.logoSlot}>
          {headerLogoUrl
            ? <img src={headerLogoUrl} alt="" className={styles.logoImg} />
            : <span className={styles.logoInitials}>{initialsFromVenue(venue)}</span>
          }
        </div>
      }
      title={headerTitle}
      subtitle={headerDetail}
      showSave
      saveFormId="form-local"
      saving={saving}
    >
      <form id="form-local" onSubmit={handleSubmit} className={styles.formWrap}>
        <EntityHubSectionHeader title="Local" subtitle="Identidade e dados do estádio ou ginásio" />

        <EntityLogoUpload
          value={pendingLogo}
          onChange={setPendingLogo}
          existingUrl={venue.logo_url}
          label="Logo do local"
          hint="PNG, JPG ou WebP · proporção 1:1 recomendada"
        />

        <div className={styles.fieldStack}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="local-full-name">Nome completo *</label>
            <input
              id="local-full-name"
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.fieldRow2}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="local-short-name">Nome curto</label>
              <input
                id="local-short-name"
                type="text"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
                className={styles.input}
                placeholder="Abreviação na lista"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="local-order">Ordem de exibição</label>
              <input
                id="local-order"
                type="number"
                value={displayOrder}
                onChange={e => setDisplayOrder(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="local-address">Endereço</label>
            <input
              id="local-address"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className={styles.input}
              placeholder="Rua, número, bairro"
            />
          </div>
        </div>
      </form>
    </EntityHubShell>
  );
}
