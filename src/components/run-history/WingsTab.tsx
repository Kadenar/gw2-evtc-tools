import { formatSeconds } from "../../lib/format";
import type { WingHistorySummary } from "./types";
import { formatCalendarDate, maxBy, minBy } from "./utils";
import { StatCard } from "./shared";

export function WingsTab({ wingSummaries }: { wingSummaries: WingHistorySummary[] }) {
  return (
    <>
      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Wing breakdown</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Wing</th>
                <th>Best full clear</th>
                <th>Latest full clear</th>
                <th>Average</th>
                <th>Comparable</th>
                <th>Partial excluded</th>
                <th>Wipes</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {wingSummaries.map((wing) => (
                <tr key={wing.wing}>
                  <td>Wing {wing.wing}</td>
                  <td>
                    {wing.bestTime == null ? "N/A" : (
                      <>
                        <div>{formatSeconds(wing.bestTime)}</div>
                        <small>{wing.bestTimeStart == null ? "Date unavailable" : formatCalendarDate(wing.bestTimeStart)}</small>
                      </>
                    )}
                  </td>
                  <td>{wing.latestTime == null ? "N/A" : formatSeconds(wing.latestTime)}</td>
                  <td>{wing.averageTime == null ? "N/A" : formatSeconds(wing.averageTime)}</td>
                  <td>{wing.comparableSessions}</td>
                  <td>{wing.partialSessions}</td>
                  <td>{wing.wipes}</td>
                  <td>{wing.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
