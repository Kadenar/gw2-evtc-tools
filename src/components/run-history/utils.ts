import { formatSeconds } from "../../lib/format";
import type { RunRecord, RunSessionType, WeekSummary } from "../../lib/runHistory";
import { summarizeRunsByWeek } from "../../lib/runHistory";
import type { CmFilter, EncounterSummary, RecordHighlight, ResultFilter, RunStats, SessionTypeFilter, SortMode, RaidNightSummary, WingHistorySummary } from "./types";

export function buildRaidNightSummaries(runs: RunRecord[]): RaidNightSummary[] {
  const byNight = new Map<string, RunRecord[]>();

  for (const run of runs) {
    const key = `${getRunSessionType(run)}:${getNightKey(run)}`;
    byNight.set(key, [...(byNight.get(key) ?? []), run]);
  }

  return Array.from(byNight.entries())
    .map(([key, nightRuns]) => {
      const sorted = [...nightRuns].sort((a, b) => getRunStart(a) - getRunStart(b));
      const first = sorted[0];
      const sessionType = first ? getRunSessionType(first) : "full-clear";
      const dateKey = first ? getNightKey(first) : key;
      const start = first ? getRunStart(first) : 0;
      const end = sorted.length ? Math.max(...sorted.map(getRunEnd)) : start;
      const combatTime = sorted.reduce((sum, run) => sum + Math.max(0, run.duration), 0);
      const totalTime = Math.max(combatTime, end > start ? end - start : combatTime);
      const wings = Array.from(new Set(sorted.map((run) => run.wing).filter((wing): wing is number => wing != null))).sort((a, b) => a - b);

      return {
        key,
        label: formatNightLabel(dateKey),
        shortLabel: formatShortNightLabel(dateKey),
        sessionType,
        weekKey: sorted[0]?.weekKey ?? "",
        runs: sorted,
        wings,
        kills: sorted.filter((run) => run.success === true).length,
        wipes: sorted.filter((run) => run.success === false).length,
        combatTime,
        totalTime,
        downtime: Math.max(0, totalTime - combatTime),
        start,
      };
    })
    .sort((a, b) => b.start - a.start);
}

export function buildWingHistorySummaries(runs: RunRecord[]): WingHistorySummary[] {
  const byWing = new Map<number, RunRecord[]>();

  for (const run of runs) {
    if (run.wing == null) continue;
    byWing.set(run.wing, [...(byWing.get(run.wing) ?? []), run]);
  }

  return Array.from(byWing.entries())
    .map(([wing, wingRuns]) => {
      const nightTimes = buildRaidNightSummaries(wingRuns).map((night) => night.totalTime).filter((time) => time > 0);
      const latestTime = nightTimes[0] ?? null;
      const previousTime = nightTimes[1] ?? null;
      return {
        wing,
        runs: wingRuns,
        latestTime,
        bestTime: nightTimes.length ? Math.min(...nightTimes) : null,
        averageTime: average(nightTimes),
        wipes: wingRuns.filter((run) => run.success === false).length,
        trend: latestTime == null || previousTime == null ? "needs data" : latestTime < previousTime ? "better" : latestTime > previousTime ? "slower" : "stable",
      };
    })
    .sort((a, b) => (a.bestTime ?? Number.POSITIVE_INFINITY) - (b.bestTime ?? Number.POSITIVE_INFINITY));
}

export function buildWeekWingRows(
  current: WeekSummary | undefined,
  previous: WeekSummary | undefined,
): Array<{ wing: number; current: number | null; previous: number | null; note: string }> {
  const currentByWing = summarizeWeekByWing(current);
  const previousByWing = summarizeWeekByWing(previous);
  const wings = Array.from(new Set([...currentByWing.keys(), ...previousByWing.keys()])).sort((a, b) => a - b);

  return wings.map((wing) => {
    const currentTime = currentByWing.get(wing) ?? null;
    const previousTime = previousByWing.get(wing) ?? null;
    let note = "Needs both weeks";
    if (currentTime != null && previousTime != null) {
      const delta = currentTime - previousTime;
      note = Math.abs(delta) < 1 ? "Stable" : delta < 0 ? "Faster overall" : "Slower overall";
    }
    return { wing, current: currentTime, previous: previousTime, note };
  });
}

