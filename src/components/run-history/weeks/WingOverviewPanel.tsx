// Overview cards for the selected wing: selected vs compare timing, deltas, squad DPS.

import { formatSeconds } from "../../../lib/format";
import { overviewGridClass, summaryCardClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { formatDps, formatTimeDelta } from "../utils";
import type { WingWeekDetail } from "./weekAggregation";

export function WingOverviewPanel({
  selectedWeek,
  compareWeek,
  selectedDetail,
  compareDetail,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  selectedDetail: WingWeekDetail;
  compareDetail: WingWeekDetail;
}) {
  return (
    <div className={overviewGridClass}>
      <article className={summaryCardClass}>
        <span className="text-muted">{selectedWeek?.weekKey ?? "Selected week"}</span>
        <strong className="wrap-anywhere text-[1.25rem]">{selectedDetail ? formatSeconds(selectedDetail.totalTime) : "N/A"}</strong>
        <small className="text-muted">{selectedDetail?.encounterLabel ?? "No selected-week data for this wing"}</small>
        <small className="text-muted">
          Combat {selectedDetail ? formatSeconds(selectedDetail.combatTime) : "N/A"} | Downtime {selectedDetail ? formatSeconds(selectedDetail.downtime) : "N/A"} |{" "}
          {selectedDetail ? `${selectedDetail.kills} kills / ${selectedDetail.wipes} wipes` : "No data"}
        </small>
      </article>
      <article className={summaryCardClass}>
        <span className="text-muted">{compareWeek?.weekKey ?? "Comparison"}</span>
        <strong className="wrap-anywhere text-[1.25rem]">{compareDetail ? formatSeconds(compareDetail.totalTime) : "N/A"}</strong>
        <small className="text-muted">{compareDetail?.encounterLabel ?? "No comparison selected"}</small>
        <small className="text-muted">
          Combat {compareDetail ? formatSeconds(compareDetail.combatTime) : "N/A"} | Downtime {compareDetail ? formatSeconds(compareDetail.downtime) : "N/A"} |{" "}
          {compareDetail ? `${compareDetail.kills} kills / ${compareDetail.wipes} wipes` : "No data"}
        </small>
      </article>
      <article className={summaryCardClass}>
        <span className="text-muted">Time change</span>
        <strong className="wrap-anywhere text-[1.25rem]">{formatTimeDelta(selectedDetail?.totalTime, compareDetail?.totalTime)}</strong>
        <small className="text-muted">{formatTimeDelta(selectedDetail?.combatTime, compareDetail?.combatTime)} combat</small>
        <small className="text-muted">{formatTimeDelta(selectedDetail?.downtime, compareDetail?.downtime)} downtime</small>
      </article>
      <article className={summaryCardClass}>
        <span className="text-muted">Squad DPS</span>
        <strong className="wrap-anywhere text-[1.25rem]">{formatDps(selectedDetail?.averageCompDps ?? null)}</strong>
        <small className="text-muted">{selectedWeek?.weekKey ?? "Selected"} average comp DPS</small>
        <small className="text-muted">{compareWeek ? `${compareWeek.weekKey}: ${formatDps(compareDetail?.averageCompDps ?? null)}` : "No comparison selected"}</small>
      </article>
    </div>
  );
}
