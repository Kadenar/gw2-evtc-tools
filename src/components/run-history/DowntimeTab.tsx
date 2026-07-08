import { useMemo, useState } from "react";
import { formatSeconds } from "../../lib/format";
import { compactFieldClass, cx, fieldClass, panelClass, sectionHeadingClass, tableWrapClass } from "../../lib/ui";
import type { HistoryFilterActions, HistoryFilters, RaidNightSummary } from "./types";
import { buildTimelineRows } from "./utils";
import { HistoryFilterPanel } from "./shared";

type DowntimeSortMode = "time-lost" | "timeline";
type DowntimeGapRow = Extract<ReturnType<typeof buildTimelineRows>[number], { type: "gap" }>;

export function DowntimeTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  night,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  night: RaidNightSummary | null;
}) {
  const [sortMode, setSortMode] = useState<DowntimeSortMode>("timeline");
  const rows = useMemo(() => {
    const gapRows: DowntimeGapRow[] = night
      ? buildTimelineRows(night).filter((row): row is DowntimeGapRow => row.type === "gap" && row.seconds >= 30)
      : [];

    return gapRows.slice().sort((left, right) => {
      if (sortMode === "timeline") {
        return left.offsetSeconds - right.offsetSeconds || right.seconds - left.seconds;
      }

      return right.seconds - left.seconds || left.offsetSeconds - right.offsetSeconds;
    });
  }, [night, sortMode]);

  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Downtime"
      />
      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Downtime segments</h3>
          </div>
          <label className={cx(fieldClass, compactFieldClass, "m-0")}>
            <span className="text-muted">Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as DowntimeSortMode)}>
              <option value="timeline">Occurs during clear</option>
              <option value="time-lost">Time lost</option>
            </select>
          </label>
        </div>
        <div className={tableWrapClass}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Segment</th>
                <th>Occurs at</th>
                <th>Time lost</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr className="cursor-pointer hover:bg-primary/8" key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.label}</td>
                  <td>{formatSeconds(row.offsetSeconds)}</td>
                  <td>{formatSeconds(row.seconds)}</td>
                  <td>{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
