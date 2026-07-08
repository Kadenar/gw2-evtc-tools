import type { ChangeEvent } from "react";
import { formatSeconds } from "../../lib/format";
import type { RaidNightSummary, RecordHighlight, SessionTypeFilter, WingHistorySummary } from "./types";
import { buildTimelineRows, formatRunSessionType, formatSessionScopeLabel, formatWingSet } from "./utils";
import { StatCard } from "./shared";

export function DashboardTab({
  sessionTypeFilter,
  isWorking,
  latestNight,
  previousNight,
  wingSummaries,
  raidNights,
  records,
  onImportBackup,
  onViewHistory,
}: {
  sessionTypeFilter: SessionTypeFilter;
  isWorking: boolean;
  latestNight: RaidNightSummary | null;
  previousNight: RaidNightSummary | null;
  wingSummaries: WingHistorySummary[];
  raidNights: RaidNightSummary[];
  records: RecordHighlight[];
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  onViewHistory: () => void;
}) {
  const latestLabel = sessionTypeFilter === "practice" ? "Latest Practice" : sessionTypeFilter === "all" ? "Latest Run" : "Latest Full Clear";
  const previousLabel = sessionTypeFilter === "practice" ? "previous practice" : sessionTypeFilter === "all" ? "previous run" : "previous clear";
  const trendLabel = sessionTypeFilter === "practice" ? "Practice Time Trend" : sessionTypeFilter === "all" ? "Run Time Trend" : "Full Clear Time Trend";
  const breakdownLabel =
    sessionTypeFilter === "practice" ? "Current practice breakdown" : sessionTypeFilter === "all" ? "Current run breakdown" : "Current full clear breakdown";

  return (
    <>
      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Dashboard</h3>
            <p className="muted">Latest {formatSessionScopeLabel(sessionTypeFilter).toLowerCase()} performance summary.</p>
          </div>
          <div className="inline-actions">
            <label className={`secondary file-button ${isWorking ? "disabled" : ""}`}>
              Import backup
              <input type="file" accept="application/json,.json" disabled={isWorking} onChange={onImportBackup} />
            </label>
            <button type="button" className="secondary" onClick={onViewHistory}>
              View history
            </button>
          </div>
        </div>
        <div className="history-stat-grid">
          <StatCard
            label={latestLabel}
            value={latestNight ? formatSeconds(latestNight.totalTime) : "N/A"}
            detail={latestNight ? `${latestNight.shortLabel} - vs ${previousLabel} ${formatDelta(latestNight.totalTime, previousNight?.totalTime)}` : "No raid nights"}
          />
          <StatCard
            label="Best Wing Split"
            value={wingSummaries[0] ? `W${wingSummaries[0].wing}` : "N/A"}
            detail={wingSummaries[0]?.bestTime == null ? "No wing data" : `${formatSeconds(wingSummaries[0].bestTime)} PB`}
          />
          <StatCard label="Downtime" value={latestNight ? formatSeconds(latestNight.downtime) : "N/A"} detail={formatDelta(latestNight?.downtime, previousNight?.downtime)} />
          <StatCard label="Wipes" value={latestNight ? String(latestNight.wipes) : "N/A"} detail={formatCountDelta(latestNight?.wipes, previousNight?.wipes)} />
        </div>
      </div>

      <TrendChart title={trendLabel} nights={raidNights.slice(0, 6)} />

      <div className="history-overview-grid">
        <RecentRaidNights nights={raidNights.slice(0, 4)} />
        <CurrentBreakdown title={breakdownLabel} night={latestNight} />
      </div>

      <RecordPanel records={records} />
    </>
  );
}

