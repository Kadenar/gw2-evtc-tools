import type { RunRecord } from "../../lib/runHistory";
import type { HistoryFilterActions, HistoryFilters } from "./types";
import { HistoryFilterPanel, RunCard } from "./shared";

export function ManageRunsTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  sortedRuns,
  selectedRunIds,
  isWorking,
  allVisibleSelected,
  onToggleVisibleSelection,
  onDeleteSelected,
  onToggleRunSelection,
  onSelectEncounter,
  onDeleteRun,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  sortedRuns: RunRecord[];
  selectedRunIds: string[];
  isWorking: boolean;
  allVisibleSelected: boolean;
  onToggleVisibleSelection: () => void;
  onDeleteSelected: () => void;
  onToggleRunSelection: (id: string) => void;
  onSelectEncounter: (run: RunRecord) => void;
  onDeleteRun: (run: RunRecord) => void;
}) {
  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Manage pulls"
      />

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Individual pulls</h3>
            <p className="muted">
              {sortedRuns.length} visible, {selectedRunIds.length} selected.
            </p>
          </div>
          <div className="inline-actions">
            <button type="button" className="btn btn-sm" disabled={!sortedRuns.length} onClick={onToggleVisibleSelection}>
              {allVisibleSelected ? "Unselect visible" : "Select visible"}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={!selectedRunIds.length || isWorking} onClick={onDeleteSelected}>
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
    </>
  );
}
