// Per-raid-night downtime comparison table for the selected wing.

import { formatSeconds } from "../../../lib/format";
import { tableWrapClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import type { DowntimeRow } from "./weekAggregation";

export function WingDowntimePanel({
  selectedWeek,
  compareWeek,
  rows,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: DowntimeRow[];
}) {
  if (!rows.length) {
    return <EmptyCard title="No downtime data" description="This wing does not have enough saved raid-night data to compare downtime." />;
  }

  return (
    <div className={tableWrapClass}>
      <table>
        <thead>
          <tr>
            <th>Raid night</th>
            <th>{selectedWeek?.weekKey ?? "Selected"} total</th>
            <th>{selectedWeek?.weekKey ?? "Selected"} downtime</th>
            <th>{compareWeek?.weekKey ?? "Compare"} total</th>
            <th>{compareWeek?.weekKey ?? "Compare"} downtime</th>
            <th>Change</th>
            <th>Largest gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.current ? formatSeconds(row.current.totalTime) : "N/A"}</td>
              <td>{row.current ? formatSeconds(row.current.downtime) : "N/A"}</td>
              <td>{row.previous ? formatSeconds(row.previous.totalTime) : "N/A"}</td>
              <td>{row.previous ? formatSeconds(row.previous.downtime) : "N/A"}</td>
              <td>{row.change}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
