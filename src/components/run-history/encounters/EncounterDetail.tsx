import type { RunRecord } from "../../../lib/runHistory";
import { cx, panelClass, sectionHeadingClass } from "../../../lib/ui";
import type { EncounterPhaseStatus, EncounterSummary } from "../types";
import { formatPercent, formatWing } from "../utils";
import { EncounterDurationChart } from "./EncounterDurationChart";
import { EncounterPhaseTable } from "./EncounterPhaseTable";
import { EncounterRunList } from "./EncounterRunList";

export function EncounterDetail({
  encounter,
  phaseStatus,
  isSelectedFromFilter,
  onSelectRun,
}: {
  encounter: EncounterSummary;
  phaseStatus: EncounterPhaseStatus | null;
  isSelectedFromFilter: boolean;
  onSelectRun: (run: RunRecord) => void;
}) {
  // Sort by start time (oldest to newest)
  const runs = [...encounter.runsList].sort((a, b) => a.start - b.start);

  return (
    <div className={cx(panelClass, "grid gap-[0.85rem]")}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">
            {encounter.bossName}
            {encounter.isCm ? <span className="badge badge-sm badge-outline ml-1">CM</span> : null}
          </h3>
          <p className="muted">
            {formatWing(encounter.wing)} - {encounter.runs} runs - {formatPercent(encounter.killRate)} kill rate
            {!isSelectedFromFilter ? " - outside current filters" : ""}
          </p>
        </div>
      </div>

      {/* Per-phase DPS aggregation */}
      <EncounterPhaseTable runs={runs} phaseStatus={phaseStatus} />

      {/* Pull duration timeline */}
      <EncounterDurationChart runs={runs} bossName={encounter.bossName} />

      {/* Saved log entries */}
      <EncounterRunList key={encounter.encounterKey} runs={runs} onSelectRun={onSelectRun} />
    </div>
  );
}
