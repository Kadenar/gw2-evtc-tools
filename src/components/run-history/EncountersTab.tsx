import { panelClass } from "../../lib/ui";
import { EmptyCard } from "../ui/empty-card";
import type { RunRecord } from "../../lib/runHistory";
import type { EncounterPhaseStatus, EncounterSummary, HistoryFilterActions, HistoryFilters } from "./types";
import { HistoryFilterPanel } from "./shared";
import { EncounterDetail } from "./encounters/EncounterDetail";
import { EncounterListPanel } from "./encounters/EncounterListPanel";

export function EncountersTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  selectedEncounter,
  selectedEncounterPhaseStatus,
  filteredEncounterSummaries,
  onSelectRun,
  onSelectEncounter,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  selectedEncounter: EncounterSummary | undefined;
  selectedEncounterPhaseStatus: EncounterPhaseStatus | null;
  filteredEncounterSummaries: EncounterSummary[];
  onSelectRun: (run: RunRecord) => void;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Encounters"
      />
      <EncounterListPanel
        encounters={filteredEncounterSummaries}
        selectedEncounterKey={selectedEncounter?.encounterKey ?? null}
        onSelectEncounter={onSelectEncounter}
      />
      {selectedEncounter ? (
        <EncounterDetail
          encounter={selectedEncounter}
          phaseStatus={selectedEncounterPhaseStatus}
          isSelectedFromFilter={filteredEncounterSummaries.some((encounter) => encounter.encounterKey === selectedEncounter.encounterKey)}
          onSelectRun={onSelectRun}
        />
      ) : (
        <div className={panelClass}>
          <EmptyCard title="No encounter selected" description="Choose an encounter from the list above to inspect pull history, timings, and cached phase data." />
        </div>
      )}
    </>
  );
}
