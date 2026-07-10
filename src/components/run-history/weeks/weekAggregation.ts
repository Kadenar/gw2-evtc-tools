// Pure aggregation for the Weeks tab: week timing, per-wing detail, and the
// encounter / downtime comparison rows rendered by the wing detail panels.
// No React imports — consumed by the tab shell and presentational components.

import { formatSeconds } from "../../../lib/format";
import type { RunRecord } from "../../../lib/runHistory";
import type { EncounterSummary, RaidNightSummary } from "../types";
import {
  buildRaidNightSummaries,
  buildTimelineRows,
  buildWeekWingRows,
  compareEncounterSummaries,
  formatTimeDelta,
  shortEncounterName,
  summarizeEncounters,
  summarizeRunSet,
} from "../utils";

export type WeekTiming = { combatTime: number; downtime: number; totalTime: number };
export type WeekWingRow = ReturnType<typeof buildWeekWingRows>[number];
export type WingWeekDetail = ReturnType<typeof buildWingWeekDetail>;
export type EncounterComparisonRow = ReturnType<typeof buildEncounterComparisonRows>[number];
export type DowntimeRow = ReturnType<typeof buildDowntimeRows>[number];

export function summarizeWeekTiming(runs: RunRecord[]): WeekTiming {
  return buildRaidNightSummaries(runs).reduce(
    (summary, night) => ({
      combatTime: summary.combatTime + night.combatTime,
      downtime: summary.downtime + night.downtime,
      totalTime: summary.totalTime + night.totalTime,
    }),
    { combatTime: 0, downtime: 0, totalTime: 0 },
  );
}

export function buildWingWeekDetail(runs: RunRecord[], wing: number | null) {
  if (wing == null) return null;

  const wingRuns = runs.filter((run) => run.wing === wing);
  if (!wingRuns.length) return null;

  const encounterStats = summarizeRunSet(wingRuns);
  const encounterLabel = summarizeEncounters(wingRuns)
    .sort(compareEncounterSummaries)
    .map((encounter) => shortEncounterName(encounter.bossName))
    .join(", ");

  return {
    wing,
    runList: wingRuns,
    encounters: summarizeEncounters(wingRuns).sort(compareEncounterSummaries),
    raidNights: buildRaidNightSummaries(wingRuns).sort((left, right) => left.start - right.start),
    encounterLabel: encounterLabel || "No encounters logged",
    ...encounterStats,
    ...summarizeWeekTiming(wingRuns),
  };
}

export function buildEncounterComparisonRows(current: EncounterSummary[], previous: EncounterSummary[]) {
  const currentByKey = new Map(current.map((encounter) => [encounter.encounterKey, encounter]));
  const previousByKey = new Map(previous.map((encounter) => [encounter.encounterKey, encounter]));
  const all = Array.from(new Set([...currentByKey.keys(), ...previousByKey.keys()]))
    .map((encounterKey) => currentByKey.get(encounterKey) ?? previousByKey.get(encounterKey))
    .filter((encounter): encounter is EncounterSummary => encounter != null)
    .sort(compareEncounterSummaries);

  return all.map((encounter) => {
    const currentEncounter = currentByKey.get(encounter.encounterKey) ?? null;
    const previousEncounter = previousByKey.get(encounter.encounterKey) ?? null;
    return {
      encounterKey: encounter.encounterKey,
      bossName: encounter.bossName,
      isCm: encounter.isCm,
      current: currentEncounter,
      previous: previousEncounter,
      change: formatTimeDelta(getComparableEncounterDuration(currentEncounter), getComparableEncounterDuration(previousEncounter)),
    };
  });
}

export function buildDowntimeRows(current: RaidNightSummary[], previous: RaidNightSummary[]) {
  return Array.from({ length: Math.max(current.length, previous.length) }, (_, index) => {
    const currentNight = current[index] ?? null;
    const previousNight = previous[index] ?? null;

    return {
      key: `${currentNight?.key ?? "none"}:${previousNight?.key ?? "none"}:${index}`,
      label: currentNight?.label ?? previousNight?.label ?? `Night ${index + 1}`,
      current: currentNight,
      previous: previousNight,
      change: formatTimeDelta(currentNight?.downtime, previousNight?.downtime),
      note: largestGapLabel(currentNight) ?? largestGapLabel(previousNight) ?? "No downtime segments",
    };
  }).filter((row) => row.current || row.previous);
}

function largestGapLabel(night: RaidNightSummary | null): string | null {
  if (!night) return null;

  const gap = buildTimelineRows(night)
    .filter((row): row is Extract<ReturnType<typeof buildTimelineRows>[number], { type: "gap" }> => row.type === "gap")
    .sort((left, right) => right.seconds - left.seconds)[0];

  if (!gap) return "No downtime segments";
  return `${gap.label} (${formatSeconds(gap.seconds)})`;
}

export function getComparableEncounterDuration(encounter: EncounterSummary | null): number | null {
  if (!encounter) return null;
  return encounter.bestDuration ?? (encounter.averageDuration > 0 ? encounter.averageDuration : null);
}
