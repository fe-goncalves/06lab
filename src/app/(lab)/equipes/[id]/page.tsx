"use client";

import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarEquipe } from "../actions";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type TeamRow = Record<string, unknown> & {
  id: string;
  organization_id: string;
  full_name: string;
  short_name: string | null;
  abbreviation: string | null;
  gender: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  founded_year: number | null;
  home_venue_id: string | null;
  parent_team_id?: string | null;
};

type VenueOption = { id: string; full_name: string };
type TeamOption = { id: string; full_name: string; gender: string | null };

function colorInputValue(hex: string | null | undefined): string {
  if (!hex) return "#000000";
  const h = hex.startsWith("#") ? hex : `#${hex}`;
  return /^#[0-9A-Fa-f]{6}$/i.test(h) ? h.toLowerCase() : "#000000";
}

function initialsFromTeam(team: {
  abbreviation: string | null;
  full_name: string;
}): string {
  const abbr = team.abbreviation?.trim();
  if (abbr && abbr.length >= 1) return abbr.slice(0, 2).toUpperCase();
  const name = team.full_name.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "—";
}

function genderBadgeLabel(gender: string | null): string {
  if (!gender) return "—";
  const g = gender.trim().toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "Masculino";
  if (g === "female" || g === "f" || g === "feminino") return "Feminino";
  return gender;
}

function genderMatchesForm(form: "male" | "female", db: string | null): boolean {
  const g = String(db ?? "").toLowerCase();
  if (form === "male") return g === "male" || g === "m" || g === "masculino";
  return g === "female" || g === "f" || g === "feminino";
}

