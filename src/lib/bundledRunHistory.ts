export type BundledRunHistorySource = {
  name: string;
  path: string;
  url: string;
};

const BUNDLED_RUN_HISTORY_FILES = Object.entries(
  import.meta.glob("../run-data/*.json", {
    eager: true,
    import: "default",
    query: "?url",
  }),
).map(([path, url]) => ({
  name: path.split("/").pop() ?? path,
  path,
  url: String(url),
}));

export function getBundledRunHistorySources(): BundledRunHistorySource[] {
  return [...BUNDLED_RUN_HISTORY_FILES];
}

export function getSingleBundledRunHistorySource(): BundledRunHistorySource | null {
  return BUNDLED_RUN_HISTORY_FILES.length === 1 ? BUNDLED_RUN_HISTORY_FILES[0] : null;
}

export async function fetchBundledRunHistoryBackup(source: BundledRunHistorySource): Promise<unknown> {
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(`Could not load bundled backup "${source.name}".`);
  }

  return response.json();
}
