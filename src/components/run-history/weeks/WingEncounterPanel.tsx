// Per-encounter comparison table for the selected wing.

import { tableWrapClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import { formatDps } from "../utils";
import type { EncounterComparisonRow } from "./weekAggregation";
import { formatEncounterBest, formatEncounterRecord } from "./weekFormat";

export function WingEncounterPanel({
  selectedWeek,
  compareWeek,
  rows,
  onSelectEncounter,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: EncounterComparisonRow[];
  onSelectEncounter: (encounterKey: string) => void;
}) {
  if (!rows.length) {
    return <EmptyCard title="No encounters logged" description="This wing has no saved encounters for the selected comparison." />;
  }

  return (
    <div className={tableWrapClass}>
      <table>
        <thead>
          <tr>
            <th>Encounter</th>
            <th>{selectedWeek?.weekKey ?? "Selected"} kills / wipes</th>
            <th>Best</th>
            <th>Avg DPS</th>
            <th>{compareWeek?.weekKey ?? "Compare"} kills / wipes</th>
            <th>Best</th>
            <th>Avg DPS</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr onClick={() => onSelectEncounter(row.encounterKey)} key={row.encounterKey}>
              <td>
                {row.bossName}
                {row.isCm ? <span className="badge badge-sm badge-outline ml-1">CM</span> : null}
              </td>
              <td>{formatEncounterRecord(row.current)}</td>
              <td>{formatEncounterBest(row.current)}</td>
              <td>{formatDps(row.current?.averageCompDps ?? null)}</td>
              <td>{formatEncounterRecord(row.previous)}</td>
              <td>{formatEncounterBest(row.previous)}</td>
              <td>{formatDps(row.previous?.averageCompDps ?? null)}</td>
              <td>{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
