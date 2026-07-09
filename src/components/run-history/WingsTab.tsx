import { formatSeconds } from "../../lib/format";
import { cx, panelClass, sectionHeadingClass, statGridClass, tableWrapClass } from "../../lib/ui";
import type { WingHistorySummary } from "./types";
import { formatCalendarDate } from "./utils";
import { StatCard } from "./shared";

export function WingsTab({ wingSummaries }: { wingSummaries: WingHistorySummary[] }) {
  const bestTimes = wingSummaries
    .map((wing) => wing.bestTime)
    .filter((bestTime): bestTime is number => bestTime != null && bestTime > 0);
  const latestTimes = wingSummaries
    .map((wing) => wing.latestTime)
    .filter((latestTime): latestTime is number => latestTime != null && latestTime > 0);
  const averageTimes = wingSummaries
    .map((wing) => wing.averageTime)
    .filter((averageTime): averageTime is number => averageTime != null && averageTime > 0);
  const summedBestTime = bestTimes.length ? bestTimes.reduce((sum, bestTime) => sum + bestTime, 0) : null;
  const summedLatestTime = latestTimes.length ? latestTimes.reduce((sum, latestTime) => sum + latestTime, 0) : null;
  const summedAverageTime = averageTimes.length ? averageTimes.reduce((sum, averageTime) => sum + averageTime, 0) : null;
  const missingBestTimes = wingSummaries.length - bestTimes.length;
  const missingLatestTimes = wingSummaries.length - latestTimes.length;
  const missingAverageTimes = wingSummaries.length - averageTimes.length;

  return (
    <>
      <div className={cx(panelClass, "grid gap-[0.85rem]")}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="m-0 text-[1.25rem]">Wing breakdown</h3>
          </div>
        </div>
        <div className={statGridClass}>
          <StatCard
            label="Sum of best"
            value={summedBestTime == null ? "N/A" : formatSeconds(summedBestTime)}
            detail={formatCoverageDetail(bestTimes.length, missingBestTimes, "missing full-clear PB")}
          />
          <StatCard
            label="Sum of latest"
            value={summedLatestTime == null ? "N/A" : formatSeconds(summedLatestTime)}
            detail={formatCoverageDetail(latestTimes.length, missingLatestTimes, "missing comparable clear")}
          />
          <StatCard
            label="Sum of average"
            value={summedAverageTime == null ? "N/A" : formatSeconds(summedAverageTime)}
            detail={formatCoverageDetail(averageTimes.length, missingAverageTimes, "missing comparable average")}
          />
        </div>
        <div className={tableWrapClass}>
          <table>
            <thead>
              <tr>
                <th>Wing</th>
                <th>Best clear</th>
                <th>Latest clear</th>
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

function formatCoverageDetail(included: number, missing: number, missingLabel: string): string {
  if (included + missing === 0) return "No wing data";
  if (missing > 0) return `${included} wing${included === 1 ? "" : "s"} included, ${missing} ${missingLabel}`;
  return `${included} wing${included === 1 ? "" : "s"} included`;
}
