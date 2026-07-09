// Data aggregation and types for player metrics in the Players tab.
// Responsible for: types (PlayerRunEntry, AggregatedPlayer, PlayerComparisonRow, etc.),
// constants (PLAYER_USAGE_COLORS), and pure data aggregation functions.
// These are framework-free and testable without React.

import { hasCurrentPhaseData, type RunRecord, type WeekSummary } from "../../../lib/runHistory";
import type { EncounterSummary } from "../types";
import { average, compareEncounterSummaries, getRunStart, shortEncounterName } from "../utils";
import { calculateConsistency, formatHistoryTick } from "./playerFormat";

export type PlayerRunEntry = {
  runId: string;
  encounterKey: string;
  encounter: string;
  dps: number;
  profession: string | null;
  group: number | null;
  start: number;
  weekKey: string;
};

export type AggregatedPlayer = {
  player: { name: string; account: string | null; professions: string[]; subgroup: number | null };
  dpsValues: number[];
  encounterValues: Map<string, { encounter: string; values: number[] }>;
  averageTargetDps: number | null;
  encounterMap: Map<string, number | null>;
  professionCounts: Map<string, number>;
  runEntries: PlayerRunEntry[];
};

export type PlayerAggregate = {
  averageTargetDps: number | null;
  subgroup: number | null;
  encounterMap: Map<string, number | null>;
  professionCounts: Map<string, number>;
  runEntries: PlayerRunEntry[];
};

export type PlayerComparisonRow = {
  key: string;
  name: string;
  account: string | null;
  subgroup: number | null;
  professions: string[];
  current: PlayerAggregate | null;
  average: PlayerAggregate | null;
};

export type PlayerEncounterColumn = {
  encounterKey: string;
  label: string;
  isCm: boolean;
};

export type ProfessionUsageRow = {
  profession: string;
  runs: number;
  share: number;
  color: string;
};

export type PlayerChartRow = {
  label: string;
  dps: number;
  profession: string | null;
  weekKey: string;
  encounter: string;
  isCurrentWeek: boolean;
};

export type PlayerDetailEncounter = {
  encounterKey: string;
  label: string;
  isCm: boolean;
  currentAverage: number | null;
  historyAverage: number | null;
  currentConsistency: number | null;
  historyConsistency: number | null;
  currentPulls: number;
  historyPulls: number;
  chartRows: PlayerChartRow[];
};

export type PlayerExpandedDetail = {
  encounters: PlayerDetailEncounter[];
  professionUsage: ProfessionUsageRow[];
};

export type PlayerAverageTable = {
  encounterColumns: PlayerEncounterColumn[];
  rows: PlayerComparisonRow[];
};

export const PLAYER_USAGE_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-secondary)",
  "var(--color-error)",
] as const;

const EXCLUDED_PLAYER_METRIC_ENCOUNTER_NAMES = new Set([
  "Spirit Race",
  "Bandit Trio - Berg",
  "Bandit Trio - Zane",
  "Bandit Trio - Narella",
  "Escort / McLeod the Silent",
  "Twisted Castle",
  "Desmina Escort / River of Souls",
]);
const EXCLUDED_PLAYER_METRIC_PROFESSIONS = new Set(["npc", "gadget"]);

export function isEncounterExcludedFromPlayerMetrics(name: string): boolean {
  return EXCLUDED_PLAYER_METRIC_ENCOUNTER_NAMES.has(name);
}

