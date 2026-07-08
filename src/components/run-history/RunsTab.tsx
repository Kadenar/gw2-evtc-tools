import { formatSeconds } from "../../lib/format";
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

      <div className="runs-split">
        <div className="panel">
          <div className="section-heading">
            <h3>Raid runs</h3>
          </div>
          <div className="raid-night-list">
            {filteredRaidNights.map((night) => (
              <button type="button" className={selectedNight?.key === night.key ? "active" : ""} onClick={() => onSelectNight(night.key)} key={night.key}>
                <span>{night.label}</span>
                <strong>{formatWingSet(night.wings)} - {formatRunSessionType(night.sessionType)}</strong>
                <small>{formatSeconds(night.totalTime)} - {night.wipes} wipes - {formatSeconds(night.downtime)} downtime</small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <h3>Selected raid night{selectedNight ? `: ${selectedNight.label}` : ""}</h3>
          </div>
          {selectedNight ? <RaidNightDetail night={selectedNight} /> : <p className="muted">No raid night matches the current filters.</p>}
        </div>
      </div>
    </>
  );
}
