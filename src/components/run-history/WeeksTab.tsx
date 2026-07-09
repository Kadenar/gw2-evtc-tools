import { useEffect, useMemo, useState } from "react";
import { type RunRecord, type WeekSummary } from "../../lib/runHistory";
import type { HistoryFilterActions, HistoryFilters } from "./types";
import { buildWeekWingRows } from "./utils";
import { HistoryFilterPanel } from "./shared";
import { splitPanelClass } from "../../lib/ui";
import { buildDowntimeRows, buildEncounterComparisonRows, buildWingWeekDetail, summarizeWeekTiming } from "./weeks/weekAggregation";
import { WeekComparisonHeader } from "./weeks/WeekComparisonHeader";
import { WingPerformanceTable } from "./weeks/WingPerformanceTable";
import { WingDetailPanel } from "./weeks/WingDetailPanel";
import { WeeklySummaryGrid } from "./weeks/WeeklySummaryGrid";

export function WeeksTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  weeks,
  weekRuns,
  onSelectEncounter,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  weeks: WeekSummary[];
  weekRuns: RunRecord[];
  onSelectEncounter: (encounterKey: string) => void;
}) {
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(weeks[0]?.weekKey ?? "none");
  const [compareWeekKey, setCompareWeekKey] = useState<string>(weeks[1]?.weekKey ?? "none");
  const [selectedWing, setSelectedWing] = useState<number | null>(null);

  const runsByWeek = useMemo(
    () => new Map(weeks.map((week) => [week.weekKey, weekRuns.filter((run) => run.weekKey === week.weekKey)])),
    [weeks, weekRuns],
  );
  const selectedWeek = selectedWeekKey === "none" ? null : weeks.find((week) => week.weekKey === selectedWeekKey) ?? null;
  const compareWeek = compareWeekKey === "none" ? null : weeks.find((week) => week.weekKey === compareWeekKey) ?? null;
  const selectedRuns = selectedWeek ? runsByWeek.get(selectedWeek.weekKey) ?? [] : [];
  const compareRuns = compareWeek ? runsByWeek.get(compareWeek.weekKey) ?? [] : [];
  const selectedTiming = useMemo(() => summarizeWeekTiming(selectedRuns), [selectedRuns]);
  const compareTiming = useMemo(() => summarizeWeekTiming(compareRuns), [compareRuns]);
  const wingRows = useMemo(() => buildWeekWingRows(selectedRuns, compareRuns), [compareRuns, selectedRuns]);
  const selectedWingDetail = useMemo(() => buildWingWeekDetail(selectedRuns, selectedWing), [selectedRuns, selectedWing]);
  const compareWingDetail = useMemo(() => buildWingWeekDetail(compareRuns, selectedWing), [compareRuns, selectedWing]);
  const encounterRows = useMemo(
    () => buildEncounterComparisonRows(selectedWingDetail?.encounters ?? [], compareWingDetail?.encounters ?? []),
    [compareWingDetail?.encounters, selectedWingDetail?.encounters],
  );
  const downtimeRows = useMemo(
    () => buildDowntimeRows(selectedWingDetail?.raidNights ?? [], compareWingDetail?.raidNights ?? []),
    [compareWingDetail?.raidNights, selectedWingDetail?.raidNights],
  );
  useEffect(() => {
    if (!weeks.length) {
      setSelectedWeekKey("none");
      setCompareWeekKey("none");
      return;
    }

    setSelectedWeekKey((current) => {
      if (current !== "none" && weeks.some((week) => week.weekKey === current)) return current;
      return weeks[0].weekKey;
    });

    setCompareWeekKey((current) => {
      if (current === "none") return current;
      if (weeks.some((week) => week.weekKey === current) && current !== weeks[0].weekKey) return current;
      return weeks[1]?.weekKey ?? "none";
    });
  }, [weeks]);

  useEffect(() => {
    if (selectedWeekKey === "none" || compareWeekKey === "none") return;
    if (selectedWeekKey !== compareWeekKey) return;
    setCompareWeekKey(weeks.find((week) => week.weekKey !== selectedWeekKey)?.weekKey ?? "none");
  }, [compareWeekKey, selectedWeekKey, weeks]);

  useEffect(() => {
    if (!wingRows.length) {
      setSelectedWing(null);
      return;
    }

    setSelectedWing((current) => {
      if (current != null && wingRows.some((row) => row.wing === current)) return current;
      return wingRows.find((row) => row.current != null)?.wing ?? wingRows[0].wing;
    });
  }, [wingRows]);

  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Weeks"
        showWeekFilter={false}
        showSortFilter={false}
      />

      <WeeklySummaryGrid
        weeks={weeks}
        runsByWeek={runsByWeek}
        selectedWeek={selectedWeek}
        compareWeek={compareWeek}
        onSelectWeek={setSelectedWeekKey}
        onCompareWeek={setCompareWeekKey}
      />

      <WeekComparisonHeader
        selectedWeek={selectedWeek}
        compareWeek={compareWeek}
        selectedTiming={selectedTiming}
        compareTiming={compareTiming}
      />

      <div className={splitPanelClass}>
        <WingPerformanceTable
          selectedWeek={selectedWeek}
          compareWeek={compareWeek}
          rows={wingRows}
          selectedWing={selectedWing}
          onSelectWing={setSelectedWing}
        />

        <WingDetailPanel
          selectedWeek={selectedWeek}
          compareWeek={compareWeek}
          selectedWing={selectedWing}
          selectedDetail={selectedWingDetail}
          compareDetail={compareWingDetail}
          encounterRows={encounterRows}
          downtimeRows={downtimeRows}
          onSelectEncounter={onSelectEncounter}
        />
      </div>
    </>
  );
}
