import { ENCOUNTER_PHASE_DATA_VERSION, type EncounterPhaseData, type SessionLog } from "./dpsReport";
import { average } from "./format";

export type ImportMode = "merge" | "replace";
export type RunSessionType = "full-clear" | "practice";

export type RunRecord = {
  id: string;
  reportId: string | null;
  permalink: string;
  source: string;
  bossId: number | null;
  bossName: string;
  encounterKey: string;
  wing: number | null;
  success: boolean | null;
  duration: number;
  start: number;
  end: number;
  uploadTime: number | null;
  date: string;
  weekKey: string;
  isCm: boolean;
  sessionType: RunSessionType;
  compDps: number | null;
  numberOfPlayers: number | null;
  numberOfGroups: number | null;
  phaseData: EncounterPhaseData | null;
  createdAt: string;
  updatedAt: string;
  raw: SessionLog["raw"];
};

export type EncounterWeekSummary = {
  encounterKey: string;
  bossName: string;
  wing: number | null;
  isCm: boolean;
  runs: number;
  kills: number;
  wipes: number;
  unknown: number;
  killRate: number | null;
  totalDuration: number;
  averageDuration: number;
  bestDuration: number | null;
  averageCompDps: number | null;
};

export type WeekSummary = {
  weekKey: string;
  runs: number;
  kills: number;
  wipes: number;
  unknown: number;
  killRate: number | null;
  totalDuration: number;
  averageDuration: number;
  averageCompDps: number | null;
  encounters: EncounterWeekSummary[];
};

export type RunHistoryBackup = {
  version: 1;
  exportedAt: string;
  runs: RunRecord[];
};

export type SaveRunsResult = {
  saved: number;
  updated: number;
};

const DB_NAME = "gw2-evtc-tools";
const DB_VERSION = 1;
const RUNS_STORE = "runs";
const BACKUP_VERSION = 1;

export function isRunHistorySupported(): boolean {
  return typeof indexedDB !== "undefined";
}

export function sessionLogToRunRecord(log: SessionLog, sessionType: RunSessionType, existing?: RunRecord): RunRecord {
  const now = new Date().toISOString();
  const timestamp = getRunTimestamp(log);

  return {
    id: getRunId(log),
    reportId: log.id || null,
    permalink: log.permalink,
    source: log.source,
    bossId: log.bossId,
    bossName: log.bossName,
    encounterKey: getEncounterKey(log.bossId, log.bossName, log.isCm),
    wing: log.wing,
    success: log.success,
    duration: log.duration,
    start: log.start,
    end: log.end,
    uploadTime: log.uploadTime,
    date: new Date(timestamp * 1000).toISOString(),
    weekKey: getIsoWeekKey(timestamp),
    isCm: log.isCm,
    sessionType,
    compDps: toFiniteNumber(log.raw.encounter?.compDps),
    numberOfPlayers: toFiniteNumber(log.raw.encounter?.numberOfPlayers),
    numberOfGroups: toFiniteNumber(log.raw.encounter?.numberOfGroups),
    phaseData: existing?.phaseData ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    raw: log.raw,
  };
}

export async function saveSessionLogs(logs: SessionLog[], sessionType: RunSessionType = "full-clear"): Promise<SaveRunsResult> {
  const existingRuns = await getAllRunRecords();
  const existingById = new Map(existingRuns.map((run) => [run.id, run]));
  // Dedupe by run id (last wins, matching IndexedDB put semantics) so duplicate
  // inputs are stored and counted once.
  const recordById = new Map<string, RunRecord>();
  for (const log of logs) {
    const id = getRunId(log);
    recordById.set(id, sessionLogToRunRecord(log, sessionType, existingById.get(id)));
  }
  const records = Array.from(recordById.values());

  await putRunRecords(records);

  return records.reduce(
    (result, record) => {
      if (existingById.has(record.id)) {
        result.updated += 1;
      } else {
        result.saved += 1;
      }
      return result;
    },
    { saved: 0, updated: 0 },
  );
}

export async function getAllRunRecords(): Promise<RunRecord[]> {
  const db = await openDatabase();

  try {
    return await requestToPromise<RunRecord[]>(db.transaction(RUNS_STORE, "readonly").objectStore(RUNS_STORE).getAll());
  } finally {
    db.close();
  }
}

