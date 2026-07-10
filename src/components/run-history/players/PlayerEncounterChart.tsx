// LineChart for per-encounter DPS trends in expanded player details.
// Shows all historical pulls for a single encounter, with hover tooltip.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDps } from "../utils";
import { formatCompactDpsTick } from "./playerFormat";
import type { PlayerChartRow } from "./playerAggregation";

export function PlayerEncounterChart({ chartRows }: { chartRows: PlayerChartRow[] }) {
  return (
    <div className="h-40 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartRows} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
          <CartesianGrid vertical={false} stroke="color-mix(in oklab, var(--color-base-content) 14%, transparent)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            tickMargin={8}
            tick={{ fill: "var(--color-base-content)", fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={54}
            tickMargin={8}
            tickFormatter={formatCompactDpsTick}
            tick={{ fill: "var(--color-base-content)", fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "color-mix(in oklab, var(--color-base-content) 20%, transparent)", strokeDasharray: "4 4" }}
            content={<PlayerEncounterTooltip />}
          />
          <Line
            type="linear"
            dataKey="dps"
            name="All pulls"
            stroke="var(--color-success)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--color-success)" }}
            activeDot={{ r: 4, fill: "var(--color-success)" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlayerEncounterTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    value?: number | null;
    payload?: {
      profession?: string | null;
      weekKey?: string;
      encounter?: string;
      isCurrentWeek?: boolean;
    };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="grid min-w-44 gap-1 rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <strong>{label}</strong>
      {payload[0]?.payload?.weekKey ? (
        <span className="text-[0.8rem] text-muted">
          {payload[0].payload.weekKey}
          {payload[0].payload.isCurrentWeek ? " • current week" : ""}
        </span>
      ) : null}
      {payload
        .filter((entry) => entry.value != null)
        .map((entry) => (
          <div className="flex items-center justify-between gap-3 text-[0.84rem]" key={String(entry.dataKey)}>
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="text-right">
              <strong>{formatDps(entry.value ?? null)}</strong>
              <small className="block text-muted">{entry.payload?.profession ?? "Unknown profession"}</small>
            </span>
          </div>
        ))}
    </div>
  );
}
