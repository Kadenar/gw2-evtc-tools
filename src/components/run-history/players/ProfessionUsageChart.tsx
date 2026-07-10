// PieChart and legend for profession (class/build) usage in expanded player details.
// Shows which professions a player used most across all saved weeks.

import { Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatPercent, pluralize } from "../utils";
import type { ProfessionUsageRow } from "./playerAggregation";

export function ProfessionUsageChart({ professionUsage }: { professionUsage: ProfessionUsageRow[] }) {
  return (
    <article className="grid gap-3 rounded-xl border border-line bg-surface p-3">
      <div>
        <h4 className="mb-[0.2rem] mt-0 text-[1rem]">Role / build usage</h4>
        <p className="muted">Profession usage from cached player data across all saved weeks in this wing.</p>
      </div>
      {professionUsage.length ? (
        <div className="grid items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <div className="h-34 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={professionUsage.map((entry) => ({ ...entry, fill: entry.color }))}
                  dataKey="runs"
                  nameKey="profession"
                  innerRadius={34}
                  outerRadius={56}
                  paddingAngle={2}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-[0.45rem]">
            {professionUsage.map((entry) => (
              <div className="grid gap-[0.15rem]" key={entry.profession}>
                <div className="flex items-center justify-between gap-3 text-[0.88rem]">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                    {entry.profession}
                  </span>
                  <strong>{formatPercent(entry.share)}</strong>
                </div>
                <small className="text-muted">{entry.runs} {pluralize(entry.runs, "run")}</small>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted">No profession data for this player.</p>
      )}
    </article>
  );
}