function RecentRaidNights({ nights }: { nights: RaidNightSummary[] }) {
  return (
    <div className="panel recent-runs-panel">
      <div className="section-heading">
        <div>
          <h3>Recent runs</h3>
        </div>
      </div>
      <div className="recent-runs-table">
        <div className="recent-runs-row recent-runs-head">
          <span>Date</span>
          <span>Scope</span>
          <span>Time</span>
          <span>Delta Prev</span>
          <span>Wipes</span>
          <span>Downtime</span>
        </div>
        {nights.map((night, index) => (
          <div className="recent-runs-row" key={night.key}>
            <span>{night.shortLabel}</span>
            <strong>
              {formatWingSet(night.wings)} {formatRunSessionType(night.sessionType)}
            </strong>
            <span>{formatSeconds(night.totalTime)}</span>
            <span>{formatDelta(night.totalTime, nights[index + 1]?.totalTime)}</span>
            <span>{night.wipes}</span>
            <span>{formatSeconds(night.downtime)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentBreakdown({ title, night }: { title: string; night: RaidNightSummary | null }) {
  const total = night?.totalTime ?? 0;
  const combat = night?.combatTime ?? 0;
  const downtime = night?.downtime ?? 0;
  const combatPercent = total > 0 ? Math.round((combat / total) * 100) : 0;
  const downtimePercent = total > 0 ? Math.round((downtime / total) * 100) : 0;
  const longestDowntime = getLongestDowntime(night);
  const slowestWing = getSlowestWing(night);

  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="breakdown-list">
        <MetricRow label="Total time" value={night ? formatSeconds(total) : "N/A"} />
        <MetricRow label="Combat" value={night ? formatSeconds(combat) : "N/A"} detail={night ? `${combatPercent}%` : ""} />
        <MetricRow label="Downtime" value={night ? formatSeconds(downtime) : "N/A"} detail={night ? `${downtimePercent}%` : ""} />
        <div className="time-stack" aria-label={`Combat ${combatPercent}%, downtime ${downtimePercent}%`}>
          <span className="combat" style={{ width: `${combatPercent}%` }} />
          <span className="downtime" style={{ width: `${downtimePercent}%` }} />
        </div>
        <div className="breakdown-mini-stats">
          <MetricRow label="Wipes" value={night ? String(night.wipes) : "N/A"} />
          <MetricRow label="Longest downtime" value={longestDowntime == null ? "N/A" : formatSeconds(longestDowntime)} />
          <MetricRow label="Slowest wing" value={slowestWing == null ? "N/A" : `Wing ${slowestWing}`} />
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="breakdown-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function TrendChart({ title, nights }: { title: string; nights: RaidNightSummary[] }) {
  const chartNights = [...nights].reverse();
  const times = chartNights.map((night) => night.totalTime);
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : 0;
  const range = Math.max(1, max - min);
  const width = 560;
  const height = 180;
  const padX = 46;
  const padTop = 18;
  const padBottom = 34;
  const plotWidth = width - padX - 18;
  const plotHeight = height - padTop - padBottom;
  const points = chartNights.map((night, index) => {
    const x = padX + (chartNights.length <= 1 ? plotWidth / 2 : (index / (chartNights.length - 1)) * plotWidth);
    const y = padTop + ((max - night.totalTime) / range) * plotHeight;
    return { night, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>{title}</h3>
        </div>
      </div>
      {points.length ? (
        <div className="trend-chart">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            <line className="trend-axis" x1={padX} y1={padTop} x2={padX} y2={height - padBottom} />
            <line className="trend-axis" x1={padX} y1={height - padBottom} x2={width - 18} y2={height - padBottom} />
            <text className="trend-label" x="4" y={padTop + 4}>
              {formatChartTime(max)}
            </text>
            <text className="trend-label" x="4" y={height - padBottom + 4}>
              {formatChartTime(min)}
            </text>
            {points.length > 1 ? <polyline className="trend-line" points={line} /> : null}
            {points.map((point) => (
              <g key={point.night.key}>
                <circle className="trend-point" cx={point.x} cy={point.y} r="4.5" />
                <text className="trend-date" x={point.x} y={height - 10} textAnchor="middle">
                  {point.night.shortLabel}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <p className="muted">Save more runs to generate a trend.</p>
      )}
    </div>
  );
}

function RecordPanel({ records }: { records: RecordHighlight[] }) {
  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>Records</h3>
        </div>
      </div>
      <div className="record-grid">
        {records.map((record) => (
          <article className="record-card" key={record.label}>
            <span>{record.label}</span>
            <strong>{record.value}</strong>
            <small>{record.detail}</small>
            {record.run ? (
              <a href={record.run.permalink} target="_blank" rel="noreferrer">
                Open report
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function formatDelta(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "—";
  const delta = current - previous;
  if (Math.abs(delta) < 1) return "same";
  return `${delta < 0 ? "↓" : "↑"} ${formatSeconds(Math.abs(delta))}`;
}

function formatCountDelta(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "—";
  const delta = current - previous;
  if (delta === 0) return "same";
  return `${delta < 0 ? "↓" : "↑"} ${Math.abs(delta)}`;
}

function formatChartTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}:${String(remainder).padStart(2, "0")}` : `${minutes}:00`;
}

function getLongestDowntime(night: RaidNightSummary | null): number | null {
  if (!night) return null;
  const gaps = buildTimelineRows(night).filter((row): row is Extract<ReturnType<typeof buildTimelineRows>[number], { type: "gap" }> => row.type === "gap");
  if (!gaps.length) return null;
  return Math.max(...gaps.map((gap) => gap.seconds));
}

function getSlowestWing(night: RaidNightSummary | null): number | null {
  if (!night) return null;
  const totals = new Map<number, number>();
  for (const run of night.runs) {
    if (run.wing == null) continue;
    totals.set(run.wing, (totals.get(run.wing) ?? 0) + run.duration);
  }
  return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
