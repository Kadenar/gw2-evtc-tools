import { getEncounterSortOrder } from "../../../data/encounters";
import type { EncounterSummary } from "../types";
import { formatWing } from "../utils";

export type EncounterGroup = {
  key: string;
  label: string;
  encounters: EncounterSummary[];
};

export function buildEncounterGroups(encounters: EncounterSummary[]): EncounterGroup[] {
  // Group by wing
  const byWing = new Map<number | null, EncounterSummary[]>();

  for (const encounter of encounters) {
    byWing.set(encounter.wing, [...(byWing.get(encounter.wing) ?? []), encounter]);
  }

  // Sort wings, then sort encounters within each wing
  return Array.from(byWing.entries())
    .sort(([leftWing], [rightWing]) => (leftWing ?? Number.POSITIVE_INFINITY) - (rightWing ?? Number.POSITIVE_INFINITY))
    .map(([wing, wingEncounters]) => ({
      key: wing == null ? "wing:unknown" : `wing:${wing}`,
      label: formatWing(wing),
      encounters: [...wingEncounters].sort(compareEncountersByWingOrder),
    }));
}

// Order encounters within wing by boss id, then name, then CM
function compareEncountersByWingOrder(left: EncounterSummary, right: EncounterSummary): number {
  const leftBossId = left.runsList[0]?.bossId ?? null;
  const rightBossId = right.runsList[0]?.bossId ?? null;
  const leftOrder = getEncounterSortOrder(leftBossId, left.bossName);
  const rightOrder = getEncounterSortOrder(rightBossId, right.bossName);

  return leftOrder - rightOrder
    || left.bossName.localeCompare(right.bossName)
    || Number(left.isCm) - Number(right.isCm);
}