export function buildPlayerAverageTable(
  currentRuns: RunRecord[],
  historyRuns: RunRecord[],
  currentEncounters: EncounterSummary[],
  historyEncounters: EncounterSummary[],
): PlayerAverageTable {
  // Aggregate DPS metrics per player from current week and all-time history.
  const currentByPlayer = aggregatePlayers(currentRuns);
  const historyByPlayer = aggregatePlayers(historyRuns);

  // Build encounter columns: union of all encounters (current + history), excluding certain names.
  const currentByEncounter = new Map(
    currentEncounters.filter((encounter) => !isEncounterExcludedFromPlayerMetrics(encounter.bossName)).map((encounter) => [encounter.encounterKey, encounter]),
  );
  const historyByEncounter = new Map(
    historyEncounters.filter((encounter) => !isEncounterExcludedFromPlayerMetrics(encounter.bossName)).map((encounter) => [encounter.encounterKey, encounter]),
  );
  // Prefer current encounters; fall back to history if not in current week. Sort canonically, format labels.
  const encounterColumns = Array.from(new Set([...currentByEncounter.keys(), ...historyByEncounter.keys()]))
    .map((encounterKey) => currentByEncounter.get(encounterKey) ?? historyByEncounter.get(encounterKey))
    .filter((encounter): encounter is EncounterSummary => encounter != null)
    .sort(compareEncounterSummaries)
    .map((encounter) => ({
      encounterKey: encounter.encounterKey,
      label: shortEncounterName(encounter.bossName),
      isCm: encounter.isCm,
    }));

  // Collect unique player keys from both current and history.
  const keys = Array.from(new Set([...currentByPlayer.keys(), ...historyByPlayer.keys()]));

  // Build rows: each player with current week aggregate + all-time average. Null current/average when data missing.
  const rows = keys
    .map((key): PlayerComparisonRow | null => {
      const current = currentByPlayer.get(key) ?? null;
      const history = historyByPlayer.get(key) ?? null;
      // Prefer history player info (more complete); fall back to current.
      const player = history?.player ?? current?.player;
      if (!player) return null;

      return {
        key,
        name: player.name,
        account: player.account,
        subgroup: current?.player.subgroup ?? history?.player.subgroup ?? null,
        professions: player.professions,
        // Extract only the aggregate data (not full run entries, which the table doesn't need).
        current: current
          ? {
            averageTargetDps: current.averageTargetDps,
            subgroup: current.player.subgroup,
            encounterMap: current.encounterMap,
            professionCounts: current.professionCounts,
            runEntries: current.runEntries,
          }
          : null,
        average: history
          ? {
            averageTargetDps: history.averageTargetDps,
            subgroup: history.player.subgroup,
            encounterMap: history.encounterMap,
            professionCounts: history.professionCounts,
            runEntries: history.runEntries,
          }
          : null,
      };
    })
    .filter((row): row is PlayerComparisonRow => row != null)
    // Sort by subgroup first, then alphabetically within subgroup.
    .sort(
      (left, right) =>
        compareSubgroups(left.subgroup, right.subgroup)
        || compareSubgroups(left.current?.subgroup ?? null, right.current?.subgroup ?? null)
        ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        || (left.account ?? "").localeCompare(right.account ?? "", undefined, { sensitivity: "base" }),
    );

  return { encounterColumns, rows };
}

function aggregatePlayers(runs: RunRecord[]) {
  const byPlayer = new Map<string, AggregatedPlayer>();

  // First pass: collect raw DPS values and metadata per player.
  runs
    .slice()
    .sort((left, right) => getRunStart(left) - getRunStart(right))
    .forEach((run) => {
      // Skip excluded encounters (e.g., trash, escort, solo challenges).
      if (isEncounterExcludedFromPlayerMetrics(run.bossName)) return;
      // Skip runs without phase data (player DPS requires per-phase breakdowns).
      if (!run.phaseData || !hasCurrentPhaseData(run.phaseData)) return;

      run.phaseData.players.forEach((player) => {
        // Gadgets/NPCs in the cached phase payload generally lack a real GW2 account
        // or come through as synthetic fallback rows. Exclude them from player metrics.
        if (!isRealPlayerMetric(player)) return;

        // Key by account (if available) to group alts; fall back to character name.
        const key = player.account ?? player.name;
        const dps = player.targetDps ?? player.squadDps;
        if (dps == null) return;

        // Get or initialize player's aggregation bucket.
        const existing = byPlayer.get(key) ?? {
          player: { name: player.name, account: player.account, professions: [] as string[], subgroup: player.group },
          dpsValues: [],
          encounterValues: new Map<string, { encounter: string; values: number[] }>(),
          averageTargetDps: null,
          encounterMap: new Map<string, number | null>(),
          professionCounts: new Map<string, number>(),
          runEntries: [] as PlayerRunEntry[],
        };

        // Accumulate unique professions (class/build).
        if (player.profession && !existing.player.professions.includes(player.profession)) {
          existing.player.professions.push(player.profession);
        }
        if (player.group != null) {
          existing.player.subgroup = player.group;
        }
        // Track profession counts for pie chart data later.
        if (player.profession) {
          existing.professionCounts.set(player.profession, (existing.professionCounts.get(player.profession) ?? 0) + 1);
        }

        // Collect all DPS values for overall average.
        existing.dpsValues.push(dps);

        // Per-encounter DPS list (needed for charts and consistency calculation).
        const encounterEntry = existing.encounterValues.get(run.encounterKey) ?? {
          encounter: shortEncounterName(run.bossName),
          values: [],
        };
        encounterEntry.values.push(dps);
        existing.encounterValues.set(run.encounterKey, encounterEntry);

        // Store full run context for expanded detail view (dates, professions, pull timings).
        existing.runEntries.push({
          runId: run.id,
          encounterKey: run.encounterKey,
          encounter: shortEncounterName(run.bossName),
          dps,
          profession: player.profession,
          group: player.group,
          start: getRunStart(run),
          weekKey: run.weekKey,
        });
        byPlayer.set(key, existing);
      });
    });

  // Second pass: compute averages and finalize maps.
  for (const [key, value] of byPlayer.entries()) {
    // Per-encounter average: needed for table cells and delta calculations.
    const encounterEntries = Array.from(value.encounterValues.entries())
      .map(([encounterKey, entry]) => ({ encounterKey, dps: average(entry.values) }))
      .filter((entry) => entry.dps != null);

    byPlayer.set(key, {
      ...value,
      // Overall wing DPS average (used in wing avg column and in deltas).
      averageTargetDps: average(value.dpsValues),
      // Map for fast lookup of per-encounter averages by encounterKey.
      encounterMap: new Map(encounterEntries.map((entry) => [entry.encounterKey, entry.dps])),
      // Sort run entries chronologically for chart x-axis ordering.
      runEntries: [...value.runEntries].sort((left, right) => left.start - right.start),
    });
  }

  return byPlayer;
}

