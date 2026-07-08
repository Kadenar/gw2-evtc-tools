import { formatSeconds } from "../../lib/format";
import type { RunRecord } from "../../lib/runHistory";
import type { HistoryFilterActions, HistoryFilters, RaidNightSummary, ResultFilter, SessionTypeFilter, SortMode } from "./types";
import {
  buildTimelineRows,
  formatClock,
  formatDps,
  formatResult,
  formatRunDate,
  formatRunSessionType,
  formatWing,
  getResultBadgeClass,
  getResultClass,
  getRunSessionType,
  getRunStart,
} from "./utils";

export function HistoryFilterPanel({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  title,
  showWeekFilter = true,
  showSortFilter = true,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  title: string;
  showWeekFilter?: boolean;
  showSortFilter?: boolean;
}) {
  const { query, weekFilter, wingFilter, resultFilter, cmFilter, sessionTypeFilter, sortMode } = filters;

  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>{title}</h3>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={filterActions.resetFilters}>
          Reset
        </button>
      </div>
      <div className="history-filter-grid">
        <label className="field compact">
          <span>Encounter</span>
          <input value={query} onChange={(event) => filterActions.setQuery(event.target.value)} placeholder="Search boss..." />
        </label>
        {showWeekFilter ? (
          <label className="field compact">
            <span>Week</span>
            <select value={weekFilter} onChange={(event) => filterActions.setWeekFilter(event.target.value)}>
              <option value="all">All weeks</option>
              {weekOptions.map((weekKey) => (
                <option value={weekKey} key={weekKey}>
                  {weekKey}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field compact">
          <span>Wing</span>
          <select value={wingFilter} onChange={(event) => filterActions.setWingFilter(event.target.value)}>
            <option value="all">All wings</option>
            <option value="unmapped">Unmapped</option>
            {wingOptions.map((wing) => (
              <option value={String(wing)} key={wing}>
                Wing {wing}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Result</span>
          <select value={resultFilter} onChange={(event) => filterActions.setResultFilter(event.target.value as ResultFilter)}>
            <option value="all">All results</option>
            <option value="kill">Kills</option>
            <option value="wipe">Wipes</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="field compact">
          <span>Mode</span>
          <select value={cmFilter} onChange={(event) => filterActions.setCmFilter(event.target.value as HistoryFilters["cmFilter"])}>
            <option value="all">CM and normal</option>
            <option value="cm">CM only</option>
            <option value="normal">Normal only</option>
          </select>
        </label>
        <label className="field compact">
          <span>Session</span>
          <select value={sessionTypeFilter} onChange={(event) => filterActions.setSessionTypeFilter(event.target.value as SessionTypeFilter)}>
            <option value="all">All sessions</option>
            <option value="full-clear">Full clear</option>
            <option value="practice">Practice</option>
          </select>
        </label>
        {showSortFilter ? (
          <label className="field compact">
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => filterActions.setSortMode(event.target.value as SortMode)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="duration">Fastest duration</option>
              <option value="dps">Highest DPS</option>
              <option value="encounter">Encounter</option>
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function RaidNightDetail({ night }: { night: RaidNightSummary }) {
  return (
    <div className="raid-night-detail">
      <div className="time-stats week-stats time-stats-inline">
        <Metric label="Total time" value={formatSeconds(night.totalTime)} />
        <Metric label="Combat time" value={formatSeconds(night.combatTime)} />
        <Metric label="Downtime" value={formatSeconds(night.downtime)} />
        <Metric label="Kills" value={String(night.kills)} />
        <Metric label="Wipes" value={String(night.wipes)} />
      </div>
      <RunTimeline night={night} />
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function RunTimeline({ night }: { night: RaidNightSummary }) {
  const rows = buildTimelineRows(night);

  return (
    <div className="linear-timeline">
      {rows.map((row) =>
        row.type === "run" ? (
          <a className={`linear-timeline-row ${getResultClass(row.run.success)}`} href={row.run.permalink} target="_blank" rel="noreferrer" key={row.id}>
            <span>{formatClock(getRunStart(row.run))}</span>
            <strong>{row.run.bossName}</strong>
            <span>{formatResult(row.run.success)}</span>
            <span>{formatSeconds(row.run.duration)}</span>
          </a>
        ) : (
          <div className="linear-timeline-row downtime" key={row.id}>
            <span />
            <strong>{row.label}</strong>
            <span>{row.source}</span>
            <span>{formatSeconds(row.seconds)}</span>
          </div>
        ),
      )}
    </div>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="history-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function RunCard({
  run,
  selected,
  disabled,
  onToggleSelected,
  onSelectEncounter,
  onDelete,
}: {
  run: RunRecord;
  selected: boolean;
  disabled: boolean;
  onToggleSelected: () => void;
  onSelectEncounter: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={`run-card ${selected ? "selected" : ""}`}>
      <label className="run-select">
        <input type="checkbox" checked={selected} onChange={onToggleSelected} />
        <span className="sr-only">Select run</span>
      </label>
      <button type="button" className="run-main" onClick={onSelectEncounter}>
        <span className="run-date">{formatRunDate(run)}</span>
        <strong>
          {run.bossName}
          {run.isCm ? <span className="badge badge-sm badge-outline ml-1">CM</span> : null}
          <span className="badge badge-sm badge-outline ml-1">{formatRunSessionType(getRunSessionType(run))}</span>
        </strong>
        <span>{formatWing(run.wing)}</span>
      </button>
      <div className="run-metrics">
        <span className={`badge ${getResultBadgeClass(run.success)}`}>{formatResult(run.success)}</span>
        <span>{formatSeconds(run.duration)}</span>
        <span>{formatDps(run.compDps)}</span>
      </div>
      <div className="run-actions">
        <a href={run.permalink} target="_blank" rel="noreferrer">
          Open
        </a>
        <button type="button" className="btn btn-sm btn-ghost" disabled={disabled} onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  );
}
