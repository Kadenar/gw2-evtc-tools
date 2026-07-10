// Per-raid-night downtime comparison for the selected wing. Each raid night is a
// card: selected night and compare night stacked as rows across Night / Total /
// Downtime columns, with the change + largest-gap contributor called out below.

import { formatSeconds } from "../../../lib/format";
import { cx } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import type { RaidNightSummary } from "../types";
import { EmptyCard } from "../../ui/empty-card";
import type { DowntimeRow } from "./weekAggregation";

export function WingDowntimePanel({
  selectedWeek,
  compareWeek,
  rows,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: DowntimeRow[];
}) {
  if (!rows.length) {
    return <EmptyCard title="No downtime data" description="This wing does not have enough saved raid-night data to compare downtime." />;
  }

  const selectedLabel = selectedWeek?.weekKey ?? "Selected";
  const compareLabel = compareWeek?.weekKey ?? "Compare";

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <article key={row.key} className="grid gap-[0.65rem] rounded-xl border border-line bg-surface p-[0.8rem]">
          <div className="grid gap-[0.35rem]">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-x-4 text-[0.82rem] font-black uppercase tracking-[0.04em] text-muted">
              <span>Raid night</span>
              <span className="text-right">Total</span>
              <span className="text-right">Downtime</span>
            </div>
            <NightRow badge={selectedLabel} badgeClass="badge-warning" night={row.current} />
            <NightRow badge={compareLabel} badgeClass="badge-info" night={row.previous} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-[0.55rem] text-[0.92rem]">
            <span>
              <span className="text-muted">Change </span>
              <strong>{row.change}</strong>
            </span>
            <span className="text-muted">
              Largest gap: <span className="text-fg">{row.note}</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function NightRow({ badge, badgeClass, night }: { badge: string; badgeClass: string; night: RaidNightSummary | null }) {
  return (
    <div className={cx("grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-x-4", !night && "opacity-60")}>
      <span className="flex min-w-0 items-center gap-2">
        <span className={cx("badge badge-sm badge-outline shrink-0", badgeClass)}>{badge}</span>
        <span className="min-w-0 truncate">{night?.label ?? "No matching night"}</span>
      </span>
      <span className="text-right tabular-nums">{night ? formatSeconds(night.totalTime) : "N/A"}</span>
      <strong className="text-right tabular-nums">{night ? formatSeconds(night.downtime) : "N/A"}</strong>
    </div>
  );
}
