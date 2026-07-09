import { formatSeconds } from "../../../lib/format";
import type { RunRecord } from "../../../lib/runHistory";
import { tableWrapClass } from "../../../lib/ui";
import type { EncounterPhaseStatus } from "../types";
import { formatDps, pluralize } from "../utils";
import { formatPhaseTargets, summarizeEncounterPhases } from "./encounterPhases";

export function EncounterPhaseTable({
  runs,
  phaseStatus,
}: {
  runs: RunRecord[];
  phaseStatus: EncounterPhaseStatus | null;
}) {
  if (!phaseStatus?.fetchableRuns) return null;

  // Aggregate phase stats from cached runs
  const phaseSummaries = summarizeEncounterPhases(runs);
  const showAverageBossDps = new Set(runs.map((run) => run.weekKey)).size > 1;

  return (
    <div className="grid gap-[0.45rem]">
      <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
        <div>
          <h4 className="mb-[0.2rem] mt-0">Phase DPS</h4>
          <p className="muted">
            Cached {phaseStatus.cachedRuns}/{phaseStatus.fetchableRuns} {pluralize(phaseStatus.fetchableRuns, "log")}
            {phaseStatus.loadingRuns ? ` - loading ${phaseStatus.loadingRuns}` : ""}
            {phaseStatus.failedRuns ? ` - ${phaseStatus.failedRuns} failed` : ""}
          </p>
        </div>
      </div>

      {/* Phase table or loading state */}
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
  );
}
