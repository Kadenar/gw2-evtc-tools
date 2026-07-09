import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getEncounterSortOrder } from "../../data/encounters";
import { formatSeconds } from "../../lib/format";
import { cx, panelClass, sectionHeadingClass, summaryCardClass, tableWrapClass } from "../../lib/ui";
import { EmptyCard } from "../ui/empty-card";
import { hasCurrentPhaseData, type RunRecord } from "../../lib/runHistory";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import type { EncounterSummary, HistoryFilterActions, HistoryFilters } from "./types";
import { average, formatDps, formatPercent, formatPullTickDate, formatResult, formatRunDate, formatWing, getResultClass } from "./utils";
import { HistoryFilterPanel } from "./shared";

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
  selectedEncounterPhaseStatus: {
    fetchableRuns: number;
    cachedRuns: number;
    loadingRuns: number;
    failedRuns: number;
  } | null;
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
      {selectedEncounter ? (
        <EncounterDetail
          encounter={selectedEncounter}
          phaseStatus={selectedEncounterPhaseStatus}
          isSelectedFromFilter={filteredEncounterSummaries.some((encounter) => encounter.encounterKey === selectedEncounter.encounterKey)}
          onSelectRun={onSelectRun}
        />
      ) : (
        <div className={panelClass}>
          <EmptyCard title="No encounter selected" description="Choose an encounter from the list below to inspect pull history, timings, and cached phase data." />
        </div>
      )}
      <EncounterListPanel encounters={filteredEncounterSummaries} selectedEncounterKey={selectedEncounter?.encounterKey ?? null} onSelectEncounter={onSelectEncounter} />
    </>
  );
}

