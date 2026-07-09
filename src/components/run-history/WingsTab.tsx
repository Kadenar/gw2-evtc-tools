import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSeconds } from "../../lib/format";
import { cx, panelClass, sectionHeadingClass, statGridClass, tableWrapClass } from "../../lib/ui";
import type { WingHistorySummary } from "./types";
import { buildWingSessionSummaries, formatCalendarDate } from "./utils";
import { StatCard } from "./shared";

const WING_LINE_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-error)",
  "var(--color-secondary)",
  "var(--color-accent)",
  "color-mix(in oklab, var(--color-primary) 70%, var(--color-base-content))",
];

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
  const wingSessions = buildWingSessionSummaries(wingSummaries.flatMap((wing) => wing.runs))
    .filter((session) => session.isComparable && session.totalTime > 0)
    .sort((left, right) => left.start - right.start);
  const chartWingNumbers = Array.from(new Set(wingSessions.map((session) => session.wing))).sort((a, b) => a - b);
  const chartRows = Array.from(
    wingSessions.reduce<Map<string, Record<string, number | string>>>((rows, session) => {
      const sessionKey = session.key.split(":wing:")[0];
      const existing = rows.get(sessionKey) ?? {
        key: sessionKey,
        start: session.start * 1000,
      };

      existing[`wing_${session.wing}`] = session.totalTime;
      rows.set(sessionKey, existing);
      return rows;
    }, new Map()),
  )
    .map(([, row]) => row)
    .sort((left, right) => Number(left.start) - Number(right.start));

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
        <div className={cx(panelClass, "p-0")}>
          <div className="grid gap-[0.85rem] p-4">
            <div className={sectionHeadingClass}>
              <div>
                <h3 className="m-0 text-[1.25rem]">Wing trend lines</h3>
                <p className="muted">Comparable wing clears only. Each line is that wing's own clear time over time.</p>
              </div>
            </div>
            {chartRows.length ? (
              <div className="h-[20rem] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} margin={{ top: 12, right: 18, bottom: 8, left: 8 }}>
                    <CartesianGrid vertical={false} stroke="color-mix(in oklab, var(--color-base-content) 14%, transparent)" strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      dataKey="start"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickMargin={10}
                      tickFormatter={formatWingTrendTick}
                      tick={{ fill: "var(--color-base-content)", fontSize: 12, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={62}
                      tickMargin={8}
                      tickFormatter={formatWingTrendDuration}
                      tick={{ fill: "var(--color-base-content)", fontSize: 12, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "color-mix(in oklab, var(--color-base-content) 22%, transparent)", strokeDasharray: "4 4" }}
                      content={<WingTrendTooltip />}
                    />
                    <Legend wrapperStyle={{ color: "var(--color-base-content)", paddingTop: 8, fontWeight: 600 }} />
                    {chartWingNumbers.map((wing, index) => (
                      <Line
                        type="linear"
                        dataKey={`wing_${wing}`}
                        name={`Wing ${wing}`}
                        stroke={WING_LINE_COLORS[index % WING_LINE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: WING_LINE_COLORS[index % WING_LINE_COLORS.length] }}
                        activeDot={{ r: 5, fill: WING_LINE_COLORS[index % WING_LINE_COLORS.length] }}
                        connectNulls={false}
                        key={wing}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="px-4 pb-4 text-muted">Save more comparable wing clears to generate trend lines.</p>
            )}
          </div>
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

function WingTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    value?: number;
  }>;
  label?: number;
}) {
  if (!active || !payload?.length || label == null) return null;

  return (
    <div className="grid min-w-[11.25rem] gap-[0.35rem] rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <strong>{formatCalendarDate(Math.round(label / 1000))}</strong>
      <div className="grid gap-[0.2rem] text-[0.88rem]">
        {payload
          .filter((entry) => entry.value != null)
          .map((entry) => (
            <div className="flex items-center justify-between gap-3" key={String(entry.dataKey)}>
              <span className="inline-flex items-center gap-2 text-muted">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </span>
              <strong>{formatSeconds(entry.value ?? 0)}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}

function formatCoverageDetail(included: number, missing: number, missingLabel: string): string {
  if (included + missing === 0) return "No wing data";
  if (missing > 0) return `${included} wing${included === 1 ? "" : "s"} included, ${missing} ${missingLabel}`;
  return `${included} wing${included === 1 ? "" : "s"} included`;
}

function formatWingTrendTick(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestampMs));
}

function formatWingTrendDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  return formatSeconds(seconds);
}
