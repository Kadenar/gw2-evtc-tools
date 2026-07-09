// Formatters for the Weeks tab. Pure string helpers — no React.

import { pluralize } from "../../../lib/format";
import type { RunRecord } from "../../../lib/runHistory";
import { getRunStart } from "../utils";
import type { EncounterSummary } from "../types";

export type DetailTab = "overview" | "encounters" | "downtime";

// Constructed once and reused; Intl.* constructors are relatively expensive.
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });

export function formatEncounterRecord(encounter: EncounterSummary | null): string {
  if (!encounter) return "N/A";
  return `${encounter.kills} ${pluralize(encounter.kills, "kill")} / ${encounter.wipes} ${pluralize(encounter.wipes, "wipe")}`;
}

export function formatDetailTabLabel(tab: DetailTab): string {
  if (tab === "overview") return "Overview";
  if (tab === "encounters") return "Encounters";
  return "Downtime";
}

export function formatWeekSummaryLabel(weekKey: string, runs: RunRecord[]): string {
  if (!runs.length) return weekKey;

  const sortedRuns = [...runs].sort((left, right) => getRunStart(left) - getRunStart(right));
  const firstDate = new Date(getRunStart(sortedRuns[0]) * 1000);
  const lastDate = new Date(getRunStart(sortedRuns[sortedRuns.length - 1]) * 1000);

  const firstMonth = monthFormatter.format(firstDate);
  const lastMonth = monthFormatter.format(lastDate);
  const firstDay = dayFormatter.format(firstDate);
  const lastDay = dayFormatter.format(lastDate);

  let dateLabel = `${firstMonth} ${firstDay}`;
  if (firstDate.toDateString() !== lastDate.toDateString()) {
    dateLabel = firstMonth === lastMonth ? `${firstMonth} ${firstDay}-${lastDay}` : `${firstMonth} ${firstDay}-${lastMonth} ${lastDay}`;
  }

  return `${weekKey} - ${dateLabel}`;
}
