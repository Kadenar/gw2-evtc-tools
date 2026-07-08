import { formatSeconds } from "../../lib/format";
import type { RunRecord } from "../../lib/runHistory";
import {
  compactFieldClass,
  cx,
  fieldClass,
  filterGridClass,
  inlineActionsClass,
  panelClass,
  sectionHeadingClass,
  summaryCardClass,
} from "../../lib/ui";
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
  const fieldClasses = cx(fieldClass, compactFieldClass);

  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">{title}</h3>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={filterActions.resetFilters}>
          Reset
        </button>
      </div>
      <div className={filterGridClass}>
        <label className={fieldClasses}>
          <span className="text-muted">Encounter</span>
          <input value={query} onChange={(event) => filterActions.setQuery(event.target.value)} placeholder="Search boss..." />
        </label>
        {showWeekFilter ? (
          <label className={fieldClasses}>
            <span className="text-muted">Week</span>
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
        <label className={fieldClasses}>
          <span className="text-muted">Wing</span>
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
        <label className={fieldClasses}>
          <span className="text-muted">Result</span>
          <select value={resultFilter} onChange={(event) => filterActions.setResultFilter(event.target.value as ResultFilter)}>
            <option value="all">All results</option>
            <option value="kill">Kills</option>
            <option value="wipe">Wipes</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className={fieldClasses}>
          <span className="text-muted">Mode</span>
          <select value={cmFilter} onChange={(event) => filterActions.setCmFilter(event.target.value as HistoryFilters["cmFilter"])}>
            <option value="all">CM and normal</option>
            <option value="cm">CM only</option>
            <option value="normal">Normal only</option>
          </select>
        </label>
        <label className={fieldClasses}>
          <span className="text-muted">Session</span>
          <select value={sessionTypeFilter} onChange={(event) => filterActions.setSessionTypeFilter(event.target.value as SessionTypeFilter)}>
            <option value="all">All sessions</option>
            <option value="full-clear">Full clear</option>
            <option value="practice">Practice</option>
          </select>
        </label>
        {showSortFilter ? (
          <label className={fieldClasses}>
            <span className="text-muted">Sort</span>
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
    <div className="grid gap-[0.65rem]">
      <div className="grid gap-[0.6rem] grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
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
    <div className="flex items-baseline justify-between gap-[0.55rem] rounded-[0.7rem] border border-line bg-base-200 px-[0.7rem] py-[0.55rem]">
      <span className="whitespace-nowrap text-muted">{label}</span>
      <strong className="whitespace-nowrap">{value}</strong>
    </div>
  );
}

export function RunTimeline({ night }: { night: RaidNightSummary }) {
  const rows = buildTimelineRows(night);

  return (
    <div className="grid gap-[0.65rem]">
      {rows.map((row) =>
        row.type === "run" ? (
          <a
            className={cx(
              "grid min-w-0 items-center gap-[0.55rem] rounded-[0.7rem] border border-line bg-surface px-[0.8rem] py-[0.7rem] text-fg no-underline grid-cols-[82px_minmax(160px,1fr)_fit-content(140px)_72px] max-nav:grid-cols-1",
              row.run.success === true && "border-success/40",
              row.run.success === false && "border-error/40",
            )}
            href={row.run.permalink}
            target="_blank"
            rel="noreferrer"
            key={row.id}
          >
            <span className="min-w-0 wrap-anywhere text-muted">{formatClock(getRunStart(row.run))}</span>
            <strong className="min-w-0 wrap-anywhere">{row.run.bossName}</strong>
            <span className="min-w-0 whitespace-nowrap text-muted">{formatResult(row.run.success)}</span>
            <span className="min-w-0 whitespace-nowrap text-muted">{formatSeconds(row.run.duration)}</span>
          </a>
        ) : (
          <div
            className="grid min-w-0 items-center gap-[0.55rem] rounded-[0.7rem] border border-line border-dashed bg-base-200 px-[0.8rem] py-[0.7rem] text-fg grid-cols-[82px_minmax(160px,1fr)_fit-content(140px)_72px] max-nav:grid-cols-1"
            key={row.id}
          >
            <span className="min-w-0 wrap-anywhere text-muted" />
            <strong className="min-w-0 wrap-anywhere">{row.label}</strong>
            <span className="min-w-0 whitespace-nowrap text-muted">{row.source}</span>
            <span className="min-w-0 whitespace-nowrap text-muted">{formatSeconds(row.seconds)}</span>
          </div>
        ),
      )}
    </div>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className={summaryCardClass}>
      <span className="text-muted">{label}</span>
      <strong className="wrap-anywhere text-[1.25rem]">{value}</strong>
      <small className="text-muted">{detail}</small>
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
    <article
      className={cx(
        "grid items-center gap-3 rounded-xl border border-line bg-surface px-[0.8rem] py-[0.7rem] grid-cols-[auto_minmax(220px,1fr)_minmax(220px,auto)_auto] max-nav:grid-cols-1",
        selected && "border-primary/55 bg-primary/8",
      )}
    >
      <label>
        <input className="w-auto" type="checkbox" checked={selected} onChange={onToggleSelected} />
        <span className="sr-only">Select run</span>
      </label>
      <button
        type="button"
        className="grid min-w-0 cursor-pointer gap-[0.1rem] rounded-[0.65rem] border border-transparent bg-transparent p-[0.35rem] text-left text-fg hover:border-primary/50"
        onClick={onSelectEncounter}
      >
        <span className="text-muted">{formatRunDate(run)}</span>
        <strong>
          {run.bossName}
          {run.isCm ? <span className="badge badge-sm badge-outline ml-1">CM</span> : null}
          <span className="badge badge-sm badge-outline ml-1">{formatRunSessionType(getRunSessionType(run))}</span>
        </strong>
        <span className="text-muted">{formatWing(run.wing)}</span>
      </button>
      <div className="flex flex-wrap items-center justify-end gap-2 max-nav:justify-start">
        <span className={`badge ${getResultBadgeClass(run.success)}`}>{formatResult(run.success)}</span>
        <span>{formatSeconds(run.duration)}</span>
        <span>{formatDps(run.compDps)}</span>
      </div>
      <div className={cx(inlineActionsClass, "justify-end max-nav:justify-start")}>
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
