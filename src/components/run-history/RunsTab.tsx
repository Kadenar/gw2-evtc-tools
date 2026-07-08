import { formatSeconds } from "../../lib/format";
import type { RunRecord } from "../../lib/runHistory";
import type { HistoryFilterActions, HistoryFilters, RaidNightSummary } from "./types";
import { formatRunSessionType, formatWingSet } from "./utils";
import { HistoryFilterPanel, RaidNightDetail, RunCard } from "./shared";

export function RunsTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  filteredRaidNights,
  selectedNight,
  sortedRuns,
  selectedRunIds,
  isWorking,
  allVisibleSelected,
  onSelectNight,
  onToggleVisibleSelection,
  onDeleteSelected,
  onToggleRunSelection,
  onSelectEncounter,
  onDeleteRun,
  onExportCsv,
  onExportJson,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  filteredRaidNights: RaidNightSummary[];
  selectedNight: RaidNightSummary | null;
  sortedRuns: RunRecord[];
  selectedRunIds: string[];
  isWorking: boolean;
  allVisibleSelected: boolean;
  onSelectNight: (nightKey: string) => void;
  onToggleVisibleSelection: () => void;
  onDeleteSelected: () => void;
  onToggleRunSelection: (id: string) => void;
  onSelectEncounter: (run: RunRecord) => void;
  onDeleteRun: (run: RunRecord) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}) {
  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Runs"
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
            <h3>Selected run{selectedNight ? `: ${selectedNight.label}` : ""}</h3>
          </div>
          {selectedNight ? <RaidNightDetail night={selectedNight} /> : <p className="muted">No raid night matches the current filters.</p>}
        </div>
      </div>

      <SavedRunsPanel
        sortedRuns={sortedRuns}
        selectedRunIds={selectedRunIds}
        isWorking={isWorking}
        allVisibleSelected={allVisibleSelected}
        onToggleVisibleSelection={onToggleVisibleSelection}
        onDeleteSelected={onDeleteSelected}
        onToggleRunSelection={onToggleRunSelection}
        onSelectEncounter={onSelectEncounter}
        onDeleteRun={onDeleteRun}
        onExportCsv={onExportCsv}
        onExportJson={onExportJson}
      />
    </>
  );
}

function SavedRunsPanel({
  sortedRuns,
  selectedRunIds,
  isWorking,
  allVisibleSelected,
  onToggleVisibleSelection,
  onDeleteSelected,
  onToggleRunSelection,
  onSelectEncounter,
  onDeleteRun,
  onExportCsv,
  onExportJson,
}: {
  sortedRuns: RunRecord[];
  selectedRunIds: string[];
  isWorking: boolean;
  allVisibleSelected: boolean;
  onToggleVisibleSelection: () => void;
  onDeleteSelected: () => void;
  onToggleRunSelection: (id: string) => void;
  onSelectEncounter: (run: RunRecord) => void;
  onDeleteRun: (run: RunRecord) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}) {
  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>Individual pulls</h3>
          <p className="muted">
            {sortedRuns.length} visible, {selectedRunIds.length} selected.
          </p>
        </div>
        <div className="inline-actions">
          <button type="button" className="secondary" disabled={!sortedRuns.length} onClick={onExportCsv}>
            Export CSV
          </button>
          <button type="button" className="secondary" disabled={!sortedRuns.length} onClick={onExportJson}>
            Export JSON
          </button>
          <button type="button" className="secondary" disabled={!sortedRuns.length} onClick={onToggleVisibleSelection}>
            {allVisibleSelected ? "Unselect visible" : "Select visible"}
          </button>
          <button type="button" className="ghost" disabled={!selectedRunIds.length || isWorking} onClick={onDeleteSelected}>
            Delete selected
          </button>
        </div>
      </div>
      {sortedRuns.length ? (
        <div className="run-card-list">
          {sortedRuns.map((run) => (
            <RunCard
              run={run}
              selected={selectedRunIds.includes(run.id)}
              disabled={isWorking}
              onToggleSelected={() => onToggleRunSelection(run.id)}
              onSelectEncounter={() => onSelectEncounter(run)}
              onDelete={() => onDeleteRun(run)}
              key={run.id}
            />
          ))}
        </div>
      ) : (
        <p className="muted">No runs match the current filters.</p>
      )}
    </div>
  );
}