function summarizeWeekByWing(week: WeekSummary | undefined): Map<number, number> {
  const map = new Map<number, number>();
  if (!week) return map;
  for (const encounter of week.encounters) {
    if (encounter.wing == null) continue;
    map.set(encounter.wing, (map.get(encounter.wing) ?? 0) + encounter.totalDuration);
  }
  return map;
}

export type TimelineRow = { type: "run"; id: string; run: RunRecord } | { type: "gap"; id: string; label: string; source: string; seconds: number };

export function buildTimelineRows(night: RaidNightSummary): TimelineRow[] {
  const rows: TimelineRow[] = [];

  night.runs.forEach((run, index) => {
    const previous = night.runs[index - 1];
    if (previous) {
      const seconds = Math.max(0, getRunStart(run) - getRunEnd(previous));
      if (seconds > 0) {
        rows.push({
          type: "gap",
          id: `gap:${previous.id}:${run.id}`,
          label: `${shortBossName(previous.bossName)} to ${shortBossName(run.bossName)}`,
          source: getGapSource(previous, run),
          seconds,
        });
      }
    }
    rows.push({ type: "run", id: run.id, run });
  });

  return rows;
}

function getGapSource(previous: RunRecord, next: RunRecord): string {
  if (previous.success === false) return "Wipe recovery";
  if (previous.wing != null && next.wing != null && previous.wing !== next.wing) return "Wing transition";
  return "Downtime";
}

export function mostCommonGapSource(rows: TimelineRow[]): string {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.type !== "gap") continue;
    totals.set(row.source, (totals.get(row.source) ?? 0) + row.seconds);
  }
  return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
}

export function filterRuns(
  runs: RunRecord[],
  filters: {
    query: string;
    weekFilter: string;
    wingFilter: string;
    resultFilter: ResultFilter;
    cmFilter: CmFilter;
    sessionTypeFilter: SessionTypeFilter;
  },
): RunRecord[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return runs.filter((run) => {
    if (normalizedQuery && !run.bossName.toLowerCase().includes(normalizedQuery)) return false;
    if (filters.weekFilter !== "all" && run.weekKey !== filters.weekFilter) return false;
    if (filters.wingFilter === "unmapped" && run.wing != null) return false;
    if (filters.wingFilter !== "all" && filters.wingFilter !== "unmapped" && run.wing !== Number(filters.wingFilter)) return false;
    if (filters.resultFilter === "kill" && run.success !== true) return false;
    if (filters.resultFilter === "wipe" && run.success !== false) return false;
    if (filters.resultFilter === "unknown" && run.success != null) return false;
    if (filters.cmFilter === "cm" && !run.isCm) return false;
    if (filters.cmFilter === "normal" && run.isCm) return false;
    if (filters.sessionTypeFilter !== "all" && getRunSessionType(run) !== filters.sessionTypeFilter) return false;
    return true;
  });
}

export function sortRuns(runs: RunRecord[], sortMode: SortMode): RunRecord[] {
  return [...runs].sort((a, b) => {
    if (sortMode === "oldest") return a.start - b.start || a.bossName.localeCompare(b.bossName);
    if (sortMode === "duration") return a.duration - b.duration || b.start - a.start;
    if (sortMode === "dps") return (b.compDps ?? -1) - (a.compDps ?? -1) || b.start - a.start;
    if (sortMode === "encounter") return a.bossName.localeCompare(b.bossName) || b.start - a.start;
    return b.start - a.start || a.bossName.localeCompare(b.bossName);
  });
}

