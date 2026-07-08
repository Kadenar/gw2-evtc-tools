import { formatSeconds } from "../../lib/format";
import { inlineActionsClass, overviewGridClass, panelClass, sectionHeadingClass, statGridClass } from "../../lib/ui";
import type { RaidNightSummary, SessionTypeFilter, WingHistorySummary } from "./types";
import { buildTimelineRows, formatRunSessionType, formatSessionScopeLabel, formatWingSet } from "./utils";
import { StatCard } from "./shared";

export function DashboardTab({
  sessionTypeFilter,
  latestNight,
  previousNight,
  wingSummaries,
  raidNights,
  onViewHistory,
}: {
  sessionTypeFilter: SessionTypeFilter;
  latestNight: RaidNightSummary | null;
  previousNight: RaidNightSummary | null;
  wingSummaries: WingHistorySummary[];
  raidNights: RaidNightSummary[];
  onViewHistory: () => void;
}) {
  const latestLabel = sessionTypeFilter === "practice" ? "Latest Practice" : sessionTypeFilter === "all" ? "Latest Run" : "Latest Full Clear";
  const previousLabel = sessionTypeFilter === "practice" ? "previous practice" : sessionTypeFilter === "all" ? "previous run" : "previous clear";
  const trendLabel = sessionTypeFilter === "practice" ? "Practice Time Trend" : sessionTypeFilter === "all" ? "Run Time Trend" : "Full Clear Time Trend";
  const breakdownLabel =
    sessionTypeFilter === "practice" ? "Current practice breakdown" : sessionTypeFilter === "all" ? "Current run breakdown" : "Current full clear breakdown";

  return (
    <>
      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Dashboard</h3>
            <p className="muted">Latest {formatSessionScopeLabel(sessionTypeFilter).toLowerCase()} performance summary.</p>
          </div>
          <div className={inlineActionsClass}>
            <button type="button" className="btn btn-sm" onClick={onViewHistory}>
              View history
            </button>
          </div>
        </div>
        <div className={statGridClass}>
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

      <div className={overviewGridClass}>
        <RecentRaidNights nights={raidNights.slice(0, 4)} />
        <CurrentBreakdown title={breakdownLabel} night={latestNight} />
      </div>
    </>
  );
}

function RecentRaidNights({ nights }: { nights: RaidNightSummary[] }) {
  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Recent runs</h3>
        </div>
      </div>
      <div className="grid min-w-170 gap-[0.45rem]">
        <div className="grid gap-[0.55rem] px-3 pb-0 pt-0 text-[0.82rem] font-extrabold text-muted grid-cols-[minmax(56px,0.65fr)_minmax(160px,1.45fr)_minmax(76px,0.8fr)_minmax(74px,0.8fr)_minmax(52px,0.55fr)_minmax(74px,0.8fr)]">
          <span>Date</span>
          <span>Scope</span>
          <span>Time</span>
          <span>Delta Prev</span>
          <span>Wipes</span>
          <span>Downtime</span>
        </div>
        {nights.map((night, index) => (
          <div
            className="grid min-w-0 gap-[0.55rem] rounded-[0.7rem] border border-line bg-surface px-3 py-[0.65rem] grid-cols-[minmax(56px,0.65fr)_minmax(160px,1.45fr)_minmax(76px,0.8fr)_minmax(74px,0.8fr)_minmax(52px,0.55fr)_minmax(74px,0.8fr)] *:min-w-0 *:wrap-anywhere max-nav:grid-cols-1"
            key={night.key}
          >
            <span className="text-muted">{night.shortLabel}</span>
            <strong className="text-fg">
              {formatWingSet(night.wings)} {formatRunSessionType(night.sessionType)}
            </strong>
            <span className="text-muted">{formatSeconds(night.totalTime)}</span>
            <span className="text-muted">{formatDelta(night.totalTime, nights[index + 1]?.totalTime)}</span>
            <span className="text-muted">{night.wipes}</span>
            <span className="text-muted">{formatSeconds(night.downtime)}</span>
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
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">{title}</h3>
        </div>
      </div>
      <div className="grid gap-[0.6rem]">
        <MetricRow label="Total time" value={night ? formatSeconds(total) : "N/A"} />
        <MetricRow label="Combat" value={night ? formatSeconds(combat) : "N/A"} detail={night ? `${combatPercent}%` : ""} />
        <MetricRow label="Downtime" value={night ? formatSeconds(downtime) : "N/A"} detail={night ? `${downtimePercent}%` : ""} />
        <div className="time-stack" aria-label={`Combat ${combatPercent}%, downtime ${downtimePercent}%`}>
          <span className="combat" style={{ width: `${combatPercent}%` }} />
          <span className="downtime" style={{ width: `${downtimePercent}%` }} />
        </div>
        <div className="grid gap-[0.45rem] border-t border-line pt-[0.65rem]">
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
    <div className="grid min-w-0 items-baseline gap-[0.55rem] grid-cols-[minmax(110px,1fr)_auto_auto]">
      <span className="text-muted">{label}</span>
      <strong className="wrap-anywhere">{value}</strong>
      {detail ? <small className="text-muted">{detail}</small> : null}
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
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">{title}</h3>
        </div>
      </div>
      {points.length ? (
        <div className="overflow-x-auto">
          <svg className="block w-full min-w-130" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
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

function formatDeltaLegacy(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "—";
  const delta = current - previous;
  if (Math.abs(delta) < 1) return "same";
  return `${delta < 0 ? "↓" : "↑"} ${formatSeconds(Math.abs(delta))}`;
}

function formatCountDeltaLegacy(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "—";
  const delta = current - previous;
  if (delta === 0) return "same";
  return `${delta < 0 ? "↓" : "↑"} ${Math.abs(delta)}`;
}

function formatDelta(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "N/A";
  const delta = current - previous;
  if (Math.abs(delta) < 1) return "same";
  return `${delta < 0 ? "-" : "+"} ${formatSeconds(Math.abs(delta))}`;
}

function formatCountDelta(current: number | null | undefined, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "N/A";
  const delta = current - previous;
  if (delta === 0) return "same";
  return `${delta < 0 ? "-" : "+"} ${Math.abs(delta)}`;
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