export async function deleteRunRecord(id: string): Promise<void> {
  const db = await openDatabase();

  try {
    const tx = db.transaction(RUNS_STORE, "readwrite");
    tx.objectStore(RUNS_STORE).delete(id);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function saveRunRecord(record: RunRecord): Promise<void> {
  await putRunRecords([record]);
}

export async function clearRunHistory(): Promise<void> {
  const db = await openDatabase();

  try {
    const tx = db.transaction(RUNS_STORE, "readwrite");
    tx.objectStore(RUNS_STORE).clear();
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function exportRunHistoryBackup(): Promise<RunHistoryBackup> {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    runs: await getAllRunRecords(),
  };
}

export async function importRunHistoryBackup(backup: unknown, mode: ImportMode): Promise<SaveRunsResult> {
  const runs = parseBackup(backup);
  const existingRuns = mode === "merge" ? await getAllRunRecords() : [];
  const existingById = new Map(existingRuns.map((run) => [run.id, run]));
  const normalized = runs.map((run) => ({
    ...run,
    createdAt: existingById.get(run.id)?.createdAt ?? run.createdAt,
    updatedAt: new Date().toISOString(),
  }));
  // Dedupe by run id (last wins, matching IndexedDB put semantics) so duplicate
  // backup entries are stored and counted once.
  const uniqueRecords = Array.from(new Map(normalized.map((run) => [run.id, run])).values());

  if (mode === "replace") {
    await replaceRunRecords(uniqueRecords);
  } else {
    await putRunRecords(uniqueRecords);
  }

  return uniqueRecords.reduce(
    (result, record) => {
      if (existingById.has(record.id)) {
        result.updated += 1;
      } else {
        result.saved += 1;
      }
      return result;
    },
    { saved: 0, updated: 0 },
  );
}

export function summarizeRunsByWeek(runs: RunRecord[]): WeekSummary[] {
  const weekMap = new Map<string, RunRecord[]>();

  for (const run of runs) {
    weekMap.set(run.weekKey, [...(weekMap.get(run.weekKey) ?? []), run]);
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekKey, weekRuns]) => ({
      weekKey,
      ...summarizeRuns(weekRuns),
      encounters: summarizeEncounters(weekRuns),
    }));
}

function summarizeEncounters(runs: RunRecord[]): EncounterWeekSummary[] {
  const encounterMap = new Map<string, RunRecord[]>();

  for (const run of runs) {
    encounterMap.set(run.encounterKey, [...(encounterMap.get(run.encounterKey) ?? []), run]);
  }

  return Array.from(encounterMap.entries())
    .map(([encounterKey, encounterRuns]) => {
      const first = encounterRuns[0];
      return {
        encounterKey,
        bossName: first.bossName,
        wing: first.wing,
        isCm: first.isCm,
        ...summarizeRuns(encounterRuns),
      };
    })
    .sort((a, b) => (a.wing ?? 99) - (b.wing ?? 99) || a.bossName.localeCompare(b.bossName));
}

function summarizeRuns(runs: RunRecord[]) {
  const kills = runs.filter((run) => run.success === true).length;
  const wipes = runs.filter((run) => run.success === false).length;
  const unknown = runs.length - kills - wipes;
  const decided = kills + wipes;
  const compDpsValues = runs.map((run) => run.compDps).filter((value): value is number => value != null);
  const durations = runs.map((run) => run.duration).filter((duration) => Number.isFinite(duration) && duration > 0);
  const successfulDurations = runs
    .filter((run) => run.success === true)
    .map((run) => run.duration)
    .filter((duration) => Number.isFinite(duration) && duration > 0);
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);

  return {
    runs: runs.length,
    kills,
    wipes,
    unknown,
    killRate: decided ? kills / decided : null,
    totalDuration,
    averageDuration: durations.length ? totalDuration / durations.length : 0,
    bestDuration: successfulDurations.length ? Math.min(...successfulDurations) : null,
    averageCompDps: average(compDpsValues),
  };
}

