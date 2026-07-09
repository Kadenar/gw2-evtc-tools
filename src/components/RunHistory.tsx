import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { downloadBlob } from "../lib/format";
import { fetchBundledRunHistoryBackup, getBundledRunHistorySources, getSingleBundledRunHistorySource } from "../lib/bundledRunHistory";
import { fetchEncounterPhaseData } from "../lib/dpsReport";
import { compactFieldClass, cx, fieldClass, inlineActionsClass, panelClass, runHistoryShellClass } from "../lib/ui";
import {
  ImportMode,
  RunRecord,
  clearRunHistory,
  deleteRunRecord,
  exportRunHistoryBackup,
  getAllRunRecords,
  hasCurrentPhaseData,
  importRunHistoryBackup,
  isRunHistorySupported,
  saveRunRecord,
  summarizeRunsByWeek,
} from "../lib/runHistory";
import { DashboardTab } from "./run-history/DashboardTab";
import { DowntimeTab } from "./run-history/DowntimeTab";
import { EncountersTab } from "./run-history/EncountersTab";
import { ManageRunsTab } from "./run-history/ManageRunsTab";
import { RunsTab } from "./run-history/RunsTab";
import { WeeksTab } from "./run-history/WeeksTab";
import { WingsTab } from "./run-history/WingsTab";
import { EmptyCard } from "./ui/empty-card";
import { AppSelect } from "./ui/app-select";
import type { HistoryView, SessionTypeFilter } from "./run-history/types";
import { useRunHistoryFilters } from "./run-history/useRunHistoryFilters";
import {
  buildRaidNightSummaries,
  buildWingHistorySummaries,
  summarizeEncounters,
} from "./run-history/utils";

const HISTORY_VIEWS: Array<{ id: HistoryView; label: string; group: "Primary" | "Analysis" }> = [
  { id: "dashboard", label: "Dashboard", group: "Primary" },
  { id: "runs", label: "Runs", group: "Primary" },
  { id: "weeks", label: "Weeks", group: "Primary" },
  { id: "wings", label: "Wings", group: "Analysis" },
  { id: "encounters", label: "Encounters", group: "Analysis" },
  { id: "downtime", label: "Downtime", group: "Analysis" },
];

const HISTORY_SCOPE_OPTIONS = [
  { value: "full-clear", label: "Full clear only" },
  { value: "practice", label: "Practice only" },
  { value: "all", label: "All sessions" },
] satisfies Array<{ value: SessionTypeFilter; label: string }>;

const IMPORT_MODE_OPTIONS = [
  { value: "merge", label: "Merge" },
  { value: "replace", label: "Replace" },
] satisfies Array<{ value: ImportMode; label: string }>;

