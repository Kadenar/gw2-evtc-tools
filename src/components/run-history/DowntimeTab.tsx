import { formatSeconds } from "../../lib/format";
import type { RaidNightSummary } from "./types";
import { average, buildTimelineRows, formatTimeDelta, maxBy, mostCommonGapSource } from "./utils";
import { RunTimeline, StatCard } from "./shared";

export function DowntimeTab({ night, previousNight }: { night: RaidNightSummary | null; previousNight: RaidNightSummary | null }) {
  const rows = night ? buildTimelineRows(night).filter((row) => row.type === "gap" && row.seconds >= 30) : [];
  const longest = maxBy(rows, (row) => (row.type === "gap" ? row.seconds : 0));
  const averageGap = average(rows.map((row) => (row.type === "gap" ? row.seconds : 0))) ?? 0;

  return (
    <>
      <div className="panel">
        <div className="section-heading">
          <h3>Downtime</h3>
        </div>
        <div className="history-stat-grid">
            <StatCard label="Total downtime" value={night ? formatSeconds(night.downtime) : "N/A"} detail={formatTimeDelta(night?.downtime, previousNight?.downtime)} />
            <StatCard label="Avg between bosses" value={formatSeconds(averageGap)} detail={`${rows.length} gaps over 30s`} />
            <StatCard label="Longest gap" value={longest && longest.type === "gap" ? formatSeconds(longest.seconds) : "N/A"} detail={longest && longest.type === "gap" ? longest.label : "No gap"} />
          </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Downtime timeline</h3>
          </div>
        </div>
        {night ? <RunTimeline night={night} /> : <p className="muted">No raid night selected.</p>}
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Largest downtime segments</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Segment</th>
                <th>Time lost</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => (b.type === "gap" ? b.seconds : 0) - (a.type === "gap" ? a.seconds : 0))
                .map((row, index) =>
                  row.type === "gap" ? (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.label}</td>
                      <td>{formatSeconds(row.seconds)}</td>
                      <td>{row.source}</td>
                    </tr>
                  ) : null,
                )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
