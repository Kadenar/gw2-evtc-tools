// Per-wing timing comparison table. Rows are clickable to drive the wing detail panel.

import { formatSeconds } from "../../../lib/format";
import { cx, panelClass, sectionHeadingClass, tableWrapClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import type { WeekWingRow } from "./weekAggregation";

export function WingPerformanceTable({
  selectedWeek,
  compareWeek,
  rows,
  selectedWing,
  onSelectWing,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: WeekWingRow[];
  selectedWing: number | null;
  onSelectWing: (wing: number) => void;
}) {
  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Wing performance</h3>
          <p className="muted">{selectedWeek ? "Click a wing to inspect encounter and downtime detail." : "Select a week to compare wing performance."}</p>
        </div>
      </div>
      {selectedWeek ? (
        <div className={tableWrapClass}>
          <table>
            <thead>
              <tr>
                <th>Wing</th>
                <th>{selectedWeek.weekKey}</th>
                <th>{compareWeek?.weekKey ?? "Compare"}</th>
                <th>Change</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className={cx("cursor-pointer hover:bg-primary/8", selectedWing === row.wing && "bg-primary/8")} onClick={() => onSelectWing(row.wing)} key={row.wing}>
                  <td>Wing {row.wing}</td>
                  <td>{row.current == null ? "N/A" : formatSeconds(row.current)}</td>
                  <td>{row.previous == null ? "N/A" : formatSeconds(row.previous)}</td>
                  <td>{row.change}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyCard title="No week selected" description="Pick a saved week to compare wing performance." />
      )}
    </div>
  );
}
