import { getEncounterName, getEncounterWing } from "../data/encounters";

export type DpsReportDomain = "https://dps.report" | "https://b.dps.report";
export const ENCOUNTER_PHASE_DATA_VERSION = 2;

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

export type EncounterPhaseMetric = {
  key: string;
  name: string;
  phaseType: string | null;
  startMs: number;
  endMs: number;
  durationSeconds: number;
  targetIds: number[];
  targetNames: string[];
  squadDps: number | null;
  squadDamage: number | null;
  squadTargetDps: number | null;
  squadTargetDamage: number | null;
};

export type EncounterPhaseData = {
  version: number;
  fetchedAt: string;
  phases: EncounterPhaseMetric[];
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

type DpsReportJsonTarget = {
  id?: number;
  name?: string;
};

type DpsReportJsonPhase = {
  start?: number;
  end?: number;
  name?: string;
  phaseType?: string;
  breakbarPhase?: boolean;
  targets?: number[];
  targetPriorities?: Record<string, string>;
  subPhases?: number[];
};

type DpsReportJsonDpsStat = {
  dps?: number;
  damage?: number;
};

type DpsReportJsonPlayer = {
  firstAware?: number;
  lastAware?: number;
  dpsAll?: Array<DpsReportJsonDpsStat | null>;
  dpsTargets?: Array<Array<DpsReportJsonDpsStat | null> | null>;
};

type DpsReportEncounterJson = {
  error?: string | null;
  phases?: DpsReportJsonPhase[];
  players?: DpsReportJsonPlayer[];
  targets?: DpsReportJsonTarget[];
};

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

export async function fetchEncounterPhaseData(permalink: string): Promise<EncounterPhaseData> {
  const domain = getMetadataDomain(permalink);
  const url = new URL("/getJson", domain);
  url.searchParams.set("permalink", permalink);

  const response = await fetch(url.toString(), { method: "GET" });
  const json = (await response.json()) as DpsReportEncounterJson;

  if (!response.ok || json.error) {
    throw new Error(json.error || `dps.report returned HTTP ${response.status}`);
  }

  return buildEncounterPhaseData(json);
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

function buildEncounterPhaseData(report: DpsReportEncounterJson): EncounterPhaseData {
  const phases = Array.isArray(report.phases) ? report.phases : [];
  const players = Array.isArray(report.players) ? report.players : [];
  const targets = Array.isArray(report.targets) ? report.targets : [];
  const keyPhases = getKeyPhases(phases);

  return {
    version: ENCOUNTER_PHASE_DATA_VERSION,
    fetchedAt: new Date().toISOString(),
    phases: keyPhases.map(({ phase, phaseIndex }) => {
      const name = readNonEmptyString(phase.name) ?? `Phase ${phaseIndex + 1}`;
      const startMs = readFiniteNumber(phase.start) ?? 0;
      const endMs = Math.max(startMs, readFiniteNumber(phase.end) ?? startMs);
      const durationSeconds = Math.max(0, endMs - startMs) / 1000;
      const targetIndexes = getPhaseTargetIndexes(phase);
      const mainTargetIndexes = getMainTargetIndexes(phase, targetIndexes);
      const activePlayers = players.filter((player) => isPlayerActiveForPhase(player, startMs, endMs));

      return {
        key: `${phase.phaseType ?? "phase"}:${name}`,
        name,
        phaseType: readNonEmptyString(phase.phaseType) ?? null,
        startMs,
        endMs,
        durationSeconds,
        targetIds: targetIndexes.map((targetIndex) => readFiniteNumber(targets[targetIndex]?.id) ?? targetIndex).filter(Number.isFinite),
        targetNames: getTargetNames(targetIndexes, targets),
        squadDps: sumDpsStat(activePlayers, phaseIndex, "dpsAll", "dps"),
        squadDamage: sumDpsStat(activePlayers, phaseIndex, "dpsAll", "damage"),
        squadTargetDps: sumTargetDpsStat(activePlayers, mainTargetIndexes, phaseIndex, "dps"),
        squadTargetDamage: sumTargetDpsStat(activePlayers, mainTargetIndexes, phaseIndex, "damage"),
      };
    }),
  };
}

function getKeyPhases(phases: DpsReportJsonPhase[]): Array<{ phase: DpsReportJsonPhase; phaseIndex: number }> {
  const indexedPhases = phases.map((phase, phaseIndex) => ({ phase, phaseIndex }));
  const encounterPhases = indexedPhases.filter(({ phase }) => isEncounterPhase(phase));

  if (encounterPhases.length) {
    const directChildren = encounterPhases.flatMap(({ phase }) =>
      (Array.isArray(phase.subPhases) ? phase.subPhases : [])
        .filter((phaseIndex) => Number.isInteger(phaseIndex) && phaseIndex >= 0 && phaseIndex < indexedPhases.length)
        .map((phaseIndex) => indexedPhases[phaseIndex]),
    );

    const keyPhases = dedupePhases([...encounterPhases, ...directChildren]).filter(({ phase }) => isKeyPhase(phase));
    if (keyPhases.length) {
      return keyPhases;
    }
  }

  return indexedPhases.filter(({ phase }) => isKeyPhase(phase));
}

function dedupePhases(phases: Array<{ phase: DpsReportJsonPhase; phaseIndex: number }>): Array<{ phase: DpsReportJsonPhase; phaseIndex: number }> {
  const seen = new Set<number>();
  return phases.filter(({ phaseIndex }) => {
    if (seen.has(phaseIndex)) return false;
    seen.add(phaseIndex);
    return true;
  });
}

function isEncounterPhase(phase: DpsReportJsonPhase): boolean {
  return phase.phaseType === "Encounter" || readNonEmptyString(phase.name) === "Full Fight";
}

function isKeyPhase(phase: DpsReportJsonPhase): boolean {
  if (isBreakbarPhase(phase)) return false;
  if (phase.phaseType === "TimeFrame") return false;
  return phase.phaseType === "Encounter" || phase.phaseType === "SubPhase" || phase.phaseType == null;
}

function isBreakbarPhase(phase: DpsReportJsonPhase): boolean {
  if (phase.breakbarPhase === true) return true;
  const name = readNonEmptyString(phase.name);
  return name != null && /breakbar/i.test(name);
}

function getPhaseTargetIndexes(phase: DpsReportJsonPhase): number[] {
  const indexes = new Set<number>();

  if (Array.isArray(phase.targets)) {
    for (const targetIndex of phase.targets) {
      if (Number.isInteger(targetIndex) && targetIndex >= 0) {
        indexes.add(targetIndex);
      }
    }
  }

  if (phase.targetPriorities && isRecord(phase.targetPriorities)) {
    for (const key of Object.keys(phase.targetPriorities)) {
      const parsed = Number(key);
      if (Number.isInteger(parsed) && parsed >= 0) {
        indexes.add(parsed);
      }
    }
  }

  return Array.from(indexes).sort((left, right) => left - right);
}

function getMainTargetIndexes(phase: DpsReportJsonPhase, fallback: number[]): number[] {
  if (!phase.targetPriorities || !isRecord(phase.targetPriorities)) {
    return fallback;
  }

  const mainTargets = Object.entries(phase.targetPriorities)
    .filter((entry) => entry[1].toUpperCase() === "MAIN")
    .map((entry) => Number(entry[0]))
    .filter((targetIndex) => Number.isInteger(targetIndex) && targetIndex >= 0);

  return mainTargets.length ? mainTargets : fallback;
}

function getTargetNames(targetIndexes: number[], targets: DpsReportJsonTarget[]): string[] {
  const names = targetIndexes
    .map((targetIndex) => readNonEmptyString(targets[targetIndex]?.name) ?? `Target ${targetIndex + 1}`)
    .filter((name, index, values) => values.indexOf(name) === index);

  return names;
}

function isPlayerActiveForPhase(player: DpsReportJsonPlayer, startMs: number, endMs: number): boolean {
  const firstAware = readFiniteNumber(player.firstAware) ?? 0;
  const lastAware = readFiniteNumber(player.lastAware) ?? Number.POSITIVE_INFINITY;
  return endMs > firstAware && startMs < lastAware;
}

function sumDpsStat(
  players: DpsReportJsonPlayer[],
  phaseIndex: number,
  key: "dpsAll",
  stat: keyof DpsReportJsonDpsStat,
): number | null {
  let total = 0;
  let hasValue = false;

  for (const player of players) {
    const phaseStat = player[key]?.[phaseIndex];
    const value = readFiniteNumber(phaseStat?.[stat]);
    if (value == null) continue;
    total += value;
    hasValue = true;
  }

  return hasValue ? total : null;
}

function sumTargetDpsStat(
  players: DpsReportJsonPlayer[],
  targetIndexes: number[],
  phaseIndex: number,
  stat: keyof DpsReportJsonDpsStat,
): number | null {
  let total = 0;
  let hasValue = false;

  for (const player of players) {
    for (const targetIndex of targetIndexes) {
      const phaseStat = player.dpsTargets?.[targetIndex]?.[phaseIndex];
      const value = readFiniteNumber(phaseStat?.[stat]);
      if (value == null) continue;
      total += value;
      hasValue = true;
    }
  }

  return hasValue ? total : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value != null;
}
