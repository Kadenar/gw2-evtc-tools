import { formatSeconds } from "../../lib/format";
import { cx, panelClass, sectionHeadingClass } from "../../lib/ui";
import type { HistoryFilterActions, HistoryFilters, RaidNightSummary } from "./types";
import { formatRunSessionType, formatWingSet } from "./utils";
import { HistoryFilterPanel, RaidNightDetail } from "./shared";

export function RunsTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  filteredRaidNights,
  selectedNight,
  onSelectNight,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  filteredRaidNights: RaidNightSummary[];
  selectedNight: RaidNightSummary | null;
  onSelectNight: (nightKey: string) => void;
}) {
  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Runs"
        showWeekFilter={false}
        showSortFilter={false}
      />

      <div className="grid gap-4 [grid-template-columns:minmax(220px,0.65fr)_minmax(0,1.35fr)] max-nav:grid-cols-1">
        <div className={panelClass}>
          <div className={sectionHeadingClass}>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Raid runs</h3>
          </div>
          <div className="grid gap-[0.65rem]">
            {filteredRaidNights.map((night) => (
              <button
                type="button"
                className={cx(
                  "grid gap-[0.1rem] rounded-[0.7rem] border border-transparent bg-transparent px-[0.8rem] py-[0.7rem] text-left text-fg hover:border-primary/45 hover:bg-primary/10",
                  selectedNight?.key === night.key && "border-primary/55 bg-primary/12 text-accent-2 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]",
                )}
                aria-pressed={selectedNight?.key === night.key}
                onClick={() => onSelectNight(night.key)}
                key={night.key}
              >
                <span className="text-muted">{night.label}</span>
                <strong className={selectedNight?.key === night.key ? "text-accent-2" : undefined}>
                  {formatWingSet(night.wings)} - {formatRunSessionType(night.sessionType)}
                </strong>
                <small className="text-muted">{formatSeconds(night.totalTime)} - {night.wipes} wipes - {formatSeconds(night.downtime)} downtime</small>
              </button>
            ))}
          </div>
        </div>

        <div className={panelClass}>
          <div className={sectionHeadingClass}>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Selected raid night{selectedNight ? `: ${selectedNight.label}` : ""}</h3>
          </div>
          {selectedNight ? <RaidNightDetail night={selectedNight} /> : <p className="muted">No raid night matches the current filters.</p>}
        </div>
      </div>
    </>
  );
}
