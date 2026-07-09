// Week comparison controls: selected-week / compare-against selectors plus swap.

import { compactFieldClass, cx, fieldClass, panelClass, sectionHeadingClass, swapButtonClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { AppSelect } from "../../ui/app-select";

type Option = { value: string; label: string };

export function WeekComparisonControls({
  selectedWeekKey,
  compareWeekKey,
  selectedWeek,
  compareWeek,
  selectedWeekOptions,
  compareWeekOptions,
  onSelectedChange,
  onCompareChange,
}: {
  selectedWeekKey: string;
  compareWeekKey: string;
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  selectedWeekOptions: Option[];
  compareWeekOptions: Option[];
  onSelectedChange: (value: string) => void;
  onCompareChange: (value: string) => void;
}) {
  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Week comparison</h3>
          <p className="muted">Choose the saved weeks to compare.</p>
        </div>
      </div>
      <div className="grid items-end gap-[0.9rem] grid-cols-[minmax(0,1fr)_minmax(140px,160px)_minmax(0,1fr)] max-nav:grid-cols-1">
        <label className={cx(fieldClass, compactFieldClass, "m-0 max-w-none")}>
          <span className="text-muted">Selected week</span>
          <AppSelect value={selectedWeekKey} onValueChange={onSelectedChange} options={selectedWeekOptions} />
        </label>
        <div className={cx(fieldClass, "m-0")}>
          <span className="text-muted">Swap</span>
          <button
            type="button"
            className={swapButtonClass}
            disabled={!selectedWeek || !compareWeek}
            onClick={() => {
              if (!selectedWeek || !compareWeek) return;
              onSelectedChange(compareWeek.weekKey);
              onCompareChange(selectedWeek.weekKey);
            }}
            aria-label="Swap selected and comparison weeks"
          >
            Swap weeks
          </button>
        </div>
        <label className={cx(fieldClass, compactFieldClass, "m-0 max-w-none")}>
          <span className="text-muted">Compare against</span>
          <AppSelect value={compareWeekKey} onValueChange={onCompareChange} options={compareWeekOptions} />
        </label>
      </div>
    </div>
  );
}
