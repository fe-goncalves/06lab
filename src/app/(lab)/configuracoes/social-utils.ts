export type SocialKey = "instagram" | "youtube" | "tiktok" | "twitter";

export const SOCIAL_PLATFORMS: Array<{
  key: SocialKey;
  label: string;
  placeholder: string;
}> = [
  { key: "instagram", label: "Instagram", placeholder: "suaorganizacao" },
  { key: "youtube", label: "YouTube", placeholder: "suaorganizacao" },
  { key: "tiktok", label: "TikTok", placeholder: "suaorganizacao" },
  { key: "twitter", label: "X", placeholder: "suaorganizacao" },
];

export type SocialHandles = Record<SocialKey, string>;

export function emptySocialHandles(): SocialHandles {
  return { instagram: "", youtube: "", tiktok: "", twitter: "" };
}

export function handlesFromOrg(org: {
  instagram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  twitter_url?: string | null;
} | null): SocialHandles {
  return {
    instagram: extractHandle(org?.instagram_url ?? null, "instagram"),
    youtube: extractHandle(org?.youtube_url ?? null, "youtube"),
    tiktok: extractHandle(org?.tiktok_url ?? null, "tiktok"),
    twitter: extractHandle(org?.twitter_url ?? null, "twitter"),
  };
}

export function extractHandle(url: string | null, key: SocialKey): string {
  if (!url?.trim()) return "";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    let segment = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if (!segment) return "";

    if (key === "youtube") {
      if (segment.startsWith("@")) return segment.slice(1).split("/")[0] ?? "";
      if (segment.startsWith("channel/") || segment.startsWith("c/")) {
        return segment.split("/")[1] ?? "";
      }
    }

    segment = segment.replace(/^@/, "");
    return segment.split("/")[0] ?? "";
  } catch {
    const clean = url.trim().replace(/^@/, "");
    return clean.includes("/") ? clean.split("/").pop()?.replace("@", "") ?? "" : clean;
  }
}

export function buildSocialUrl(key: SocialKey, handle: string): string {
  const h = handle.trim().replace(/^@+/, "").replace(/\s+/g, "");
  if (!h) return "";
  switch (key) {
    case "instagram":
      return `https://instagram.com/${h}`;
    case "youtube":
      return `https://youtube.com/@${h}`;
    case "tiktok":
      return `https://tiktok.com/@${h}`;
    case "twitter":
      return `https://x.com/${h}`;
  }
}

export function handlesToFormFields(handles: SocialHandles): {
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  twitter_url: string;
} {
  return {
    instagram_url: buildSocialUrl("instagram", handles.instagram),
    youtube_url: buildSocialUrl("youtube", handles.youtube),
    tiktok_url: buildSocialUrl("tiktok", handles.tiktok),
    twitter_url: buildSocialUrl("twitter", handles.twitter),
  };
}
