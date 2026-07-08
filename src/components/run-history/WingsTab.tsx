import { formatSeconds } from "../../lib/format";
import { panelClass, sectionHeadingClass, statGridClass, tableWrapClass } from "../../lib/ui";
import type { WingHistorySummary } from "./types";
import { formatCalendarDate } from "./utils";
import { StatCard } from "./shared";

export function WingsTab({ wingSummaries }: { wingSummaries: WingHistorySummary[] }) {
  const bestTimes = wingSummaries
    .map((wing) => wing.bestTime)
    .filter((bestTime): bestTime is number => bestTime != null && bestTime > 0);
  const summedBestTime = bestTimes.length ? bestTimes.reduce((sum, bestTime) => sum + bestTime, 0) : null;
  const missingBestTimes = wingSummaries.length - bestTimes.length;

  return (
    <>
      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Wing breakdown</h3>
          </div>
        </div>
        <div className={statGridClass}>
          <StatCard
            label="Sum of best"
            value={summedBestTime == null ? "N/A" : formatSeconds(summedBestTime)}
            detail={
              !wingSummaries.length
                ? "No wing data"
                : missingBestTimes > 0
                  ? `${bestTimes.length} wing${bestTimes.length === 1 ? "" : "s"} included, ${missingBestTimes} missing full-clear PB`
                  : ""
            }
          />
        </div>
        <div className={tableWrapClass}>
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