export default function EquipeEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [siblingTeams, setSiblingTeams] = useState<TeamOption[]>([]);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [foundedYear, setFoundedYear] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [homeVenueId, setHomeVenueId] = useState<string>("");
  const [parentTeamId, setParentTeamId] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [tertiaryColor, setTertiaryColor] = useState("#000000");
  const [displayLogoUrl, setDisplayLogoUrl] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTeamAndOptions = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoadingData(false); return; }
    setLoadingData(true);
    setLoadError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); setLoadingData(false); return; }

    const { data: profile } = await supabase
      .from("user_profiles").select("organization_id")
      .eq("auth_user_id", user.id).maybeSingle();

    if (!profile?.organization_id) {
      setLoadError("Organização não encontrada.");
      setLoadingData(false);
      return;
    }

    const { data: teamRow, error: teamErr } = await supabase
      .from("teams").select("*").eq("id", id).maybeSingle();

    if (teamErr || !teamRow) {
      setLoadError("Equipe não encontrada.");
      setLoadingData(false);
      return;
    }

    const team = teamRow as TeamRow;
    if (team.organization_id !== profile.organization_id) {
      setLoadError("Equipe não encontrada.");
      setLoadingData(false);
      return;
    }

    const { data: venuesData } = await supabase
      .from("venues").select("id, full_name")
      .eq("organization_id", profile.organization_id)
      .order("full_name", { ascending: true });

    const { data: othersData } = await supabase
      .from("teams").select("id, full_name, gender")
      .eq("organization_id", profile.organization_id)
      .neq("id", id).order("full_name", { ascending: true });

    setVenues((venuesData ?? []) as VenueOption[]);
    setSiblingTeams((othersData ?? []) as TeamOption[]);
    setFullName(team.full_name ?? "");
    setShortName(team.short_name ?? "");
    setAbbreviation(team.abbreviation ?? "");
    setFoundedYear(
      team.founded_year != null && Number.isFinite(team.founded_year)
        ? String(team.founded_year) : "",
    );
    const gRaw = String(team.gender ?? "").toLowerCase();
    setGender(gRaw === "female" || gRaw === "f" || gRaw === "feminino" ? "female" : "male");
    setHomeVenueId(team.home_venue_id ?? "");
    setParentTeamId(typeof team.parent_team_id === "string" ? team.parent_team_id : "");
    setPrimaryColor(colorInputValue(team.primary_color));
    setSecondaryColor(colorInputValue(team.secondary_color));
    setTertiaryColor(colorInputValue(team.tertiary_color));
    setDisplayLogoUrl(team.logo_url);
    setPendingLogoFile(null);
    setPreviewObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setLoadingData(false);
  }, [id, router]);

  useEffect(() => { void loadTeamAndOptions(); }, [loadTeamAndOptions]);

  useEffect(() => {
    if (!parentTeamId) return;
    const stillValid = siblingTeams.some(
      (t) => t.id === parentTeamId && genderMatchesForm(gender, t.gender),
    );
    if (!stillValid) setParentTeamId("");
  }, [gender, parentTeamId, siblingTeams]);

  useEffect(() => {
    return () => { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); };
  }, [previewObjectUrl]);

  function handlePickLogoClick() { fileInputRef.current?.click(); }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreviewObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (!f) { setPendingLogoFile(null); return; }
    setPendingLogoFile(f);
    setPreviewObjectUrl(URL.createObjectURL(f));
  }

  const headerLogoSrc = previewObjectUrl ?? displayLogoUrl;
  const parentOptions = siblingTeams.filter((t) => genderMatchesForm(gender, t.gender));

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("abbreviation", abbreviation.trim().slice(0, 3));
      fd.append("founded_year", foundedYear.trim());
      fd.append("gender", gender);
      fd.append("home_venue_id", homeVenueId);
      fd.append("parent_team_id", parentTeamId);
      fd.append("primary_color", primaryColor);
      fd.append("secondary_color", secondaryColor);
      fd.append("tertiary_color", tertiaryColor);
      if (pendingLogoFile) fd.append("logo", pendingLogoFile);

      const result = await editarEquipe(id, fd);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      toast("success", "Alterações salvas com sucesso.");
      await loadTeamAndOptions();
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  if (loadingData) {
    return <div className="p-6 md:p-8"><p style={{ color: "var(--color-text-secondary)" }}>Carregando…</p></div>;
  }

  if (loadError) {
    return <div className="p-6 md:p-8"><p style={{ color: "var(--color-text-primary)" }} role="alert">{loadError}</p></div>;
  }

  return (
    <div className="p-6 md:p-8">
      <Breadcrumb items={[{ label: "Equipes", href: "/equipes" }, { label: fullName || "Equipe" }]} />

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {headerLogoSrc ? (
            <img src={headerLogoSrc} alt="" className="h-16 w-16 shrink-0 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border text-lg font-bold"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {initialsFromTeam({ abbreviation, full_name: fullName })}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display truncate text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {fullName || "Equipe"}
            </h1>
            <span className="mt-1 inline-block rounded-md border px-2 py-0.5 text-xs font-medium"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
              {genderBadgeLabel(gender)}
            </span>
          </div>
        </div>
        <button type="submit" form="form-editar-equipe" disabled={saving}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", borderColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </header>

      <form id="form-editar-equipe" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card Identidade */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
              Identidade
            </h2>
            <div className="mb-4 flex justify-center">
              {headerLogoSrc ? (
                <img src={headerLogoSrc} alt="" className="h-28 w-28 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-xl border text-xl font-bold"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                  {initialsFromTeam({ abbreviation, full_name: fullName })}
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoFileChange} />
            <button type="button" onClick={handlePickLogoClick}
              className="mb-6 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_10%,transparent)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
              Trocar logo
            </button>
            <div className="flex flex-wrap gap-6">
              {([
                ["primary_color", primaryColor, setPrimaryColor],
                ["secondary_color", secondaryColor, setSecondaryColor],
                ["tertiary_color", tertiaryColor, setTertiaryColor],
              ] as const).map(([key, value, setVal]) => (
                <label key={key} className="flex flex-col items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="relative h-10 w-10 overflow-hidden rounded-full border-2" style={{ borderColor: "var(--color-border)" }}>
                    <input type="color" value={value} onChange={(e) => setVal(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={key.replace("_", " ")} />
                    <span className="pointer-events-none block h-full w-full" style={{ backgroundColor: value }} />
                  </span>
                  <span className="font-mono text-xs">{value}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Card Dados */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
              Dados
            </h2>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome curto</span>
                <input type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Sigla</span>
                <input type="text" maxLength={3} value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value.slice(0, 3).toUpperCase())}
                  className={`${inputClass} uppercase`} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ano de fundação</span>
                <input type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
                <select value={gender} onChange={(e) => setGender(e.target.value as "male" | "female")} className={inputClass} style={inputStyle}>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Local</span>
                <select value={homeVenueId} onChange={(e) => setHomeVenueId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Nenhum</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Seção feminina / masculina de</span>
                <select value={parentTeamId} onChange={(e) => setParentTeamId(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Nenhum</option>
                  {parentOptions.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}