// Slim whole-week comparison strip: states the "A vs B" identity once and shows
// the week-level timing deltas (Total / Combat / Downtime / Wipes). Week selection
// lives in the WeeklySummaryGrid card picker, not here.

import { formatSeconds } from "../../../lib/format";
import { cx, panelClass, sectionHeadingClass, statGridClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import { StatCard } from "../shared";
import { formatCountDelta, formatTimeDelta } from "../utils";
import type { WeekTiming } from "./weekAggregation";

export function WeekComparisonHeader({
  selectedWeek,
  compareWeek,
  selectedTiming,
  compareTiming,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  selectedTiming: WeekTiming;
  compareTiming: WeekTiming;
}) {
  const subtitle = selectedWeek
    ? compareWeek
      ? `${selectedWeek.weekKey} vs ${compareWeek.weekKey}`
      : `${selectedWeek.weekKey} — Ctrl-click a second week to compare against`
    : "Select a week below to see its timing breakdown.";

  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Week comparison</h3>
          <p className="muted">{subtitle}</p>
        </div>
      </div>

      {selectedWeek ? (
        <div className={cx(statGridClass, "mt-2")}>
          <StatCard
            label="Total"
            value={formatSeconds(selectedTiming.totalTime)}
            detail={formatTimeDelta(selectedTiming.totalTime, compareWeek ? compareTiming.totalTime : undefined)}
          />
          <StatCard
            label="Combat"
            value={formatSeconds(selectedTiming.combatTime)}
            detail={formatTimeDelta(selectedTiming.combatTime, compareWeek ? compareTiming.combatTime : undefined)}
          />
          <StatCard
            label="Downtime"
            value={formatSeconds(selectedTiming.downtime)}
            detail={formatTimeDelta(selectedTiming.downtime, compareWeek ? compareTiming.downtime : undefined)}
          />
          <StatCard label="Wipes" value={String(selectedWeek.wipes)} detail={formatCountDelta(selectedWeek.wipes, compareWeek?.wipes, "fewer")} />
        </div>
      ) : (
        <div className="mt-2">
          <EmptyCard title="No weeks match" description="The current filters remove every saved week. Change the filters or load more run history." />
        </div>
      )}
    </div>
  );
}
