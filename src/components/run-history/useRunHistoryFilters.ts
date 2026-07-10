import { useMemo, useState } from "react";
import type { RunRecord } from "../../lib/runHistory";
import type { CmFilter, HistoryFilterActions, HistoryFilters, ResultFilter, SessionTypeFilter, SortMode } from "./types";
import { filterRuns, sortRuns } from "./utils";

export function useRunHistoryFilters(runs: RunRecord[]): {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  filteredRuns: RunRecord[];
  filteredRunsAllWeeks: RunRecord[];
  scopedRuns: RunRecord[];
  sortedRuns: RunRecord[];
  weekOptions: string[];
  wingOptions: number[];
} {
  const [query, setQuery] = useState("");
  const [weekFilter, setWeekFilter] = useState("all");
  const [wingFilter, setWingFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [cmFilter, setCmFilter] = useState<CmFilter>("all");
  const [sessionTypeFilter, setSessionTypeFilter] = useState<SessionTypeFilter>("full-clear");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const filters = useMemo(
    () => ({ query, weekFilter, wingFilter, resultFilter, cmFilter, sessionTypeFilter, sortMode }),
    [cmFilter, query, resultFilter, sessionTypeFilter, sortMode, weekFilter, wingFilter],
  );

  const filteredRuns = useMemo(
    () => filterRuns(runs, { query, weekFilter, wingFilter, resultFilter, cmFilter, sessionTypeFilter }),
    [cmFilter, query, resultFilter, runs, sessionTypeFilter, weekFilter, wingFilter],
  );
  const filteredRunsAllWeeks = useMemo(
    () => filterRuns(runs, { query, weekFilter: "all", wingFilter, resultFilter, cmFilter, sessionTypeFilter }),
    [cmFilter, query, resultFilter, runs, sessionTypeFilter, wingFilter],
  );
  const scopedRuns = useMemo(
    () => filterRuns(runs, { query: "", weekFilter: "all", wingFilter: "all", resultFilter: "all", cmFilter: "all", sessionTypeFilter }),
    [runs, sessionTypeFilter],
  );
  const sortedRuns = useMemo(() => sortRuns(filteredRuns, sortMode), [filteredRuns, sortMode]);
  const weekOptions = useMemo(() => Array.from(new Set(scopedRuns.map((run) => run.weekKey))).sort((a, b) => b.localeCompare(a)), [scopedRuns]);
  const wingOptions = useMemo(
    () => Array.from(new Set(scopedRuns.map((run) => run.wing).filter((wing): wing is number => wing != null))).sort((a, b) => a - b),
    [scopedRuns],
  );

  // Snap a filter back to "all" when its chosen value drops out of the available
  // options. Done during render (guarded, so it converges) rather than in a
  // post-paint effect, which avoids an extra render pass.
  if (weekFilter !== "all" && !weekOptions.includes(weekFilter)) setWeekFilter("all");
  if (wingFilter !== "all" && wingFilter !== "unmapped" && !wingOptions.includes(Number(wingFilter))) setWingFilter("all");

  function resetFilters() {
    setQuery("");
    setWeekFilter("all");
    setWingFilter("all");
    setResultFilter("all");
    setCmFilter("all");
    setSessionTypeFilter("full-clear");
    setSortMode("newest");
  }

  const filterActions = useMemo(
    () => ({
      setQuery,
      setWeekFilter,
      setWingFilter,
      setResultFilter,
      setCmFilter,
      setSessionTypeFilter,
      setSortMode,
      resetFilters,
    }),
    [],
  );

  return { filters, filterActions, filteredRuns, filteredRunsAllWeeks, scopedRuns, sortedRuns, weekOptions, wingOptions };
}