export function summarizeEncounters(runs: RunRecord[]): EncounterSummary[] {
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
        runsList: encounterRuns,
        ...summarizeRunSet(encounterRuns),
      };
    })
    .sort((a, b) => b.runs - a.runs || (a.wing ?? 99) - (b.wing ?? 99) || a.bossName.localeCompare(b.bossName));
}

export function summarizeRunSet(runs: RunRecord[]): RunStats {
  const kills = runs.filter((run) => run.success === true).length;
  const wipes = runs.filter((run) => run.success === false).length;
  const unknown = runs.length - kills - wipes;
  const fullClearRuns = runs.filter((run) => getRunSessionType(run) === "full-clear").length;
  const practiceRuns = runs.filter((run) => getRunSessionType(run) === "practice").length;
  const decided = kills + wipes;
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
    fullClearRuns,
    practiceRuns,
    killRate: decided ? kills / decided : null,
    totalDuration,
    averageDuration: durations.length ? totalDuration / durations.length : 0,
    bestDuration: successfulDurations.length ? Math.min(...successfulDurations) : null,
    averageCompDps: average(runs.map((run) => run.compDps).filter((value): value is number => value != null)),
  };
}

export function buildInsights(runs: RunRecord[], weeks: WeekSummary[], encounters: EncounterSummary[]): string[] {
  if (!runs.length) return [];

  const insights: string[] = [];
  const bestWeek = maxBy(
    weeks.filter((week) => week.kills + week.wipes > 0),
    (week) => week.killRate ?? 0,
  );
  const troubleEncounter = minBy(
    encounters.filter((encounter) => encounter.kills + encounter.wipes >= 3 && encounter.killRate != null),
    (encounter) => encounter.killRate ?? 1,
  );
  const mostImproved = getMostImprovedEncounter(encounters);
  const recentFastest = getRecentFastestRecord(runs);

  if (bestWeek) insights.push(`${bestWeek.weekKey} is your best week by kill rate at ${formatPercent(bestWeek.killRate)}.`);
  if (troubleEncounter) insights.push(`${troubleEncounter.bossName} needs attention: ${formatPercent(troubleEncounter.killRate)} kill rate over ${troubleEncounter.runs} runs.`);
  if (mostImproved) {
    insights.push(`${mostImproved.bossName} improved from ${formatPercent(mostImproved.before)} to ${formatPercent(mostImproved.after)} between older and newer pulls.`);
  }
  if (recentFastest) insights.push(`${recentFastest.bossName} has a recent personal best at ${formatSeconds(recentFastest.duration)}.`);

  return insights;
}

function getMostImprovedEncounter(encounters: EncounterSummary[]): { bossName: string; before: number; after: number } | null {
  let best: { bossName: string; before: number; after: number; delta: number } | null = null;

  for (const encounter of encounters) {
    const decidedRuns = [...encounter.runsList].filter((run) => run.success != null).sort((a, b) => a.start - b.start);
    if (decidedRuns.length < 4) continue;

    const midpoint = Math.floor(decidedRuns.length / 2);
    const before = summarizeRunSet(decidedRuns.slice(0, midpoint)).killRate;
    const after = summarizeRunSet(decidedRuns.slice(midpoint)).killRate;
    if (before == null || after == null) continue;

    const delta = after - before;
    if (delta > 0 && (!best || delta > best.delta)) best = { bossName: encounter.bossName, before, after, delta };
  }

  return best;
}

function getRecentFastestRecord(runs: RunRecord[]): RunRecord | null {
  const successfulRuns = [...runs].filter((run) => run.success === true && run.duration > 0).sort((a, b) => a.start - b.start);
  const bestByEncounter = new Map<string, RunRecord>();
  let recentBest: RunRecord | null = null;

  for (const run of successfulRuns) {
    const previousBest = bestByEncounter.get(run.encounterKey);
    if (!previousBest || run.duration < previousBest.duration) {
      bestByEncounter.set(run.encounterKey, run);
      recentBest = run;
    }
  }

  if (!recentBest) return null;
  const newestWeek = summarizeRunsByWeek(runs)[0]?.weekKey;
  return newestWeek && recentBest.weekKey === newestWeek ? recentBest : null;
}

