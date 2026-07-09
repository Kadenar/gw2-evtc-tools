import { hasCurrentPhaseData, type RunRecord } from "../../../lib/runHistory";
import { average } from "../utils";

export type EncounterPhaseSummaryRow = {
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

export function summarizeEncounterPhases(runs: RunRecord[]): EncounterPhaseSummaryRow[] {
  // Accumulate phase data (newest runs first)
  const byPhase = new Map<string, EncounterPhaseSummaryRow & { durations: number[]; squadDpsValues: number[]; squadTargetDpsValues: number[] }>();

  [...runs]
    .sort((left, right) => right.start - left.start)
    .forEach((run) => {
      const phaseData = run.phaseData;
      if (!phaseData || !hasCurrentPhaseData(phaseData)) return;

      // Aggregate each phase across all runs
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

  // Sort by phase order, drop accumulation arrays
  return Array.from(byPhase.values())
    .sort((left, right) => left.order - right.order)
    .map(({ durations: _durations, squadDpsValues: _squadDpsValues, squadTargetDpsValues: _squadTargetDpsValues, ...phase }) => phase);
}

// Format target list with truncation
export function formatPhaseTargets(targetNames: string[]): string {
  if (!targetNames.length) return "All targets";
  if (targetNames.length <= 4) return targetNames.join(", ");
  return `${targetNames.slice(0, 3).join(", ")}, +${targetNames.length - 3} more`;
}
