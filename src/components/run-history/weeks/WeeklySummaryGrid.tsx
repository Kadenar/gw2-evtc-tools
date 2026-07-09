// Grid of per-week summary cards below the comparison panels.

import { formatSeconds } from "../../../lib/format";
import { cx, panelClass, sectionHeadingClass } from "../../../lib/ui";
import type { RunRecord, WeekSummary } from "../../../lib/runHistory";
import { formatPercent } from "../utils";
import { summarizeWeekTiming } from "./weekAggregation";
import { formatWeekSummaryLabel } from "./weekFormat";

export function WeeklySummaryGrid({
  weeks,
  runsByWeek,
  selectedWeek,
  compareWeek,
}: {
  weeks: WeekSummary[];
  runsByWeek: Map<string, RunRecord[]>;
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
}) {
  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <h3 className="mb-3 mt-0 text-[1.25rem]">Weekly summaries</h3>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {weeks.map((week) => (
          <WeekSummaryCard
            week={week}
            runs={runsByWeek.get(week.weekKey) ?? []}
            isSelected={selectedWeek?.weekKey === week.weekKey}
            isCompare={compareWeek?.weekKey === week.weekKey}
            key={week.weekKey}
          />
        ))}
      </div>
    </div>
  );
}

function WeekSummaryCard({
  week,
  runs,
  isSelected,
  isCompare,
}: {
  week: WeekSummary;
  runs: RunRecord[];
  isSelected: boolean;
  isCompare: boolean;
}) {
  const timing = summarizeWeekTiming(runs);
  const weekLabel = formatWeekSummaryLabel(week.weekKey, runs);

  return (
    <article
      className={cx(
        "grid gap-[0.8rem] rounded-xl border border-line bg-surface p-[0.85rem]",
        isSelected && "border-warning/45 bg-warning/10",
        isCompare && "border-info/40 bg-info/10",
        isSelected && isCompare && "border-primary/50 bg-primary/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{weekLabel}</span>
          <h4 className="mb-0 mt-[0.05rem] text-[1.05rem]">{week.runs} saved runs</h4>
        </div>
        <div className="grid justify-items-end gap-[0.35rem]">
          <span className="badge badge-outline">{formatPercent(week.killRate)} kill rate</span>
          {isSelected ? <span className="text-[0.82rem] font-black uppercase text-accent-2 tracking-[0.04em]">Selected</span> : null}
          {isCompare ? <span className="text-[0.82rem] font-black uppercase text-accent-2 tracking-[0.04em]">Compare</span> : null}
        </div>
      </div>

      <div className="history-bar" aria-label={`Kill rate ${formatPercent(week.killRate)}`}>
        <span style={{ width: `${Math.round((week.killRate ?? 0) * 100)}%` }} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-[0.45rem] text-[0.92rem] text-muted">
        <span>Total {formatSeconds(timing.totalTime)}</span>
        <span>Combat {formatSeconds(timing.combatTime)}</span>
        <span>Downtime {formatSeconds(timing.downtime)}</span>
        <span>Wipes {week.wipes}</span>
      </div>
    </article>
  );
}
