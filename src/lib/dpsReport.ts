import { getEncounterName, getEncounterWing } from "../data/encounters";

export type DpsReportDomain = "https://dps.report" | "https://b.dps.report";

export type DpsReportMetadata = {
  id?: string;
  permalink?: string;
  uploadTime?: number;
  encounterTime?: number;
  error?: string | null;
  encounter?: {
    success?: boolean;
    duration?: number | string;
    compDps?: number;
    numberOfPlayers?: number;
    numberOfGroups?: number;
    bossId?: number;
    boss?: string;
    isCm?: boolean;
    gw2Build?: number;
    jsonAvailable?: boolean;
  };
  evtc?: {
    type?: string;
    version?: string;
    bossId?: number;
  };
};

export type SessionLog = {
  id: string;
  permalink: string;
  source: string;
  bossId: number | null;
  bossName: string;
  wing: number | null;
  success: boolean | null;
  duration: number;
  start: number;
  end: number;
  uploadTime: number | null;
  isCm: boolean;
  raw: DpsReportMetadata;
};

export type WingSummary = {
  wing: number | null;
  label: string;
  logs: SessionLog[];
  start: number;
  end: number;
  elapsed: number;
  combat: number;
  downtime: number;
};

export type SessionSummary = {
  logs: SessionLog[];
  wings: WingSummary[];
  start: number | null;
  end: number | null;
  elapsed: number;
  combat: number;
  downtime: number;
};

const RAID_WINGS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function parseDurationSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    const parts = value.split(":").map((part) => Number(part));
    if (parts.every(Number.isFinite)) {
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
  }
  return 0;
}

function normalizePermalink(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://dps.report/${trimmed}`;
}

export function extractPermalinks(text: string): string[] {
  const matches = text.match(/https?:\/\/(?:www\.)?(?:a\.|b\.)?dps\.report\/[^\s,]+|(?:^|\s)([A-Za-z0-9]+-[^\s,]+)/g) ?? [];
  const normalized = matches
    .map((match) => normalizePermalink(match.trim()))
    .filter(Boolean)
    .map((link) => link.replace(/[),.;]+$/, ""));

  return Array.from(new Set(normalized));
}

function getMetadataDomain(permalink: string): DpsReportDomain {
  try {
    const hostname = new URL(permalink).hostname.toLowerCase();
    return hostname === "b.dps.report" ? "https://b.dps.report" : "https://dps.report";
  } catch {
    return "https://dps.report";
  }
}

export async function fetchUploadMetadata(permalink: string): Promise<DpsReportMetadata> {
  const domain = getMetadataDomain(permalink);
  const url = new URL("/getUploadMetadata", domain);
  url.searchParams.set("permalink", permalink);

  const response = await fetch(url.toString(), { method: "GET" });
  const json = (await response.json()) as DpsReportMetadata;

  if (!response.ok || json.error) {
    throw new Error(json.error || `dps.report returned HTTP ${response.status}`);
  }

  return json;
}

export async function uploadLogToDpsReport(
  file: File,
  domain: DpsReportDomain,
  options: { anonymous: boolean },
): Promise<DpsReportMetadata> {
  const url = new URL("/uploadContent", domain);
  url.searchParams.set("json", "1");
  url.searchParams.set("generator", "ei");
  url.searchParams.set("anonymous", String(options.anonymous));

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url.toString(), { method: "POST", body: formData });
  const json = (await response.json()) as DpsReportMetadata;

  if (!response.ok || json.error) {
    throw new Error(json.error || `dps.report returned HTTP ${response.status}`);
  }

  return json;
}

export function metadataToSessionLog(metadata: DpsReportMetadata, source: string): SessionLog {
  const bossId = metadata.encounter?.bossId ?? metadata.evtc?.bossId ?? null;
  const duration = parseDurationSeconds(metadata.encounter?.duration);
  const start = Number(metadata.encounterTime ?? 0);
  const end = start + duration;

  return {
    id: metadata.id ?? source,
    permalink: metadata.permalink ?? source,
    source,
    bossId,
    bossName: metadata.encounter?.boss ?? getEncounterName(bossId),
    wing: getEncounterWing(bossId),
    success: typeof metadata.encounter?.success === "boolean" ? metadata.encounter.success : null,
    duration,
    start,
    end,
    uploadTime: typeof metadata.uploadTime === "number" ? metadata.uploadTime : null,
    isCm: Boolean(metadata.encounter?.isCm),
    raw: metadata,
  };
}

export function summarizeSession(logs: SessionLog[]): SessionSummary {
  const sorted = [...logs].sort((a, b) => a.start - b.start || a.end - b.end);
  const valid = sorted.filter((log) => Number.isFinite(log.start) && log.start > 0);

  const wingMap = new Map<number | null, SessionLog[]>();
  for (const log of sorted) {
    const key = log.wing;
    wingMap.set(key, [...(wingMap.get(key) ?? []), log]);
  }

  const wings: WingSummary[] = RAID_WINGS.map((wing) => summarizeWing(wing, wingMap.get(wing) ?? []));
  const unmappedLogs = wingMap.get(null) ?? [];
  if (unmappedLogs.length) {
    wings.push(summarizeWing(null, unmappedLogs));
  }

  const start = valid.length ? Math.min(...valid.map((log) => log.start)) : null;
  const end = valid.length ? Math.max(...valid.map((log) => log.end)) : null;
  const combat = sorted.reduce((sum, log) => sum + log.duration, 0);
  const elapsed = start != null && end != null ? end - start : combat;

  return {
    logs: sorted,
    wings,
    start,
    end,
    elapsed,
    combat,
    downtime: Math.max(0, elapsed - combat),
  };
}

function summarizeWing(wing: number | null, wingLogs: SessionLog[]): WingSummary {
  const wingValid = wingLogs.filter((log) => log.start > 0 && log.end >= log.start);
  const start = wingValid.length ? Math.min(...wingValid.map((log) => log.start)) : 0;
  const end = wingValid.length ? Math.max(...wingValid.map((log) => log.end)) : 0;
  const combat = wingLogs.reduce((sum, log) => sum + log.duration, 0);
  const elapsed = end > start ? end - start : combat;

  return {
    wing,
    label: wing == null ? "Unmapped" : `Wing ${wing}`,
    logs: wingLogs,
    start,
    end,
    elapsed,
    combat,
    downtime: Math.max(0, elapsed - combat),
  };
}

export function logsToCsv(logs: SessionLog[]): string {
  const header = [
    "wing",
    "boss",
    "bossId",
    "success",
    "startUnix",
    "endUnix",
    "durationSeconds",
    "permalink",
  ];

  const rows = logs.map((log) => [
    log.wing ?? "",
    log.bossName,
    log.bossId ?? "",
    log.success ?? "",
    log.start,
    log.end,
    Math.round(log.duration),
    log.permalink,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
