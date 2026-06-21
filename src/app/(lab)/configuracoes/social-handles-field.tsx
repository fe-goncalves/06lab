"use client";

import { useState } from "react";
import {
  SOCIAL_PLATFORMS,
  type SocialHandles,
  type SocialKey,
} from "./social-utils";
import { SocialIcon } from "./social-icons";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Props = {
  value: SocialHandles;
  onChange: (next: SocialHandles) => void;
};

export function SocialHandlesField({ value, onChange }: Props) {
  const [active, setActive] = useState<SocialKey>("instagram");

  const activePlatform = SOCIAL_PLATFORMS.find((p) => p.key === active) ?? SOCIAL_PLATFORMS[0];
  const configured = SOCIAL_PLATFORMS.filter((p) => value[p.key].trim());

  function setHandle(key: SocialKey, handle: string) {
    const clean = handle.replace(/^@+/, "").replace(/\s/g, "");
    onChange({ ...value, [key]: clean });
  }

  return (
    <div className={styles.socialPanel}>
      <div className={styles.socialPicker} role="tablist" aria-label="Redes sociais">
        {SOCIAL_PLATFORMS.map((platform) => {
          const selected = active === platform.key;
          const hasValue = !!value[platform.key].trim();
          return (
            <button
              key={platform.key}
              type="button"
              role="tab"
              aria-selected={selected}
              title={platform.label}
              className={`${styles.socialPickerBtn} ${selected ? styles.socialPickerBtnActive : ""} ${hasValue ? styles.socialPickerBtnFilled : ""}`}
              onClick={() => setActive(platform.key)}
            >
              <SocialIcon platform={platform.key} size={16} />
            </button>
          );
        })}
      </div>

      <div className={styles.socialInputRow}>
        <span className={styles.socialInputIcon} aria-hidden>
          <SocialIcon platform={activePlatform.key} size={18} />
        </span>
        <span className={styles.socialAtPrefix}>@</span>
        <input
          type="text"
          value={value[activePlatform.key]}
          onChange={(e) => setHandle(activePlatform.key, e.target.value)}
          placeholder={activePlatform.placeholder}
          className={styles.socialHandleInput}
          aria-label={`Usuário ${activePlatform.label}`}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {configured.length > 0 && (
        <div className={styles.socialConfigured}>
          {configured.map((platform) => (
            <button
              key={platform.key}
              type="button"
              className={`${styles.socialConfiguredChip} ${active === platform.key ? styles.socialConfiguredChipActive : ""}`}
              onClick={() => setActive(platform.key)}
            >
              <SocialIcon platform={platform.key} size={12} />
              <span>@{value[platform.key]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
