import { useEffect, useMemo, useState } from "react";
import { type RunRecord, type WeekSummary } from "../../lib/runHistory";
import type { HistoryFilterActions, HistoryFilters } from "./types";
import { buildWeekWingRows } from "./utils";
import { HistoryFilterPanel } from "./shared";
import { buildDowntimeRows, buildEncounterComparisonRows, buildWingWeekDetail, summarizeWeekTiming } from "./weeks/weekAggregation";
import { WeekComparisonControls } from "./weeks/WeekComparisonControls";
import { WeekTimingStats } from "./weeks/WeekTimingStats";
import { WingPerformanceTable } from "./weeks/WingPerformanceTable";
import { WingDetailPanel } from "./weeks/WingDetailPanel";
import { WeeklySummaryGrid } from "./weeks/WeeklySummaryGrid";

const NO_COMPARISON_OPTION = { value: "none", label: "No comparison" } as const;

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
  const selectedWeekOptions = useMemo(() => weeks.map((week) => ({ value: week.weekKey, label: week.weekKey })), [weeks]);
  const compareWeekOptions = useMemo(() => [NO_COMPARISON_OPTION, ...selectedWeekOptions], [selectedWeekOptions]);

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

      <WeekComparisonControls
        selectedWeekKey={selectedWeekKey}
        compareWeekKey={compareWeekKey}
        selectedWeek={selectedWeek}
        compareWeek={compareWeek}
        selectedWeekOptions={selectedWeekOptions}
        compareWeekOptions={compareWeekOptions}
        onSelectedChange={setSelectedWeekKey}
        onCompareChange={setCompareWeekKey}
      />

      <WeekTimingStats selectedWeek={selectedWeek} compareWeek={compareWeek} selectedTiming={selectedTiming} compareTiming={compareTiming} />

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

      <WeeklySummaryGrid weeks={weeks} runsByWeek={runsByWeek} selectedWeek={selectedWeek} compareWeek={compareWeek} />
    </>
  );
}
