// Wing picker for the week comparison. Selecting a wing drives the detail panel;
// timing lives in the detail panel's overview, not here.

import { ChevronRight } from "lucide-react";
import { cx, panelClass, sectionHeadingClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import { formatWing } from "../utils";
import type { WeekWingRow } from "./weekAggregation";

export function WingPerformanceTable({
  selectedWeek,
  rows,
  selectedWing,
  onSelectWing,
}: {
  selectedWeek: WeekSummary | null;
  rows: WeekWingRow[];
  selectedWing: number | null;
  onSelectWing: (wing: number) => void;
}) {
  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Wings</h3>
          <p className="muted">{selectedWeek ? "Pick a wing to inspect encounter, timing, and downtime detail." : "Select a week to compare wing performance."}</p>
        </div>
      </div>
      {selectedWeek ? (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const active = selectedWing === row.wing;
            const missing = row.current == null;
            return (
              <li key={row.wing}>
                <button
                  type="button"
                  className={cx(
                    "group flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    active ? "border-primary bg-primary/8" : "border-base-300 hover:bg-primary/8",
                  )}
                  aria-pressed={active}
                  onClick={() => onSelectWing(row.wing)}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{formatWing(row.wing)}</span>
                    {row.coverageNote ? <span className="muted text-xs">{row.coverageNote}</span> : missing ? <span className="muted text-xs">No data this week</span> : null}
                  </span>
                  <ChevronRight className={cx("size-4 transition-opacity", active ? "opacity-70" : "opacity-0 group-hover:opacity-60")} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyCard title="No week selected" description="Pick a saved week to compare wing performance." />
      )}
    </div>
  );
}
