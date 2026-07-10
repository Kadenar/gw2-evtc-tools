import { useEffect, useMemo, useState } from "react";
import { compactFieldClass, cx, fieldClass, panelClass, sectionHeadingClass, statGridClass, tableWrapClass } from "../../lib/ui";
import { hasCurrentPhaseData, summarizeRunsByWeek, type RunRecord } from "../../lib/runHistory";
import { EmptyCard } from "../ui/empty-card";
import { AppSelect } from "../ui/app-select";
import { HistoryFilterPanel, StatCard } from "./shared";
import type { HistoryFilterActions, HistoryFilters } from "./types";
import { filterRuns, formatWing, pluralize, summarizeEncounters } from "./utils";
import { buildPlayerAverageTable } from "./players/playerAggregation";
import { PlayerMetricsTable } from "./players/PlayerMetricsTable";

export function PlayersTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  runs,
  onEnsureRunPhaseData,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  runs: RunRecord[];
  onEnsureRunPhaseData: (runs: RunRecord[]) => void;
}) {
  const [selectedWingValue, setSelectedWingValue] = useState<string>("none");
  const [hideMissingCurrentWeek, setHideMissingCurrentWeek] = useState(true);

  const metricRuns = useMemo(
    () =>
      filterRuns(runs, {
        query: filters.query,
        weekFilter: "all",
        wingFilter: "all",
        resultFilter: filters.resultFilter,
        cmFilter: filters.cmFilter,
        sessionTypeFilter: filters.sessionTypeFilter,
      }),
    [filters.cmFilter, filters.query, filters.resultFilter, filters.sessionTypeFilter, runs],
  );
  const metricWingOptions = useMemo(
    () => Array.from(new Set(metricRuns.map((run) => run.wing).filter((wing): wing is number => wing != null))).sort((left, right) => left - right),
    [metricRuns],
  );

  // Snap the wing selection to a valid option when the option set changes.
  // Guarded adjust-during-render (converges) instead of a post-paint effect,
  // which avoids an extra render pass.
  const wantedWingValue = !metricWingOptions.length
    ? "none"
    : selectedWingValue !== "none" && metricWingOptions.includes(Number(selectedWingValue))
      ? selectedWingValue
      : String(metricWingOptions[0]);
  if (wantedWingValue !== selectedWingValue) setSelectedWingValue(wantedWingValue);

  const selectedWing = selectedWingValue === "none" ? null : Number(selectedWingValue);
  const selectedWingRuns = useMemo(
    () => (selectedWing == null ? [] : metricRuns.filter((run) => run.wing === selectedWing)),
    [metricRuns, selectedWing],
  );
  const weeks = useMemo(() => summarizeRunsByWeek(selectedWingRuns), [selectedWingRuns]);
  const currentWeek = weeks[0] ?? null;
  const currentWeekRuns = useMemo(
    () => (currentWeek ? selectedWingRuns.filter((run) => run.weekKey === currentWeek.weekKey) : []),
    [currentWeek, selectedWingRuns],
  );
  const currentEncounters = useMemo(() => summarizeEncounters(currentWeekRuns), [currentWeekRuns]);
  const historicalEncounters = useMemo(() => summarizeEncounters(selectedWingRuns), [selectedWingRuns]);
  const playerTable = useMemo(
    () => buildPlayerAverageTable(currentWeekRuns, selectedWingRuns, currentEncounters, historicalEncounters),
    [currentEncounters, currentWeekRuns, historicalEncounters, selectedWingRuns],
  );
  const visibleRows = useMemo(
    () => (hideMissingCurrentWeek ? playerTable.rows.filter((row) => row.current != null) : playerTable.rows),
    [hideMissingCurrentWeek, playerTable.rows],
  );
  const currentCached = currentWeekRuns.filter((run) => hasCurrentPhaseData(run.phaseData)).length;
  const historyCached = selectedWingRuns.filter((run) => hasCurrentPhaseData(run.phaseData)).length;
  const wingSelectorOptions = useMemo(
    () => metricWingOptions.map((wing) => ({ value: String(wing), label: `Wing ${wing}` })),
    [metricWingOptions],
  );

  useEffect(() => {
    if (!selectedWingRuns.length) return;
    onEnsureRunPhaseData(selectedWingRuns);
  }, [selectedWingRuns]);

  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Players"
        showWeekFilter={false}
        showWingFilter={false}
        showSortFilter={false}
      />

      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Wing selection</h3>
            <p className="muted">Pick a wing. Each cell shows current week, delta, and that player&apos;s all-week average for the wing.</p>
          </div>
        </div>

        {wingSelectorOptions.length ? (
          <label className={cx(fieldClass, compactFieldClass, "m-0 max-w-none")}>
            <span className="text-muted">Wing</span>
            <AppSelect value={selectedWingValue} onValueChange={setSelectedWingValue} options={wingSelectorOptions} />
          </label>
        ) : (
          <EmptyCard title="No wing data" description="The current filters remove every mapped wing." />
        )}
      </div>

      {selectedWing != null && currentWeek ? (
        <>
          <div className={panelClass}>
            <div className={sectionHeadingClass}>
              <div>
                <h3 className="mb-3 mt-0 text-[1.25rem]">{formatWing(selectedWing)} player snapshot</h3>
                <p className="muted">
                  Current week is {currentWeek.weekKey}. Historical averages include every saved week that matches the active filters for this wing.
                </p>
              </div>
            </div>
            <div className={statGridClass}>
              <StatCard
                label="Current week"
                value={currentWeek.weekKey}
                detail={`${currentWeek.runs} saved ${pluralize(currentWeek.runs, "run")} in ${formatWing(selectedWing)}`}
              />
              <StatCard
                label="Current pulls cached"
                value={`${currentCached}/${currentWeekRuns.length}`}
                detail="Runs with player phase data this week"
              />
              <StatCard
                label="Wing history cached"
                value={`${historyCached}/${selectedWingRuns.length}`}
                detail="Runs with player phase data across all weeks"
              />
              <StatCard
                label="Players tracked"
                value={String(visibleRows.length)}
                detail={
                  hideMissingCurrentWeek && visibleRows.length !== playerTable.rows.length
                    ? `${playerTable.rows.length} total with hidden players excluded`
                    : "Players with cached metrics in this wing"
                }
              />
            </div>
          </div>

          <div className={panelClass}>
            <div className={sectionHeadingClass}>
              <div>
                <h3 className="mb-3 mt-0 text-[1.25rem]">Player metrics</h3>
                <p className="muted">
                  Loaded {currentCached}/{currentWeekRuns.length} current-week {pluralize(currentWeekRuns.length, "run")} and {historyCached}/{selectedWingRuns.length} total {pluralize(selectedWingRuns.length, "run")} for {formatWing(selectedWing)}.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-base-100 px-3 py-2 text-[0.88rem] font-medium text-fg">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={hideMissingCurrentWeek}
                  onChange={(event) => setHideMissingCurrentWeek(event.target.checked)}
                />
                <span>Hide players not in current week</span>
              </label>
            </div>

            {visibleRows.length ? (
              <div className={tableWrapClass}>
                <PlayerMetricsTable rows={visibleRows} encounterColumns={playerTable.encounterColumns} currentWeek={currentWeek} />
              </div>
            ) : (
              <EmptyCard
                title={hideMissingCurrentWeek ? "No current-week players match" : "No cached player DPS yet"}
                description={
                  hideMissingCurrentWeek
                    ? "No cached player metrics were found for players present in the current week. Turn off the toggle to show historical-only players."
                    : "No phase data is cached for the current wing with these filters."
                }
              />
            )}
          </div>
        </>
      ) : wingSelectorOptions.length ? (
        <div className={panelClass}>
          <EmptyCard title="No current week found" description="The selected wing does not have any runs after the active filters are applied." />
        </div>
      ) : null}
    </>
  );
}
