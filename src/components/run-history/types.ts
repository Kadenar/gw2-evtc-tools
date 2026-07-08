import type { RunRecord, RunSessionType } from "../../lib/runHistory";

export type ResultFilter = "all" | "kill" | "wipe" | "unknown";
export type CmFilter = "all" | "cm" | "normal";
export type SessionTypeFilter = "all" | RunSessionType;
export type SortMode = "newest" | "oldest" | "duration" | "dps" | "encounter";
export type HistoryView = "dashboard" | "runs" | "manage" | "weeks" | "wings" | "encounters" | "downtime";

export type HistoryFilters = {
  query: string;
  weekFilter: string;
  wingFilter: string;
  resultFilter: ResultFilter;
  cmFilter: CmFilter;
  sessionTypeFilter: SessionTypeFilter;
  sortMode: SortMode;
};

export type HistoryFilterActions = {
  setQuery: (value: string) => void;
  setWeekFilter: (value: string) => void;
  setWingFilter: (value: string) => void;
  setResultFilter: (value: ResultFilter) => void;
  setCmFilter: (value: CmFilter) => void;
  setSessionTypeFilter: (value: SessionTypeFilter) => void;
  setSortMode: (value: SortMode) => void;
  resetFilters: () => void;
};

export type RunStats = {
  runs: number;
  kills: number;
  wipes: number;
  unknown: number;
  fullClearRuns: number;
  practiceRuns: number;
  killRate: number | null;
  totalDuration: number;
  averageDuration: number;
  bestDuration: number | null;
  averageCompDps: number | null;
};

export type EncounterSummary = RunStats & {
  encounterKey: string;
  bossName: string;
  wing: number | null;
  isCm: boolean;
  runsList: RunRecord[];
};

export type RaidNightSummary = {
  key: string;
  label: string;
  shortLabel: string;
  sessionType: RunSessionType;
  weekKey: string;
  runs: RunRecord[];
  wings: number[];
  kills: number;
  wipes: number;
  combatTime: number;
  totalTime: number;
  downtime: number;
  start: number;
};

export type WingHistorySummary = {
  wing: number;
  runs: RunRecord[];
  latestTime: number | null;
  bestTime: number | null;
  bestTimeStart: number | null;
  averageTime: number | null;
  wipes: number;
  comparableSessions: number;
  partialSessions: number;
  trend: string;
};
