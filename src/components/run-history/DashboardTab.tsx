import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSeconds } from "../../lib/format";
import { inlineActionsClass, overviewGridClass, panelClass, sectionHeadingClass, statGridClass } from "../../lib/ui";
import type { RaidNightSummary, SessionTypeFilter, WingHistorySummary } from "./types";
import { buildTimelineRows, formatRunSessionType, formatSessionScopeLabel, formatSignedCountDelta, formatSignedSecondsDelta, formatWingSet, pluralize } from "./utils";
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
  const bestWing = wingSummaries.reduce<WingHistorySummary | null>(
    (best, wing) => (wing.bestTime != null && (best?.bestTime == null || wing.bestTime < best.bestTime) ? wing : best),
    null,
  );

  return (
    <>
      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Dashboard</h3>
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
            detail={latestNight ? `${latestNight.shortLabel} - vs ${previousLabel} ${formatSignedSecondsDelta(latestNight.totalTime, previousNight?.totalTime)}` : "No raid nights"}
          />
          <StatCard
            label="Best Wing Split"
            value={bestWing ? `W${bestWing.wing}` : "N/A"}
            detail={bestWing?.bestTime == null ? "No wing data" : `${formatSeconds(bestWing.bestTime)} PB`}
          />
          <StatCard label="Downtime" value={latestNight ? formatSeconds(latestNight.downtime) : "N/A"} detail={formatSignedSecondsDelta(latestNight?.downtime, previousNight?.downtime)} />
          <StatCard label="Wipes" value={latestNight ? String(latestNight.wipes) : "N/A"} detail={formatSignedCountDelta(latestNight?.wipes, previousNight?.wipes)} />
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
            <span className="text-muted">{formatSignedSecondsDelta(night.totalTime, nights[index + 1]?.totalTime)}</span>
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
  const chartRows = [...nights].reverse().map((night) => ({
    key: night.key,
    label: night.shortLabel,
    fullLabel: night.label,
    scope: `${formatWingSet(night.wings)} ${formatRunSessionType(night.sessionType)}`,
    totalTime: night.totalTime,
    combatTime: night.combatTime,
    downtime: night.downtime,
    wipes: night.wipes,
  }));

  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">{title}</h3>
          <p className="muted">Stacked combat and downtime over the latest {nights.length} saved raid {pluralize(nights.length, "night")}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[0.82rem] text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="legend-dot kill" />
            Combat
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="legend-dot downtime" />
            Downtime
          </span>
        </div>
      </div>
      {chartRows.length ? (
        <div className="h-68 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartRows} margin={{ top: 12, right: 10, bottom: 6, left: 0 }}>
              <defs>
                <linearGradient id="combat-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="downtime-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="color-mix(in oklab, var(--color-base-content) 14%, transparent)" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickMargin={10}
                tick={{ fill: "var(--color-base-content)", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={54}
                tickMargin={8}
                tickFormatter={formatChartTime}
                tick={{ fill: "var(--color-base-content)", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: "color-mix(in oklab, var(--color-base-content) 20%, transparent)", strokeDasharray: "4 4" }}
                content={<TrendTooltip />}
              />
              <Area
                type="linear"
                dataKey="combatTime"
                name="Combat"
                stackId="time"
                stroke="var(--color-success)"
                fill="url(#combat-area)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-success)" }}
                activeDot={{ r: 4, fill: "var(--color-success)" }}
              />
              <Area
                type="linear"
                dataKey="downtime"
                name="Downtime"
                stackId="time"
                stroke="var(--color-info)"
                fill="url(#downtime-area)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-info)" }}
                activeDot={{ r: 4, fill: "var(--color-info)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="muted">Save more runs to generate a trend.</p>
      )}
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    value?: number;
    payload?: {
      fullLabel: string;
      scope: string;
      totalTime: number;
      wipes: number;
    };
  }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !payload?.length || !row) return null;

  return (
    <div className="grid min-w-45 gap-[0.4rem] rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <div className="grid gap-[0.1rem]">
        <strong>{row.fullLabel}</strong>
        <span className="text-[0.82rem] text-muted">{row.scope}</span>
      </div>
      <div className="grid gap-1 text-[0.88rem]">
        {payload.map((entry) => (
          <div className="flex items-center justify-between gap-3" key={String(entry.dataKey)}>
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <strong>{formatSeconds(entry.value ?? 0)}</strong>
          </div>
        ))}
      </div>
      <div className="grid gap-[0.1rem] border-t border-line pt-2 text-[0.82rem] text-muted">
        <span>Total {formatSeconds(row.totalTime)}</span>
        <span>Wipes {row.wipes}</span>
      </div>
    </div>
  );
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