export function RunHistory() {
  const bundledRunHistorySource = getSingleBundledRunHistorySource();
  const bundledRunHistoryFileCount = getBundledRunHistorySources().length;
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"info" | "error">("info");
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [view, setView] = useState<HistoryView>("dashboard");
  const [selectedEncounterKey, setSelectedEncounterKey] = useState<string | null>(null);
  const [selectedNightKey, setSelectedNightKey] = useState<string | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [phaseLoadByRunId, setPhaseLoadByRunId] = useState<Record<string, boolean>>({});
  const [phaseErrorByRunId, setPhaseErrorByRunId] = useState<Record<string, string>>({});

  const { filters, filterActions, filteredRuns, filteredRunsAllWeeks, scopedRuns, sortedRuns, weekOptions, wingOptions } = useRunHistoryFilters(runs);
  const weeks = useMemo(() => summarizeRunsByWeek(filteredRunsAllWeeks), [filteredRunsAllWeeks]);
  const raidNights = useMemo(() => buildRaidNightSummaries(scopedRuns), [scopedRuns]);
  const runTabRaidNights = useMemo(() => buildRaidNightSummaries(filteredRunsAllWeeks), [filteredRunsAllWeeks]);
  const filteredRaidNights = useMemo(() => buildRaidNightSummaries(filteredRuns), [filteredRuns]);
  const wingSummaries = useMemo(() => buildWingHistorySummaries(scopedRuns), [scopedRuns]);
  const encounterSummaries = useMemo(() => summarizeEncounters(scopedRuns), [scopedRuns]);
  const filteredEncounterSummaries = useMemo(() => summarizeEncounters(filteredRuns), [filteredRuns]);
  const latestNight = raidNights[0] ?? null;
  const previousNight = raidNights[1] ?? null;
  const selectedNight = filteredRaidNights.find((night) => night.key === selectedNightKey) ?? filteredRaidNights[0] ?? raidNights[0] ?? null;
  const selectedRunTabNight = runTabRaidNights.find((night) => night.key === selectedNightKey) ?? runTabRaidNights[0] ?? null;
  const selectedEncounter = filteredEncounterSummaries.find((encounter) => encounter.encounterKey === selectedEncounterKey);
  const visibleSelectedCount = selectedRunIds.filter((id) => sortedRuns.some((run) => run.id === id)).length;
  const hasRuns = runs.length > 0;
  const allVisibleSelected = sortedRuns.length > 0 && visibleSelectedCount === sortedRuns.length;

  useEffect(() => {
    void loadRuns();
  }, []);

  useEffect(() => {
    setSelectedRunIds((current) => current.filter((id) => runs.some((run) => run.id === id)));
  }, [runs]);

  useEffect(() => {
    const availableNightKeys = new Set([...filteredRaidNights, ...runTabRaidNights].map((night) => night.key));
    const fallbackNightKey = filteredRaidNights[0]?.key ?? runTabRaidNights[0]?.key ?? null;

    if (!availableNightKeys.size) {
      setSelectedNightKey(null);
      return;
    }

    setSelectedNightKey((current) => (current && availableNightKeys.has(current) ? current : fallbackNightKey));
  }, [filteredRaidNights, runTabRaidNights]);

  useEffect(() => {
    if (!selectedEncounterKey) return;
    if (!filteredEncounterSummaries.some((encounter) => encounter.encounterKey === selectedEncounterKey)) {
      setSelectedEncounterKey(null);
    }
  }, [filteredEncounterSummaries, selectedEncounterKey]);

  useEffect(() => {
    if (!selectedEncounterKey) return;

    const encounter = encounterSummaries.find((entry) => entry.encounterKey === selectedEncounterKey);
    if (!encounter) return;

    void ensureRunPhaseData(encounter.runsList);
  }, [selectedEncounterKey]);

  useEffect(() => {
    if (!status || statusTone !== "info") return;

    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === status ? "" : current));
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [status, statusTone]);

  const selectedEncounterPhaseStatus = useMemo(() => {
    if (!selectedEncounter) return null;

    const fetchableRuns = selectedEncounter.runsList.filter((run) => run.raw.encounter?.jsonAvailable !== false);
    return {
      fetchableRuns: fetchableRuns.length,
      cachedRuns: fetchableRuns.filter((run) => hasCurrentPhaseData(run.phaseData)).length,
      loadingRuns: fetchableRuns.filter((run) => phaseLoadByRunId[run.id]).length,
      failedRuns: fetchableRuns.filter((run) => phaseErrorByRunId[run.id]).length,
    };
  }, [phaseErrorByRunId, phaseLoadByRunId, selectedEncounter]);

  async function loadRuns() {
    if (!isRunHistorySupported()) {
      setStatusTone("error");
      setStatus("IndexedDB is not available in this browser.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setRuns(await getAllRunRecords());
      setStatusTone("info");
      setStatus("");
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Could not load run history.");
    } finally {
      setIsLoading(false);
    }
  }

  async function exportBackup() {
    setIsWorking(true);
    try {
      const backup = await exportRunHistoryBackup();
      const json = JSON.stringify(backup, null, 2);
      downloadBlob(new Blob([json], { type: "application/json" }), `gw2-run-history-${backup.exportedAt.slice(0, 10)}.json`);
      setStatusTone("info");
      setStatus(`Exported ${backup.runs.length} run${backup.runs.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Could not export backup.");
    } finally {
      setIsWorking(false);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsWorking(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      await importParsedBackup(parsed, importMode);
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Could not import backup.");
    } finally {
      setIsWorking(false);
    }
  }

  async function importBundledBackup() {
    if (!bundledRunHistorySource) return;

    setIsWorking(true);
    try {
      const parsed = await fetchBundledRunHistoryBackup(bundledRunHistorySource);
      await importParsedBackup(parsed, "replace");
      setStatusTone("info");
      setStatus(`Loaded bundled backup from ${bundledRunHistorySource.name}.`);
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Could not load bundled backup.");
    } finally {
      setIsWorking(false);
    }
  }

  async function importParsedBackup(parsed: unknown, mode: ImportMode) {
    const result = await importRunHistoryBackup(parsed, mode);
    await loadRuns();
    setStatusTone("info");
    setStatus(
      mode === "replace"
        ? `Restored ${result.saved} run${result.saved === 1 ? "" : "s"}.`
        : `Imported ${result.saved} new and updated ${result.updated} existing run${result.updated === 1 ? "" : "s"}.`,
    );
  }

  async function deleteRun(id: string) {
    await deleteRuns([id], "Deleted run.");
  }

  async function ensureRunPhaseData(runsToEnsure: RunRecord[]) {
    const uniqueRuns = Array.from(new Map(runsToEnsure.map((run) => [run.id, run])).values())
      .filter((run) => !hasCurrentPhaseData(run.phaseData) && run.raw.encounter?.jsonAvailable !== false)
      .sort((left, right) => right.start - left.start);

    for (const run of uniqueRuns) {
      if (phaseLoadByRunId[run.id]) continue;

      setPhaseLoadByRunId((current) => ({ ...current, [run.id]: true }));

      try {
        const phaseData = await fetchEncounterPhaseData(run.permalink);
        const updatedRun: RunRecord = {
          ...run,
          phaseData,
          updatedAt: new Date().toISOString(),
        };

        await saveRunRecord(updatedRun);
        setRuns((current) => current.map((existing) => (existing.id === run.id ? updatedRun : existing)));
        setPhaseErrorByRunId((current) => {
          if (!(run.id in current)) return current;
          const next = { ...current };
          delete next[run.id];
          return next;
        });
      } catch (err) {
        setPhaseErrorByRunId((current) => ({
          ...current,
          [run.id]: err instanceof Error ? err.message : "Could not load phase data.",
        }));
      } finally {
        setPhaseLoadByRunId((current) => {
          if (!(run.id in current)) return current;
          const next = { ...current };
          delete next[run.id];
          return next;
        });
      }
    }
  }

  async function deleteSelectedRuns() {
    if (!selectedRunIds.length || !window.confirm(`Delete ${selectedRunIds.length} selected run${selectedRunIds.length === 1 ? "" : "s"}?`)) return;
    await deleteRuns(selectedRunIds, `Deleted ${selectedRunIds.length} selected run${selectedRunIds.length === 1 ? "" : "s"}.`);
  }

  async function deleteRuns(ids: string[], successMessage: string) {
    setIsWorking(true);
    try {
      await Promise.all(ids.map((id) => deleteRunRecord(id)));
      setSelectedRunIds((current) => current.filter((id) => !ids.includes(id)));
      await loadRuns();
      setStatusTone("info");
      setStatus(successMessage);
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Could not delete run history.");
    } finally {
      setIsWorking(false);
    }
  }

  async function clearHistory() {
    if (!window.confirm("Delete all saved run history from this browser?")) return;

    setIsWorking(true);
    try {
      await clearRunHistory();
      await loadRuns();
      setSelectedRunIds([]);
      setStatusTone("info");
      setStatus("Cleared run history.");
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Could not clear run history.");
    } finally {
      setIsWorking(false);
    }
  }

  function toggleVisibleSelection() {
    const visibleIds = sortedRuns.map((run) => run.id);
    setSelectedRunIds((current) =>
      allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])),
    );
  }

  function toggleRunSelection(id: string) {
    setSelectedRunIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
  }

  function renderActiveView() {
    switch (view) {
      case "dashboard":
        return (
          <DashboardTab
            sessionTypeFilter={filters.sessionTypeFilter}
            latestNight={latestNight}
            previousNight={previousNight}
            wingSummaries={wingSummaries}
            raidNights={raidNights}
            onViewHistory={() => setView("runs")}
          />
        );
      case "runs":
        return (
          <RunsTab
            filters={filters}
            filterActions={filterActions}
            weekOptions={weekOptions}
            wingOptions={wingOptions}
            filteredRaidNights={runTabRaidNights}
            selectedNight={selectedRunTabNight}
            onSelectNight={setSelectedNightKey}
          />
        );
      case "manage":
        return (
          <ManageRunsTab
            filters={filters}
            filterActions={filterActions}
            weekOptions={weekOptions}
            wingOptions={wingOptions}
            sortedRuns={sortedRuns}
            selectedRunIds={selectedRunIds}
            isWorking={isWorking}
            allVisibleSelected={allVisibleSelected}
            onToggleVisibleSelection={toggleVisibleSelection}
            onDeleteSelected={() => void deleteSelectedRuns()}
            onToggleRunSelection={toggleRunSelection}
            onSelectEncounter={(run) => {
              setSelectedEncounterKey(run.encounterKey);
              setView("encounters");
            }}
            onDeleteRun={(run) => void deleteRun(run.id)}
          />
        );
      case "weeks":
        return (
          <WeeksTab
            filters={filters}
            filterActions={filterActions}
            weekOptions={weekOptions}
            wingOptions={wingOptions}
            weeks={weeks}
            weekRuns={filteredRunsAllWeeks}
            onSelectEncounter={(encounterKey) => {
              setSelectedEncounterKey(encounterKey);
              setView("encounters");
            }}
            onEnsureRunPhaseData={(runsToEnsure) => {
              void ensureRunPhaseData(runsToEnsure);
            }}
          />
        );
      case "wings":
        return <WingsTab wingSummaries={wingSummaries} />;
      case "encounters":
        return (
          <EncountersTab
            filters={filters}
            filterActions={filterActions}
            weekOptions={weekOptions}
            wingOptions={wingOptions}
            selectedEncounter={selectedEncounter}
            selectedEncounterPhaseStatus={selectedEncounterPhaseStatus}
            filteredEncounterSummaries={filteredEncounterSummaries}
            onSelectRun={(run) => setSelectedRunIds((current) => Array.from(new Set([...current, run.id])))}
            onSelectEncounter={setSelectedEncounterKey}
          />
        );
      case "downtime":
        return (
          <DowntimeTab
            filters={filters}
            filterActions={filterActions}
            weekOptions={weekOptions}
            wingOptions={wingOptions}
            night={selectedNight}
          />
        );
    }
  }

  const navButtonClass =
    "w-full cursor-pointer rounded-[0.7rem] border border-transparent bg-transparent px-[0.8rem] py-[0.7rem] text-left text-fg transition-colors";
  const activeNavButtonClass =
    "border-primary/55 bg-primary/12 font-black text-accent-2 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]";

  return (
    <section className={runHistoryShellClass}>
      <aside className={cx(panelClass, "sticky top-4 grid gap-4 max-nav:static")}>
        {(["Primary", "Analysis"] as const).map((group) => (
          <div className="grid gap-[0.65rem] max-nav:grid-cols-3" key={group}>
            <span className="eyebrow max-nav:col-span-full">{group}</span>
            {HISTORY_VIEWS.filter((item) => item.group === group).map((item) => (
              <button
                type="button"
                className={cx(navButtonClass, "hover:border-primary/45 hover:bg-primary/10", view === item.id && activeNavButtonClass)}
                aria-current={view === item.id ? "page" : undefined}
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}

        <label className={cx(fieldClass, compactFieldClass, "m-0 max-w-none")}>
          <span className="text-muted">Metric scope</span>
          <AppSelect
            value={filters.sessionTypeFilter}
            onValueChange={(value) => filterActions.setSessionTypeFilter(value as SessionTypeFilter)}
            options={HISTORY_SCOPE_OPTIONS}
          />
        </label>

        <details className="border-t border-line pt-[0.85rem]" open={view === "manage" ? true : undefined}>
          <summary className="cursor-pointer font-black">Manage history</summary>
          <div className="grid gap-[0.65rem]">
            <button
              type="button"
              className={cx(navButtonClass, "hover:border-primary/45 hover:bg-primary/10", view === "manage" && activeNavButtonClass)}
              aria-current={view === "manage" ? "page" : undefined}
              aria-pressed={view === "manage"}
              onClick={() => setView("manage")}
            >
              Manage
            </button>
          </div>
          <label className={cx(fieldClass, compactFieldClass, "max-w-none")}>
            <span className="text-muted">Import mode</span>
            <AppSelect value={importMode} disabled={isWorking} onValueChange={(value) => setImportMode(value as ImportMode)} options={IMPORT_MODE_OPTIONS} />
          </label>
          <div className="grid items-stretch gap-[0.65rem]">
            <button type="button" className="btn btn-block" disabled={!hasRuns || isWorking} onClick={exportBackup}>
              Export backup
            </button>
            <label className={`btn btn-block ${isWorking ? "btn-disabled" : ""}`}>
              Import backup
              <input type="file" className="hidden" accept="application/json,.json" disabled={isWorking} onChange={importBackup} />
            </label>
            <button type="button" className="btn btn-ghost btn-block" disabled={!hasRuns || isWorking} onClick={clearHistory}>
              Clear all
            </button>
          </div>
        </details>
      </aside>

      <div className="grid gap-[0.65rem]">
        {status ? <p className={cx("status-text", statusTone === "error" && "error-text")}>{status}</p> : null}
        {isLoading ? <div className={panelClass}><p className="muted">Loading run history...</p></div> : null}
        {!isLoading && !hasRuns ? (
          <div className={panelClass}>
            <EmptyCard
              title="No saved runs yet"
              description="Load reports in the session timer, then save them here to unlock dashboards, comparisons, and encounter history."
              action={
                bundledRunHistorySource ? (
                  <div className={inlineActionsClass}>
                    <button type="button" className="btn" disabled={isWorking} onClick={() => void importBundledBackup()}>
                      Load bundled backup
                    </button>
                    <span className="muted">{bundledRunHistorySource.name}</span>
                  </div>
                ) : undefined
              }
            />
            {bundledRunHistoryFileCount > 1 ? (
              <p className="muted">Bundled backup import is unavailable because `src/run-data` contains more than one JSON file.</p>
            ) : null}
          </div>
        ) : null}
        {!isLoading && hasRuns ? renderActiveView() : null}
      </div>
    </section>
  );
}
