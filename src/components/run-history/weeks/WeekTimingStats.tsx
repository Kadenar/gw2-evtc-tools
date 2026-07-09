// Selected-vs-compare week timing stat cards (total / combat / downtime / wipes).

import { formatSeconds } from "../../../lib/format";
import { panelClass, sectionHeadingClass, statGridClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import { StatCard } from "../shared";
import { formatCountDelta, formatTimeDelta } from "../utils";
import type { WeekTiming } from "./weekAggregation";

export function WeekTimingStats({
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
  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">{selectedWeek ? `Comparing ${selectedWeek.weekKey}` : "Week comparison"}</h3>
          <p className="muted">{compareWeek ? `Against ${compareWeek.weekKey}` : "Select a second week to compare against."}</p>
        </div>
      </div>
      {selectedWeek ? (
        <div className={statGridClass}>
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
          <StatCard
            label="Wipes"
            value={String(selectedWeek.wipes)}
            detail={formatCountDelta(selectedWeek.wipes, compareWeek?.wipes, "fewer")}
          />
        </div>
      ) : (
        <EmptyCard title="No weeks match" description="The current filters remove every saved week. Change the filters or load more run history." />
      )}
    </div>
  );
}