function EncounterListPanel({
  encounters,
  selectedEncounterKey,
  onSelectEncounter,
}: {
  encounters: EncounterSummary[];
  selectedEncounterKey: string | null;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  const encounterGroups = buildEncounterGroups(encounters);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [lastAutoOpenedEncounterKey, setLastAutoOpenedEncounterKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEncounterKey) return;
    if (selectedEncounterKey === lastAutoOpenedEncounterKey) return;

    const selectedGroup = encounterGroups.find((group) =>
      group.encounters.some((encounter) => encounter.encounterKey === selectedEncounterKey)
    );

    if (!selectedGroup) return;

    setOpenGroups((current) => ({ ...current, [selectedGroup.key]: true }));
    setLastAutoOpenedEncounterKey(selectedEncounterKey);
  }, [encounterGroups, lastAutoOpenedEncounterKey, selectedEncounterKey]);

  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Encounter list</h3>
        </div>
      </div>
      {encounterGroups.length ? (
        <div className="grid gap-[0.45rem]">
        {encounterGroups.map((group) => (
          <Collapsible
            className="grid gap-[0.6rem]"
            key={group.key}
            open={openGroups[group.key] ?? false}
            onOpenChange={(open) =>
              setOpenGroups((current) => ({ ...current, [group.key]: open }))
            }
          >
            <section className={cx(summaryCardClass, "gap-[0.75rem] p-[0.9rem]")}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h5 className="m-0 text-[0.98rem]">{group.label}</h5>
                  <span className="badge badge-outline">
                    {group.encounters.length} encounter{group.encounters.length === 1 ? "" : "s"}
                  </span>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-between gap-2 px-2 text-[0.82rem] font-black uppercase tracking-[0.04em] text-muted"
                  >
                    <span>{openGroups[group.key] ? "Hide" : "Show"}</span>
                    <ChevronDown
                      className={cx(
                        "size-4 transition-transform duration-200",
                        openGroups[group.key] && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="grid gap-[0.55rem]">
                {group.encounters.map((encounter) => {
                  const latest = [...encounter.runsList].sort((a, b) => b.start - a.start)[0];
                  const isSelected = selectedEncounterKey === encounter.encounterKey;

                  return (
                    <button
                      type="button"
                      className={cx(
                        "grid w-full items-center gap-3 rounded-xl border border-line bg-base-100 px-[0.8rem] py-[0.8rem] text-left text-fg transition-colors hover:border-primary/45 hover:bg-primary/5 max-nav:grid-cols-1 [grid-template-columns:minmax(0,1.5fr)_repeat(4,minmax(72px,auto))]",
                        isSelected && "border-primary/55 bg-primary/8",
                      )}
                      onClick={() => onSelectEncounter(encounter.encounterKey)}
                      key={encounter.encounterKey}
                    >
                      <div className="grid min-w-0 gap-[0.2rem]">
                        <span className="inline-flex min-w-0 flex-wrap items-center gap-[0.4rem]">
                          <strong className="truncate">{encounter.bossName}</strong>
                          {encounter.isCm ? <span className="badge badge-sm badge-outline">CM</span> : null}
                        </span>
                        <span className="text-[0.8rem] text-muted">
                          {encounter.runs} run{encounter.runs === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="grid gap-[0.15rem]">
                        <span className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-muted">Latest</span>
                        <strong className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                          {latest ? formatSeconds(latest.duration) : "N/A"}
                        </strong>
                      </div>
                      <div className="grid gap-[0.15rem]">
                        <span className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-muted">Best</span>
                        <strong className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                          {encounter.bestDuration == null ? "N/A" : formatSeconds(encounter.bestDuration)}
                        </strong>
                      </div>
                      <div className="grid gap-[0.15rem]">
                        <span className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-muted">Wipes</span>
                        <strong className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                          {encounter.wipes}
                        </strong>
                      </div>
                      <div className="grid gap-[0.15rem]">
                        <span className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-muted">Kill rate</span>
                        <strong className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                          {formatPercent(encounter.killRate)}
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </section>
          </Collapsible>
        ))}
        </div>
      ) : (
        <EmptyCard title="No encounters match" description="The current filters removed every encounter from the list." />
      )}
    </div>
  );
}

function buildEncounterGroups(encounters: EncounterSummary[]): Array<{ key: string; label: string; encounters: EncounterSummary[] }> {
  const byWing = new Map<number | null, EncounterSummary[]>();

  for (const encounter of encounters) {
    byWing.set(encounter.wing, [...(byWing.get(encounter.wing) ?? []), encounter]);
  }

  return Array.from(byWing.entries())
    .sort(([leftWing], [rightWing]) => (leftWing ?? Number.POSITIVE_INFINITY) - (rightWing ?? Number.POSITIVE_INFINITY))
    .map(([wing, wingEncounters]) => ({
      key: wing == null ? "wing:unknown" : `wing:${wing}`,
      label: formatWing(wing),
      encounters: [...wingEncounters].sort(compareEncountersByWingOrder),
    }));
}

function compareEncountersByWingOrder(left: EncounterSummary, right: EncounterSummary): number {
  const leftBossId = left.runsList[0]?.bossId ?? null;
  const rightBossId = right.runsList[0]?.bossId ?? null;
  const leftOrder = getEncounterSortOrder(leftBossId, left.bossName);
  const rightOrder = getEncounterSortOrder(rightBossId, right.bossName);

  return leftOrder - rightOrder
    || left.bossName.localeCompare(right.bossName)
    || Number(left.isCm) - Number(right.isCm);
}

function EncounterDetail({
  encounter,
  phaseStatus,
  isSelectedFromFilter,
  onSelectRun,
}: {
  encounter: EncounterSummary;
  phaseStatus: {
    fetchableRuns: number;
    cachedRuns: number;
    loadingRuns: number;
    failedRuns: number;
  } | null;
  isSelectedFromFilter: boolean;
  onSelectRun: (run: RunRecord) => void;
}) {
  const runs = [...encounter.runsList].sort((a, b) => a.start - b.start);
  const maxDuration = Math.max(...runs.map((run) => run.duration), 1);
  const phaseSummaries = summarizeEncounterPhases(runs);
  const showAverageBossDps = new Set(runs.map((run) => run.weekKey)).size > 1;
  const [isRunListExpanded, setIsRunListExpanded] = useState(false);

  useEffect(() => {
    setIsRunListExpanded(false);
  }, [encounter.encounterKey]);

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

      {phaseStatus?.fetchableRuns ? (
        <div className="grid gap-[0.45rem]">
          <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
            <div>
              <h4 className="mb-[0.2rem] mt-0">Phase DPS</h4>
              <p className="muted">
                Cached {phaseStatus.cachedRuns}/{phaseStatus.fetchableRuns} log{phaseStatus.fetchableRuns === 1 ? "" : "s"}
                {phaseStatus.loadingRuns ? ` - loading ${phaseStatus.loadingRuns}` : ""}
                {phaseStatus.failedRuns ? ` - ${phaseStatus.failedRuns} failed` : ""}
              </p>
            </div>
          </div>

          {phaseSummaries.length ? (
            <div className={tableWrapClass}>
              <table>
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Targets</th>
                    {showAverageBossDps ? <th>Avg boss DPS</th> : null}
                    <th>Latest boss DPS</th>
                    <th>Avg total DPS</th>
                    <th>Avg time</th>
                    <th>Cached</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseSummaries.map((phase) => (
                    <tr key={phase.key}>
                      <td>{phase.name}</td>
                      <td>{formatPhaseTargets(phase.targetNames)}</td>
                      {showAverageBossDps ? <td>{formatDps(phase.averageSquadTargetDps)}</td> : null}
                      <td>{formatDps(phase.latestSquadTargetDps)}</td>
                      <td>{formatDps(phase.averageSquadDps)}</td>
                      <td>{formatSeconds(phase.averageDurationSeconds)}</td>
                      <td>{phase.cachedRuns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">{phaseStatus.loadingRuns ? "Loading phase data for saved logs..." : "No cached phase data yet."}</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-[0.45rem]">
        <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
          <div>
            <h4 className="mb-[0.2rem] mt-0">Pull Duration History</h4>
          </div>
          <div className="flex flex-wrap gap-x-[0.9rem] gap-y-[0.55rem] text-[0.9rem] text-muted" aria-label="Pull result legend">
            <span>
              <i className="legend-dot kill" />
              Kill
            </span>
            <span>
              <i className="legend-dot wipe" />
              Wipe
            </span>
            <span>
              <i className="legend-dot unknown" />
              Unknown
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-base-100 p-[0.65rem]">
          <div className="flex min-h-22.5 w-max min-w-full items-end gap-[0.35rem]" aria-label={`${encounter.bossName} pull duration history. Older pulls are on the left and newer pulls are on the right.`}>
            {runs.map((run) => (
              <a
                className="flex h-17 items-end justify-center rounded-xl"
                href={run.permalink}
                target="_blank"
                rel="noreferrer"
                title={`${formatRunDate(run)} - ${formatResult(run.success)} - ${formatSeconds(run.duration)} - ${formatDps(run.compDps)} DPS`}
                key={run.id}
                style={{ flex: "0 0 4.25rem" }}
              >
                <span
                  className={cx(
                    "block min-h-[0.55rem] w-[0.9rem] rounded-[inherit]",
                    getResultClass(run.success) === "kill" && "bg-success/25",
                    getResultClass(run.success) === "wipe" && "bg-error/25",
                    getResultClass(run.success) === "unknown" && "bg-info/25",
                  )}
                  style={{ height: `${Math.max(16, (run.duration / maxDuration) * 100)}%` }}
                />
              </a>
            ))}
          </div>
          <div className="mt-[0.45rem] flex w-max min-w-full gap-[0.35rem] border-t border-base-300 pt-[0.45rem]" aria-hidden="true">
            {runs.map((run) => (
              <span className="text-center text-[0.72rem] leading-[1.15] text-muted" style={{ flex: "0 0 4.25rem" }} title={formatRunDate(run)} key={`${run.id}:tick`}>
                {formatPullTickDate(run)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Collapsible open={isRunListExpanded} onOpenChange={setIsRunListExpanded}>
        <div className={cx(sectionHeadingClass, "items-center")}>
          <div>
            <h4 className="mb-[0.2rem] mt-0">Saved logs</h4>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-between gap-2 px-2 text-[0.82rem] font-black uppercase tracking-[0.04em] text-muted"
            >
              <span>{isRunListExpanded ? "Hide logs" : "View logs"}</span>
              <ChevronDown
                className={cx(
                  "size-4 transition-transform duration-200",
                  isRunListExpanded && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="grid gap-[0.45rem] pt-[0.45rem]">
            <div className="grid gap-3 px-[0.8rem] pb-[0.15rem] pt-0 text-[0.78rem] font-black uppercase text-muted tracking-[0.08em] max-nav:hidden grid-cols-[minmax(180px,1fr)_90px_90px_140px]" aria-hidden="true">
              <span>Date</span>
              <span>Result</span>
              <span>Time</span>
              <span>DPS</span>
            </div>
            {runs
              .slice()
              .reverse()
              .map((run) => (
                <button
                  type="button"
                  className="grid w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-[0.8rem] py-[0.7rem] text-left text-fg hover:border-primary/45 max-nav:grid-cols-1 grid-cols-[minmax(180px,1fr)_90px_90px_100px]"
                  onClick={() => {
                    onSelectRun(run);
                    window.open(run.permalink, "_blank", "noopener,noreferrer");
                  }}
                  key={run.id}
                >
                  <span>{formatRunDate(run)}</span>
                  <strong>{formatResult(run.success)}</strong>
                  <span>{formatSeconds(run.duration)}</span>
                  <span>{formatDps(run.compDps)}</span>
                </button>
              ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

type EncounterPhaseSummaryRow = {
  key: string;
  name: string;
  targetNames: string[];
  cachedRuns: number;
  averageDurationSeconds: number;
  averageSquadDps: number | null;
  latestSquadTargetDps: number | null;
  averageSquadTargetDps: number | null;
  order: number;
};

function summarizeEncounterPhases(runs: RunRecord[]): EncounterPhaseSummaryRow[] {
  const byPhase = new Map<string, EncounterPhaseSummaryRow & { durations: number[]; squadDpsValues: number[]; squadTargetDpsValues: number[] }>();

  [...runs]
    .sort((left, right) => right.start - left.start)
    .forEach((run) => {
      const phaseData = run.phaseData;
      if (!phaseData || !hasCurrentPhaseData(phaseData)) return;

      phaseData.phases.forEach((phase, index) => {
        const existing = byPhase.get(phase.key);
        if (!existing) {
          byPhase.set(phase.key, {
            key: phase.key,
            name: phase.name,
            targetNames: [...phase.targetNames],
            cachedRuns: 1,
            averageDurationSeconds: phase.durationSeconds,
            averageSquadDps: phase.squadDps,
            latestSquadTargetDps: phase.squadTargetDps,
            averageSquadTargetDps: phase.squadTargetDps,
            order: index,
            durations: [phase.durationSeconds],
            squadDpsValues: phase.squadDps == null ? [] : [phase.squadDps],
            squadTargetDpsValues: phase.squadTargetDps == null ? [] : [phase.squadTargetDps],
          });
          return;
        }

        existing.cachedRuns += 1;
        existing.durations.push(phase.durationSeconds);
        if (phase.squadDps != null) existing.squadDpsValues.push(phase.squadDps);
        if (phase.squadTargetDps != null) existing.squadTargetDpsValues.push(phase.squadTargetDps);
        existing.averageDurationSeconds = average(existing.durations) ?? 0;
        existing.averageSquadDps = average(existing.squadDpsValues);
        existing.averageSquadTargetDps = average(existing.squadTargetDpsValues);
      });
    });

  return Array.from(byPhase.values())
    .sort((left, right) => left.order - right.order)
    .map(({ durations: _durations, squadDpsValues: _squadDpsValues, squadTargetDpsValues: _squadTargetDpsValues, ...phase }) => phase);
}

function formatPhaseTargets(targetNames: string[]): string {
  if (!targetNames.length) return "All targets";
  if (targetNames.length <= 4) return targetNames.join(", ");
  return `${targetNames.slice(0, 3).join(", ")}, +${targetNames.length - 3} more`;
}
