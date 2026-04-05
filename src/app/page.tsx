import { createClient } from "@/lib/supabase-server";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sports").select("*");

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-600" role="alert">
          {error.message}
        </p>
      </main>
    );
  }

  const rows = data ?? [];

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">Sports</h1>
      {rows.length === 0 ? (
        <p>No rows.</p>
      ) : (
        <ul className="list-disc space-y-2 pl-6">
          {rows.map((row, i) => (
            <li key={String((row as Record<string, unknown>).id ?? i)}>
              {Object.entries(row as Record<string, unknown>).map(([key, value]) => (
                <span key={key} className="mr-3 inline-block">
                  <span className="font-medium">{key}:</span>{" "}
                  {formatCell(value)}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
