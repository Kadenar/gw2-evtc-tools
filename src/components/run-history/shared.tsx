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
import { AppSelect, type AppSelectOption } from "../ui/app-select";
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
  const weekFilterOptions: AppSelectOption[] = [
    { value: "all", label: "All weeks" },
    ...weekOptions.map((weekKey) => ({ value: weekKey, label: weekKey })),
  ];
  const wingFilterOptions: AppSelectOption[] = [
    { value: "all", label: "All wings" },
    { value: "unmapped", label: "Unmapped" },
    ...wingOptions.map((wing) => ({ value: String(wing), label: `Wing ${wing}` })),
  ];
  const resultFilterOptions: AppSelectOption[] = [
    { value: "all", label: "All results" },
    { value: "kill", label: "Kills" },
    { value: "wipe", label: "Wipes" },
    { value: "unknown", label: "Unknown" },
  ];
  const cmFilterOptions: AppSelectOption[] = [
    { value: "all", label: "CM and normal" },
    { value: "cm", label: "CM only" },
    { value: "normal", label: "Normal only" },
  ];
  const sessionFilterOptions: AppSelectOption[] = [
    { value: "all", label: "All sessions" },
    { value: "full-clear", label: "Full clear" },
    { value: "practice", label: "Practice" },
  ];
  const sortOptions: AppSelectOption[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "duration", label: "Fastest duration" },
    { value: "dps", label: "Highest DPS" },
    { value: "encounter", label: "Encounter" },
  ];

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
            <AppSelect value={weekFilter} onValueChange={filterActions.setWeekFilter} options={weekFilterOptions} />
          </label>
        ) : null}
        <label className={fieldClasses}>
          <span className="text-muted">Wing</span>
          <AppSelect value={wingFilter} onValueChange={filterActions.setWingFilter} options={wingFilterOptions} />
        </label>
        <label className={fieldClasses}>
          <span className="text-muted">Result</span>
          <AppSelect value={resultFilter} onValueChange={(value) => filterActions.setResultFilter(value as ResultFilter)} options={resultFilterOptions} />
        </label>
        <label className={fieldClasses}>
          <span className="text-muted">Mode</span>
          <AppSelect
            value={cmFilter}
            onValueChange={(value) => filterActions.setCmFilter(value as HistoryFilters["cmFilter"])}
            options={cmFilterOptions}
          />
        </label>
        <label className={fieldClasses}>
          <span className="text-muted">Session</span>
          <AppSelect
            value={sessionTypeFilter}
            onValueChange={(value) => filterActions.setSessionTypeFilter(value as SessionTypeFilter)}
            options={sessionFilterOptions}
          />
        </label>
        {showSortFilter ? (
          <label className={fieldClasses}>
            <span className="text-muted">Sort</span>
            <AppSelect value={sortMode} onValueChange={(value) => filterActions.setSortMode(value as SortMode)} options={sortOptions} />
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