function isRealPlayerMetric(player: { name: string; account: string | null; profession: string | null }): boolean {
  if (!player.account?.trim()) return false;
  if (!player.profession?.trim()) return false;
  if (EXCLUDED_PLAYER_METRIC_PROFESSIONS.has(player.profession.trim().toLowerCase())) return false;
  if (/^Player \d+$/i.test(player.name.trim())) return false;
  return true;
}

function compareSubgroups(left: number | null, right: number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

export function buildExpandedPlayerDetail(
  row: PlayerComparisonRow,
  currentWeek: WeekSummary,
  encounterColumns: PlayerEncounterColumn[],
): PlayerExpandedDetail {
  // Profession pie data (aggregated across all history).
  const professionUsage = buildProfessionUsage(row.average?.professionCounts);

  // For each table column (encounter), extract current week + all-time data.
  const encounters = encounterColumns
    .map((column): PlayerDetailEncounter | null => {
      // Filter run entries for this encounter from current week and history.
      const currentEntries = row.current?.runEntries.filter((entry) => entry.encounterKey === column.encounterKey) ?? [];
      const historyEntries = row.average?.runEntries.filter((entry) => entry.encounterKey === column.encounterKey) ?? [];

      // Skip encounters with no pulls.
      if (!historyEntries.length && !currentEntries.length) return null;

      return {
        encounterKey: column.encounterKey,
        label: column.label,
        isCm: column.isCm,
        // Current week average DPS (null if no pulls).
        currentAverage: average(currentEntries.map((entry) => entry.dps)),
        // All-time average DPS.
        historyAverage: average(historyEntries.map((entry) => entry.dps)),
        // Standard deviation / mean (coefficient of variation) for consistency metric.
        currentConsistency: calculateConsistency(currentEntries.map((entry) => entry.dps)),
        historyConsistency: calculateConsistency(historyEntries.map((entry) => entry.dps)),
        // Pull counts for display.
        currentPulls: currentEntries.length,
        historyPulls: historyEntries.length,
        // Chart data: sequence of all-time pulls with formatted labels and week context.
        chartRows: historyEntries.map((entry, index) => ({
          label: formatHistoryTick(entry.start, index, historyEntries.length),
          dps: entry.dps,
          profession: entry.profession,
          weekKey: entry.weekKey,
          encounter: entry.encounter,
          isCurrentWeek: entry.weekKey === currentWeek.weekKey,
        })),
      };
    })
    .filter((encounter): encounter is PlayerDetailEncounter => encounter != null);

  return { encounters, professionUsage };
}

function buildProfessionUsage(counts: Map<string, number> | undefined): ProfessionUsageRow[] {
  // Consolidate profession run counts (e.g., if player ran Guardian 5 times, Mesmer 3 times).
  const merged = new Map<string, number>();

  for (const [profession, runs] of counts ?? []) {
    merged.set(profession, (merged.get(profession) ?? 0) + runs);
  }

  // Compute total and share for pie chart.
  const total = Array.from(merged.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(merged.entries())
    // Sort descending by run count, then alphabetically (for stable legend order).
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([profession, runs], index) => ({
      profession,
      runs,
      // Share as decimal (0–1).
      share: total > 0 ? runs / total : 0,
      // Cycle through predefined colors for pie slices.
      color: PLAYER_USAGE_COLORS[index % PLAYER_USAGE_COLORS.length],
    }));
}