export function runsToCsv(runs: RunRecord[]): string {
  const rows = [
    ["date", "week", "wing", "session_type", "encounter", "cm", "result", "duration_seconds", "comp_dps", "report"],
    ...runs.map((run) => [
      new Date(run.date).toISOString(),
      run.weekKey,
      run.wing == null ? "" : String(run.wing),
      getRunSessionType(run),
      run.bossName,
      run.isCm ? "yes" : "no",
      formatResult(run.success),
      String(run.duration),
      run.compDps == null ? "" : String(run.compDps),
      run.permalink,
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function minBy<T>(items: T[], getValue: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => (best == null || getValue(item) < getValue(best) ? item : best), undefined);
}

export function maxBy<T>(items: T[], getValue: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => (best == null || getValue(item) > getValue(best) ? item : best), undefined);
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getRunSessionType(run: RunRecord): RunSessionType {
  return run.sessionType ?? "full-clear";
}

export function formatRunSessionType(sessionType: RunSessionType): string {
  return sessionType === "full-clear" ? "Full clear" : "Practice";
}

export function formatSessionScopeLabel(sessionType: SessionTypeFilter): string {
  if (sessionType === "all") return "All sessions";
  return `${formatRunSessionType(sessionType)} sessions`;
}

export function formatResult(success: boolean | null): string {
  if (success == null) return "N/A";
  return success ? "Success" : "Fail";
}

export function getResultClass(success: boolean | null): string {
  if (success == null) return "unknown";
  return success ? "kill" : "wipe";
}

export function formatPercent(value: number | null): string {
  if (value == null) return "N/A";
  return `${Math.round(value * 100)}%`;
}

export function formatDps(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export function formatWing(wing: number | null): string {
  return wing == null ? "Unmapped" : `Wing ${wing}`;
}

export function formatWingSet(wings: number[]): string {
  if (!wings.length) return "Unmapped";
  if (wings.length === 1) return `Wing ${wings[0]}`;
  const consecutive = wings.every((wing, index) => index === 0 || wing === wings[index - 1] + 1);
  return consecutive ? `W${wings[0]}-W${wings[wings.length - 1]}` : wings.map((wing) => `W${wing}`).join(", ");
}

export function getRunStart(run: RunRecord): number {
  if (Number.isFinite(run.start) && run.start > 0) return run.start;
  const parsed = Date.parse(run.date);
  return Number.isFinite(parsed) ? parsed / 1000 : 0;
}

function getRunEnd(run: RunRecord): number {
  const start = getRunStart(run);
  if (Number.isFinite(run.end) && run.end > start) return run.end;
  return start + Math.max(0, run.duration);
}

function getNightKey(run: RunRecord): string {
  const date = new Date(getRunStart(run) * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNightLabel(key: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${key}T12:00:00`));
}

function formatShortNightLabel(key: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${key}T12:00:00`));
}

export function formatRunDate(run: RunRecord): string {
  const date = new Date(getRunStart(run) * 1000);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatPullTickDate(run: RunRecord): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(getRunStart(run) * 1000));
}

export function formatClock(unixSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(unixSeconds * 1000));
}

export function formatTimeDelta(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "No previous";
  const delta = current - previous;
  if (Math.abs(delta) < 1) return "same";
  return `${formatSeconds(Math.abs(delta))} ${delta < 0 ? "faster" : "slower"}`;
}

export function formatCountDelta(current: number, previous: number | null | undefined, betterWord: string): string {
  if (previous == null || !Number.isFinite(previous)) return "No previous";
  const delta = current - previous;
  if (delta === 0) return "same";
  return `${Math.abs(delta)} ${delta < 0 ? betterWord : "more"}`;
}

function shortBossName(name: string): string {
  return name.replace(/^Bandit Trio - /, "Trio ").replace("Vale Guardian", "VG").replace("Gorseval", "Gorse");
}