async function putRunRecords(records: RunRecord[]): Promise<void> {
  if (!records.length) return;

  const db = await openDatabase();

  try {
    const tx = db.transaction(RUNS_STORE, "readwrite");
    const store = tx.objectStore(RUNS_STORE);
    for (const record of records) {
      store.put(record);
    }
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

async function replaceRunRecords(records: RunRecord[]): Promise<void> {
  const db = await openDatabase();

  try {
    const tx = db.transaction(RUNS_STORE, "readwrite");
    const store = tx.objectStore(RUNS_STORE);
    store.clear();
    for (const record of records) {
      store.put(record);
    }
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isRunHistorySupported()) {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RUNS_STORE)) {
        const store = db.createObjectStore(RUNS_STORE, { keyPath: "id" });
        store.createIndex("weekKey", "weekKey", { unique: false });
        store.createIndex("encounterKey", "encounterKey", { unique: false });
        store.createIndex("start", "start", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open run history database."));
    request.onblocked = () => reject(new Error("Run history database is blocked by another open tab."));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction was aborted."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function parseBackup(value: unknown): RunRecord[] {
  if (!isObject(value)) {
    throw new Error("Backup file is not a JSON object.");
  }

  if (value.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version. Expected version ${BACKUP_VERSION}.`);
  }

  if (!Array.isArray(value.runs)) {
    throw new Error("Backup file does not contain a runs array.");
  }

  return value.runs.map(normalizeRunRecord);
}

function normalizeRunRecord(value: unknown): RunRecord {
  if (!isObject(value)) {
    throw new Error("Backup contains an invalid run record.");
  }

  const id = readString(value, "id");
  const bossName = readString(value, "bossName");
  const start = readNumber(value, "start");
  const duration = readNumber(value, "duration");
  const isCm = readBoolean(value, "isCm");
  const uploadTime = readNullableNumber(value, "uploadTime");
  const date = readNullableString(value, "date");
  const timestamp = getBackupTimestamp(start, date, uploadTime);

  return {
    id,
    reportId: readNullableString(value, "reportId"),
    permalink: readString(value, "permalink"),
    source: readString(value, "source"),
    bossId: readNullableNumber(value, "bossId"),
    bossName,
    encounterKey: readNullableString(value, "encounterKey") ?? getEncounterKey(readNullableNumber(value, "bossId"), bossName, isCm),
    wing: readNullableNumber(value, "wing"),
    success: readNullableBoolean(value, "success"),
    duration,
    start,
    end: readNumber(value, "end"),
    uploadTime,
    date: new Date(timestamp * 1000).toISOString(),
    weekKey: readBackupWeekKey(value, timestamp),
    isCm,
    sessionType: readRunSessionType(value),
    compDps: readNullableNumber(value, "compDps"),
    numberOfPlayers: readNullableNumber(value, "numberOfPlayers"),
    numberOfGroups: readNullableNumber(value, "numberOfGroups"),
    phaseData: readEncounterPhaseData(value),
    createdAt: readNullableString(value, "createdAt") ?? new Date().toISOString(),
    updatedAt: readNullableString(value, "updatedAt") ?? new Date().toISOString(),
    raw: isObject(value.raw) ? (value.raw as SessionLog["raw"]) : {},
  };
}

function getBackupTimestamp(start: number, date: string | null, uploadTime: number | null): number {
  if (start > 0) return start;

  if (date != null) {
    const parsed = Date.parse(date) / 1000;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  if (uploadTime != null && uploadTime > 0) return uploadTime;

  throw new Error('Backup run needs a positive "start", parseable "date", or positive "uploadTime".');
}

function readBackupWeekKey(value: Record<string, unknown>, timestamp: number): string {
  const weekKey = readNullableString(value, "weekKey");
  if (weekKey == null || !/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(weekKey)) {
    return getIsoWeekKey(timestamp);
  }

  return weekKey;
}

function getRunId(log: SessionLog): string {
  if (log.permalink) return `dps:${log.permalink}`;
  if (log.id) return `dps-id:${log.id}`;
  return `source:${log.source}:${log.start}:${log.bossId ?? "unknown"}`;
}

function getRunTimestamp(log: SessionLog): number {
  if (Number.isFinite(log.start) && log.start > 0) return log.start;
  if (log.uploadTime && Number.isFinite(log.uploadTime)) return log.uploadTime;
  return Date.now() / 1000;
}

export function getIsoWeekKey(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) {
    throw new Error("Cannot build ISO week key from an invalid timestamp.");
  }

  const date = new Date(unixSeconds * 1000);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const year = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getEncounterKey(bossId: number | null, bossName: string, isCm: boolean): string {
  const base = bossId == null ? bossName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : String(bossId);
  return `${base || "unknown"}${isCm ? "-cm" : ""}`;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string") throw new Error(`Backup run is missing string field "${key}".`);
  return field;
}

function readNullableString(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  if (field == null) return null;
  if (typeof field !== "string") throw new Error(`Backup run has invalid string field "${key}".`);
  return field;
}

function readNumber(value: Record<string, unknown>, key: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new Error(`Backup run is missing number field "${key}".`);
  }
  return field;
}

function readNullableNumber(value: Record<string, unknown>, key: string): number | null {
  const field = value[key];
  if (field == null) return null;
  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new Error(`Backup run has invalid number field "${key}".`);
  }
  return field;
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") throw new Error(`Backup run is missing boolean field "${key}".`);
  return field;
}

function readNullableBoolean(value: Record<string, unknown>, key: string): boolean | null {
  const field = value[key];
  if (field == null) return null;
  if (typeof field !== "boolean") throw new Error(`Backup run has invalid boolean field "${key}".`);
  return field;
}

function readRunSessionType(value: Record<string, unknown>): RunSessionType {
  const field = value.sessionType;
  if (field == null) return "full-clear";
  if (field === "full-clear" || field === "practice") return field;
  throw new Error('Backup run has invalid sessionType. Expected "full-clear" or "practice".');
}

function readEncounterPhaseData(value: Record<string, unknown>): EncounterPhaseData | null {
  const field = value.phaseData;
  if (field == null) return null;
  if (!isObject(field)) {
    throw new Error('Backup run has invalid "phaseData".');
  }

  const fetchedAt = readString(field, "fetchedAt");
  const phasesValue = field.phases;
  if (!Array.isArray(phasesValue)) {
    throw new Error('Backup run has invalid "phaseData.phases".');
  }

  return {
    version: readNullableNumber(field, "version") ?? 1,
    fetchedAt,
    phases: phasesValue.map((phase, index) => readEncounterPhaseMetric(phase, index)),
    players: Array.isArray(field.players) ? field.players.map((player, index) => readEncounterPlayerMetric(player, index)) : [],
  };
}

function readEncounterPhaseMetric(value: unknown, index: number): EncounterPhaseData["phases"][number] {
  if (!isObject(value)) {
    throw new Error(`Backup run has invalid phase entry at index ${index}.`);
  }

  return {
    key: readString(value, "key"),
    name: readString(value, "name"),
    phaseType: readNullableString(value, "phaseType"),
    startMs: readNumber(value, "startMs"),
    endMs: readNumber(value, "endMs"),
    durationSeconds: readNumber(value, "durationSeconds"),
    targetIds: readNumberArray(value, "targetIds"),
    targetNames: readStringArray(value, "targetNames"),
    squadDps: readNullableNumber(value, "squadDps"),
    squadDamage: readNullableNumber(value, "squadDamage"),
    squadTargetDps: readNullableNumber(value, "squadTargetDps"),
    squadTargetDamage: readNullableNumber(value, "squadTargetDamage"),
  };
}

function readEncounterPlayerMetric(value: unknown, index: number): EncounterPhaseData["players"][number] {
  if (!isObject(value)) {
    throw new Error(`Backup run has invalid player entry at index ${index}.`);
  }

  return {
    name: readString(value, "name"),
    account: readNullableString(value, "account"),
    profession: readNullableString(value, "profession"),
    group: readNullableNumber(value, "group"),
    squadDps: readNullableNumber(value, "squadDps"),
    squadDamage: readNullableNumber(value, "squadDamage"),
    targetDps: readNullableNumber(value, "targetDps"),
    targetDamage: readNullableNumber(value, "targetDamage"),
  };
}

function readNumberArray(value: Record<string, unknown>, key: string): number[] {
  const field = value[key];
  if (!Array.isArray(field) || field.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) {
    throw new Error(`Backup run has invalid number array field "${key}".`);
  }
  return [...field];
}

function readStringArray(value: Record<string, unknown>, key: string): string[] {
  const field = value[key];
  if (!Array.isArray(field) || field.some((entry) => typeof entry !== "string")) {
    throw new Error(`Backup run has invalid string array field "${key}".`);
  }
  return [...field];
}

export function hasCurrentPhaseData(phaseData: EncounterPhaseData | null | undefined): boolean {
  return phaseData?.version === ENCOUNTER_PHASE_DATA_VERSION;
}
