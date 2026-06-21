import type { SocialKey } from "./social-utils";

export function SocialIcon({ platform, size = 16 }: { platform: SocialKey; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };

  switch (platform) {
    case "instagram":
      return (
        <svg {...common}>
          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.75-2.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M21.6 7.2a2.8 2.8 0 0 0-1.97-1.98C17.74 4.6 12 4.6 12 4.6s-5.74 0-7.63.62A2.8 2.8 0 0 0 2.4 7.2 29.4 29.4 0 0 0 1.8 12a29.4 29.4 0 0 0 .6 4.8 2.8 2.8 0 0 0 1.97 1.98C6.26 19.4 12 19.4 12 19.4s5.74 0 7.63-.62a2.8 2.8 0 0 0 1.97-1.98c.4-1.58.6-3.24.6-4.8s-.2-3.22-.6-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M16.6 5.82c.94.7 2.1 1.12 3.35 1.18V9.6a6.9 6.9 0 0 1-3.35-.86v6.43a4.55 4.55 0 1 1-4.02-4.52v2.36a2.2 2.2 0 1 0 1.57 2.1V2h2.45a4.4 4.4 0 0 0 0 3.82Z" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common}>
          <path d="M17.3 3H20l-6.4 7.32L21 21h-6.2l-4.85-6.34L4.7 21H2l6.84-7.82L3 3h6.36l4.38 5.77L17.3 3Zm-1.1 16.2h1.72L7.96 4.74H6.1l10.1 14.46Z" />
        </svg>
      );
  }
}
