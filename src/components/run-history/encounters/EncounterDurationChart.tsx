import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSeconds } from "../../../lib/format";
import type { RunRecord } from "../../../lib/runHistory";
import { formatDps, formatDurationTick, formatPullTickDate, formatResult, formatRunDate } from "../utils";

export function EncounterDurationChart({ runs, bossName }: { runs: RunRecord[]; bossName: string }) {
  // Transform runs to chart data with labels and colors
  const chartRows = runs.map((run) => ({
    id: run.id,
    permalink: run.permalink,
    duration: run.duration,
    result: formatResult(run.success),
    fill: getEncounterBarFill(run.success),
    dateLabel: formatRunDate(run),
    tickLabel: formatPullTickDate(run),
    dpsLabel: formatDps(run.compDps),
  }));
  const chartWidth = Math.max(720, chartRows.length * 56);

  return (
    <div className="grid gap-[0.45rem]">
      <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
        <div>
          <h4 className="mb-[0.2rem] mt-0">Pull Duration History</h4>
        </div>
        <div className="flex flex-wrap gap-x-[0.9rem] gap-y-[0.55rem] text-[0.9rem] text-muted" aria-label="Pull result legend">
          <span>
            <i className="legend-dot kill" />
            Kill
          </span>
          <span>
            <i className="legend-dot wipe" />
            Wipe
          </span>
          <span>
            <i className="legend-dot unknown" />
            Unknown
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-base-100 p-[0.65rem]">
        <div className="h-72 min-w-full" style={{ width: `${chartWidth}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              margin={{ top: 10, right: 10, bottom: 40, left: 4 }}
              aria-label={`${bossName} pull duration history. Older pulls are on the left and newer pulls are on the right.`}
            >
              <CartesianGrid vertical={false} stroke="color-mix(in oklab, var(--color-base-content) 14%, transparent)" strokeDasharray="4 4" />
              <XAxis
                dataKey="tickLabel"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={58}
                tickMargin={10}
                tick={{ fill: "var(--color-base-content)", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={58}
                tickMargin={8}
                tickFormatter={formatDurationTick}
                tick={{ fill: "var(--color-base-content)", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--color-primary) 8%, transparent)" }}
                content={<EncounterDurationTooltip />}
              />
              <Bar
                dataKey="duration"
                radius={[8, 8, 0, 0]}
                barSize={26}
                activeBar={false}
                shape={<EncounterDurationBarShape />}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Custom bar shape: clickable linked rectangles
function EncounterDurationBarShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: {
    permalink: string;
    dateLabel: string;
    result: string;
    duration: number;
    dpsLabel: string;
  };
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
  if (!payload || width <= 0 || height <= 0) return null;

  return (
    <a
      href={payload.permalink}
      target="_blank"
      rel="noreferrer"
      aria-label={`${payload.dateLabel} ${payload.result} ${formatSeconds(payload.duration)} ${payload.dpsLabel} DPS`}
    >
      <title>{`${payload.dateLabel} - ${payload.result} - ${formatSeconds(payload.duration)} - ${payload.dpsLabel} DPS`}</title>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill={fill}
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}

// Hover tooltip content
function EncounterDurationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      dateLabel: string;
      result: string;
      duration: number;
      dpsLabel: string;
    };
  }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="grid min-w-48 gap-[0.35rem] rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <strong>{row.dateLabel}</strong>
      <div className="grid gap-[0.18rem] text-[0.88rem]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Result</span>
          <strong>{row.result}</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Duration</span>
          <strong>{formatSeconds(row.duration)}</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">DPS</span>
          <strong>{row.dpsLabel}</strong>
        </div>
      </div>
    </div>
  );
}

// Bar color by result (kill/wipe/unknown)
function getEncounterBarFill(success: boolean | null): string {
  if (success == null) return "color-mix(in oklab, var(--color-info) 24%, transparent)";
  return success
    ? "color-mix(in oklab, var(--color-success) 30%, transparent)"
    : "color-mix(in oklab, var(--color-error) 28%, transparent)";
}
