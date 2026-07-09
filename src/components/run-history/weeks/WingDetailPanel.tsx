// Selected-wing detail panel: owns the local tab state and routes to the
// overview / encounters / downtime sub-panels.

import { useState } from "react";
import { panelClass, sectionHeadingClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import { formatWing } from "../utils";
import type { DetailTab } from "./weekFormat";
import { formatDetailTabLabel } from "./weekFormat";
import type { DowntimeRow, EncounterComparisonRow, WingWeekDetail } from "./weekAggregation";
import { WingOverviewPanel } from "./WingOverviewPanel";
import { WingEncounterPanel } from "./WingEncounterPanel";
import { WingDowntimePanel } from "./WingDowntimePanel";

export function WingDetailPanel({
  selectedWeek,
  compareWeek,
  selectedWing,
  selectedDetail,
  compareDetail,
  encounterRows,
  downtimeRows,
  onSelectEncounter,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  selectedWing: number | null;
  selectedDetail: WingWeekDetail;
  compareDetail: WingWeekDetail;
  encounterRows: EncounterComparisonRow[];
  downtimeRows: DowntimeRow[];
  onSelectEncounter: (encounterKey: string) => void;
}) {
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Selected wing detail</h3>
          <p className="muted">
            {selectedWing != null
              ? `${formatWing(selectedWing)}${selectedWeek ? ` - ${selectedWeek.weekKey}` : ""}${compareWeek ? ` vs ${compareWeek.weekKey}` : ""}`
              : "Pick a wing from the comparison table above."}
          </p>
        </div>
      </div>

      {selectedWing != null && (selectedDetail || compareDetail) ? (
        <>
          <div role="tablist" className="tabs tabs-box">
            {(["overview", "encounters", "downtime"] as const).map((tab) => (
              <button
                type="button"
                role="tab"
                className={`tab ${detailTab === tab ? "tab-active" : ""}`}
                aria-selected={detailTab === tab}
                onClick={() => setDetailTab(tab)}
                key={tab}
              >
                {formatDetailTabLabel(tab)}
              </button>
            ))}
          </div>

          {detailTab === "overview" ? (
            <WingOverviewPanel selectedWeek={selectedWeek} compareWeek={compareWeek} selectedDetail={selectedDetail} compareDetail={compareDetail} />
          ) : null}

          {detailTab === "encounters" ? (
            <WingEncounterPanel selectedWeek={selectedWeek} compareWeek={compareWeek} rows={encounterRows} onSelectEncounter={onSelectEncounter} />
          ) : null}

          {detailTab === "downtime" ? <WingDowntimePanel selectedWeek={selectedWeek} compareWeek={compareWeek} rows={downtimeRows} /> : null}
        </>
      ) : (
        <EmptyCard title="No wing detail available" description="Select a wing with saved data to compare encounters and downtime." />
      )}
    </div>
  );
}
