// Expanded row content shown when a player row is clicked in the metrics table.
// Renders per-encounter stats + LineChart, and profession usage pie.
// Composes PlayerEncounterChart and ProfessionUsageChart.

import type { WeekSummary } from "../../../lib/runHistory";
import { formatDps, pluralize } from "../utils";
import { buildExpandedPlayerDetail, type PlayerComparisonRow, type PlayerEncounterColumn } from "./playerAggregation";
import { formatConsistency, formatPlayerDpsDelta, getPlayerDeltaClass } from "./playerFormat";
import { PlayerEncounterChart } from "./PlayerEncounterChart";
import { ProfessionUsageChart } from "./ProfessionUsageChart";

export function ExpandedPlayerDetail({
  row,
  currentWeek,
  encounterColumns,
}: {
  row: PlayerComparisonRow;
  currentWeek: WeekSummary;
  encounterColumns: PlayerEncounterColumn[];
}) {
  const detail = buildExpandedPlayerDetail(row, currentWeek, encounterColumns);

  return (
    <div className="grid gap-3 rounded-xl border border-line bg-base-100 p-4">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {detail.encounters.map((encounter) => (
          <article className="grid gap-3 rounded-xl border border-line bg-surface p-3" key={encounter.encounterKey}>
            <div className="grid gap-[0.35rem]">
              <div className="flex items-center gap-2">
                <strong>{encounter.label}</strong>
                {encounter.isCm ? <span className="badge badge-sm badge-outline">CM</span> : null}
              </div>
              <div className="grid gap-2 text-[0.84rem] sm:grid-cols-3">
                <div className="grid gap-[0.1rem]">
                  <span className="text-muted">{currentWeek.weekKey}</span>
                  <strong>{formatDps(encounter.currentAverage)}</strong>
                </div>
                <div className="grid gap-[0.1rem]">
                  <span className="text-muted">All-week average</span>
                  <strong>{formatDps(encounter.historyAverage)}</strong>
                </div>
                <div className="grid gap-[0.1rem]">
                  <span className="text-muted">Change</span>
                  <strong className={getPlayerDeltaClass(encounter.currentAverage, encounter.historyAverage)}>
                    {formatPlayerDpsDelta(encounter.currentAverage, encounter.historyAverage)}
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem] text-muted">
                <span>{encounter.currentPulls} current {pluralize(encounter.currentPulls, "pull")}</span>
                <span>{encounter.historyPulls} total {pluralize(encounter.historyPulls, "pull")}</span>
                <span>Consistency {formatConsistency(encounter.currentConsistency)} / {formatConsistency(encounter.historyConsistency)}</span>
              </div>
            </div>
            <PlayerEncounterChart chartRows={encounter.chartRows} />
          </article>
        ))}
      </div>

      <ProfessionUsageChart professionUsage={detail.professionUsage} />
    </div>
  );
}
