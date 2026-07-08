import { formatSeconds } from "../../lib/format";
import type { WingHistorySummary } from "./types";
import { maxBy, minBy } from "./utils";
import { StatCard } from "./shared";

export function WingsTab({ wingSummaries }: { wingSummaries: WingHistorySummary[] }) {
  const fastestWing = minBy(wingSummaries.filter((wing) => wing.bestTime != null), (wing) => wing.bestTime ?? Number.POSITIVE_INFINITY);
  const slowestWing = maxBy(wingSummaries.filter((wing) => wing.latestTime != null), (wing) => wing.latestTime ?? 0);
  const mostWipes = maxBy(wingSummaries, (wing) => wing.wipes);

  return (
    <>
      <div className="history-stat-grid">
        <StatCard label="Fastest wing" value={fastestWing ? `Wing ${fastestWing.wing}` : "N/A"} detail={fastestWing?.bestTime == null ? "No data" : formatSeconds(fastestWing.bestTime)} />
        <StatCard label="Slowest wing" value={slowestWing ? `Wing ${slowestWing.wing}` : "N/A"} detail={slowestWing?.latestTime == null ? "No data" : formatSeconds(slowestWing.latestTime)} />
        <StatCard label="Most improved" value={wingSummaries.find((wing) => wing.trend === "better") ? `Wing ${wingSummaries.find((wing) => wing.trend === "better")?.wing}` : "N/A"} detail="Latest vs previous" />
        <StatCard label="Most wipes" value={mostWipes ? `Wing ${mostWipes.wing}` : "N/A"} detail={mostWipes ? `${mostWipes.wipes} wipes` : "No wipes"} />
      </div>

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
                <th>Best time</th>
                <th>Average</th>
                <th>Latest</th>
                <th>Wipes</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {wingSummaries.map((wing) => (
                <tr key={wing.wing}>
                  <td>Wing {wing.wing}</td>
                  <td>{wing.bestTime == null ? "N/A" : formatSeconds(wing.bestTime)}</td>
                  <td>{wing.averageTime == null ? "N/A" : formatSeconds(wing.averageTime)}</td>
                  <td>{wing.latestTime == null ? "N/A" : formatSeconds(wing.latestTime)}</td>
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
