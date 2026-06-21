"use client";

import type { CSSProperties } from "react";
import { PersonAvatarPlaceholder } from "./person-avatar-placeholder";

type PersonAvatarProps = {
  photoUrl?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  imgClassName?: string;
  placeholderClassName?: string;
  round?: boolean;
};

export function PersonAvatar({
  photoUrl,
  alt = "",
  size = 40,
  className,
  style,
  imgClassName,
  placeholderClassName,
  round = true,
}: PersonAvatarProps) {
  const shellStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: round ? "50%" : 8,
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--color-text-hint)",
    ...style,
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={alt}
        className={imgClassName ?? className}
        style={{ ...shellStyle, objectFit: "cover" }}
      />
    );
  }

  return (
    <div className={className} style={shellStyle} aria-hidden={!alt}>
      <PersonAvatarPlaceholder fill className={placeholderClassName} />
    </div>
  );
}
