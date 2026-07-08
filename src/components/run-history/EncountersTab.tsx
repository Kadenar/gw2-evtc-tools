import { useEffect, useState } from "react";
import { getEncounterSortOrder } from "../../data/encounters";
import { formatSeconds } from "../../lib/format";
import { hasCurrentPhaseData, type RunRecord } from "../../lib/runHistory";
import type { EncounterSummary, HistoryFilterActions, HistoryFilters } from "./types";
import { average, formatDps, formatPercent, formatPullTickDate, formatResult, formatRunDate, formatWing, getResultClass } from "./utils";
import { HistoryFilterPanel, Metric } from "./shared";

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
        <div className="panel">
          <p className="muted">
            Select an encounter from the list below to view its pull history.
          </p>
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

  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>Encounter list</h3>
        </div>
      </div>
      {encounterGroups.length ? (
        <div className="week-run-groups">
        {encounterGroups.map((group) => (
          <section className="week-run-group" key={group.label}>
            <div className="week-run-group-header">
              <h5>{group.label}</h5>
              <span className="pill">
                {group.encounters.length} encounter{group.encounters.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="table-wrap">
              <table className="encounter-list-table">
                <colgroup>
                  <col className="encounter-list-col-encounter" />
                  <col className="encounter-list-col-metric" />
                  <col className="encounter-list-col-metric" />
                  <col className="encounter-list-col-count" />
                  <col className="encounter-list-col-rate" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Encounter</th>
                    <th>Latest</th>
                    <th>Best</th>
                    <th>Wipes</th>
                    <th>Kill rate</th>
                  </tr>
                </thead>
                <tbody>
                  {group.encounters.map((encounter) => {
                    const latest = [...encounter.runsList].sort((a, b) => b.start - a.start)[0];
                    return (
                      <tr
                        className={selectedEncounterKey === encounter.encounterKey ? "selected-row" : ""}
                        onClick={() => onSelectEncounter(encounter.encounterKey)}
                        key={encounter.encounterKey}
                      >
                        <td>
                          <span className="encounter-list-name">
                            <span>{encounter.bossName}</span>
                            {encounter.isCm ? <span className="pill">CM</span> : null}
                          </span>
                        </td>
                        <td>{latest ? formatSeconds(latest.duration) : "N/A"}</td>
                        <td>{encounter.bestDuration == null ? "N/A" : formatSeconds(encounter.bestDuration)}</td>
                        <td>{encounter.wipes}</td>
                        <td>{formatPercent(encounter.killRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        </div>
      ) : (
        <p className="muted">No encounters match the current filters.</p>
      )}
    </div>
  );
}

function buildEncounterGroups(encounters: EncounterSummary[]): Array<{ label: string; encounters: EncounterSummary[] }> {
  const byWing = new Map<number | null, EncounterSummary[]>();

  for (const encounter of encounters) {
    byWing.set(encounter.wing, [...(byWing.get(encounter.wing) ?? []), encounter]);
  }

  return Array.from(byWing.entries())
    .sort(([leftWing], [rightWing]) => (leftWing ?? Number.POSITIVE_INFINITY) - (rightWing ?? Number.POSITIVE_INFINITY))
    .map(([wing, wingEncounters]) => ({
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
    <div className="panel encounter-detail">
      <div className="section-heading">
        <div>
          <h3>
            {encounter.bossName}
            {encounter.isCm ? <span className="pill">CM</span> : null}
          </h3>
          <p className="muted">
            {formatWing(encounter.wing)} - {encounter.runs} runs - {formatPercent(encounter.killRate)} kill rate
            {!isSelectedFromFilter ? " - outside current filters" : ""}
          </p>
        </div>
      </div>

      <div className="time-stats week-stats time-stats-inline">
        <Metric label="Kills" value={String(encounter.kills)} />
        <Metric label="Wipes" value={String(encounter.wipes)} />
        <Metric label="Best" value={encounter.bestDuration == null ? "N/A" : formatSeconds(encounter.bestDuration)} />
        <Metric label="Average DPS" value={formatDps(encounter.averageCompDps)} />
      </div>

      {phaseStatus?.fetchableRuns ? (
        <div className="encounter-chart-section">
          <div className="encounter-chart-heading">
            <div>
              <h4>Phase DPS</h4>
              <p className="muted">
                Cached {phaseStatus.cachedRuns}/{phaseStatus.fetchableRuns} log{phaseStatus.fetchableRuns === 1 ? "" : "s"}
                {phaseStatus.loadingRuns ? ` - loading ${phaseStatus.loadingRuns}` : ""}
                {phaseStatus.failedRuns ? ` - ${phaseStatus.failedRuns} failed` : ""}
              </p>
            </div>
          </div>

          {phaseSummaries.length ? (
            <div className="table-wrap">
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

      <div className="encounter-chart-section">
        <div className="encounter-chart-heading">
          <div>
            <h4>Pull Duration History</h4>
          </div>
          <div className="timeline-legend" aria-label="Pull result legend">
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

        <div className="run-trend-scroll">
          <div className="run-trend" aria-label={`${encounter.bossName} pull duration history. Older pulls are on the left and newer pulls are on the right.`}>
            {runs.map((run) => (
              <a
                className={`trend-dot ${getResultClass(run.success)}`}
                href={run.permalink}
                target="_blank"
                rel="noreferrer"
                title={`${formatRunDate(run)} - ${formatResult(run.success)} - ${formatSeconds(run.duration)} - ${formatDps(run.compDps)} DPS`}
                key={run.id}
              >
                <span style={{ height: `${Math.max(16, (run.duration / maxDuration) * 100)}%` }} />
              </a>
            ))}
          </div>
          <div className="trend-x-axis" aria-hidden="true">
            {runs.map((run) => (
              <span className="trend-axis-tick" title={formatRunDate(run)} key={`${run.id}:tick`}>
                {formatPullTickDate(run)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div>
            <h4>Saved logs</h4>
          </div>
        <button
          type="button"
          className="week-card-toggle section-heading"
          onClick={() => setIsRunListExpanded((current) => !current)}
          aria-expanded={isRunListExpanded}
        >
          
          <span className="week-card-affordance" aria-hidden="true">
            <span>{isRunListExpanded ? "Hide logs" : "View logs"}</span>
            <span className={`week-card-chevron ${isRunListExpanded ? "expanded" : ""}`}>v</span>
          </span>
        </button>

        {isRunListExpanded ? (
          <div className="encounter-run-list">
            <div className="encounter-run-header" aria-hidden="true">
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
                  className="encounter-run-row"
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
          </div>
        ) : null}
      </div>
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
