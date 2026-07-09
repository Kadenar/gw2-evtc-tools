// Per-encounter comparison table for the selected wing.

import { ChevronRight } from "lucide-react";
import { formatSeconds } from "../../../lib/format";
import { tableWrapClass } from "../../../lib/ui";
import type { WeekSummary } from "../../../lib/runHistory";
import { EmptyCard } from "../../ui/empty-card";
import { formatDps } from "../utils";
import type { EncounterComparisonRow, WingWeekDetail } from "./weekAggregation";
import { getComparableEncounterDuration } from "./weekAggregation";
import { formatEncounterRecord } from "./weekFormat";

// Signed, colored delta cell. `betterWhenLower` flips the good/bad direction
// (true for durations — faster is better; false for DPS — higher is better).
function DeltaCell({
  current,
  previous,
  betterWhenLower,
  format,
}: {
  current: number | null;
  previous: number | null;
  betterWhenLower: boolean;
  format: (value: number) => string;
}) {
  if (current == null || previous == null) return <span className="muted">—</span>;

  const delta = current - previous;
  if (Math.abs(delta) < (betterWhenLower ? 1 : 1e-6)) return <span className="muted">same</span>;

  const better = betterWhenLower ? delta < 0 : delta > 0;
  return (
    <span className={better ? "text-success" : "text-error"}>
      {delta < 0 ? "-" : "+"} {format(Math.abs(delta))}
    </span>
  );
}

export function WingEncounterPanel({
  selectedWeek,
  compareWeek,
  rows,
  selectedDetail,
  compareDetail,
  onSelectEncounter,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: EncounterComparisonRow[];
  selectedDetail: WingWeekDetail;
  compareDetail: WingWeekDetail;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  if (!rows.length) {
    return <EmptyCard title="No encounters logged" description="This wing has no saved encounters for the selected comparison." />;
  }

  const selectedLabel = selectedWeek?.weekKey ?? "Selected";
  const compareLabel = compareWeek?.weekKey ?? "Compare";
  const groupBorder = "border-l border-base-300";

  // Wing totals: best-time is the sum of each encounter's comparable best; kills/wipes and
  // squad DPS come from the wing aggregate so the row matches the overview cards.
  const totals = rows.reduce(
    (acc, row) => {
      const current = getComparableEncounterDuration(row.current);
      const previous = getComparableEncounterDuration(row.previous);
      if (current != null) acc.current += current;
      if (previous != null) acc.previous += previous;
      return acc;
    },
    { current: 0, previous: 0 },
  );
  const selectedBest = selectedDetail ? totals.current : null;
  const compareBest = compareDetail ? totals.previous : null;
  const bothWeeks = selectedDetail != null && compareDetail != null;

  return (
    <div className={tableWrapClass}>
      <table>
        <thead>
          <tr>
            <th rowSpan={2}>Encounter</th>
            <th colSpan={3} className={`${groupBorder} text-center`}>
              {selectedLabel}
            </th>
            <th colSpan={3} className={`${groupBorder} text-center`}>
              {compareLabel}
            </th>
            <th colSpan={2} className={`${groupBorder} text-center`}>
              Change
            </th>
          </tr>
          <tr>
            <th className={groupBorder}>Kills / wipes</th>
            <th>Best time</th>
            <th>Avg DPS</th>
            <th className={groupBorder}>Kills / wipes</th>
            <th>Best time</th>
            <th>Avg DPS</th>
            <th className={groupBorder}>Best time</th>
            <th>Avg DPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const onlyOneWeek = !row.current !== !row.previous;
            const isNew = row.current != null && row.previous == null;
            return (
              <tr
                className="group cursor-pointer hover:bg-base-200"
                role="button"
                tabIndex={0}
                onClick={() => onSelectEncounter(row.encounterKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectEncounter(row.encounterKey);
                  }
                }}
                key={row.encounterKey}
              >
                <td>
                  <span className="inline-flex items-center gap-1">
                    {row.bossName}
                    {row.isCm ? <span className="badge badge-sm badge-outline">CM</span> : null}
                    {isNew ? <span className="badge badge-sm badge-success badge-outline">New</span> : null}
                    <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                  </span>
                </td>
                <td className={groupBorder}>{formatEncounterRecord(row.current)}</td>
                <td className="whitespace-nowrap">{formatDurationCell(row.current)}</td>
                <td className="whitespace-nowrap">{formatDps(row.current?.averageCompDps ?? null)}</td>
                <td className={groupBorder}>{formatEncounterRecord(row.previous)}</td>
                <td className="whitespace-nowrap">{formatDurationCell(row.previous)}</td>
                <td className="whitespace-nowrap">{formatDps(row.previous?.averageCompDps ?? null)}</td>
                <td className={`${groupBorder} whitespace-nowrap`}>
                  {onlyOneWeek ? (
                    <span className="muted">—</span>
                  ) : (
                    <DeltaCell
                      current={getComparableEncounterDuration(row.current)}
                      previous={getComparableEncounterDuration(row.previous)}
                      betterWhenLower
                      format={formatSeconds}
                    />
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {onlyOneWeek ? (
                    <span className="muted">—</span>
                  ) : (
                    <DeltaCell
                      current={row.current?.averageCompDps ?? null}
                      previous={row.previous?.averageCompDps ?? null}
                      betterWhenLower={false}
                      format={formatDps}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-base-300 font-medium">
            <td>Wing total</td>
            <td className={groupBorder}>{selectedDetail ? `${selectedDetail.kills} kills / ${selectedDetail.wipes} wipes` : "N/A"}</td>
            <td className="whitespace-nowrap">{selectedBest == null ? "N/A" : formatSeconds(selectedBest)}</td>
            <td className="whitespace-nowrap">{formatDps(selectedDetail?.averageCompDps ?? null)}</td>
            <td className={groupBorder}>{compareDetail ? `${compareDetail.kills} kills / ${compareDetail.wipes} wipes` : "N/A"}</td>
            <td className="whitespace-nowrap">{compareBest == null ? "N/A" : formatSeconds(compareBest)}</td>
            <td className="whitespace-nowrap">{formatDps(compareDetail?.averageCompDps ?? null)}</td>
            <td className={`${groupBorder} whitespace-nowrap`}>
              {bothWeeks ? <DeltaCell current={selectedBest} previous={compareBest} betterWhenLower format={formatSeconds} /> : <span className="muted">—</span>}
            </td>
            <td className="whitespace-nowrap">
              {bothWeeks ? (
                <DeltaCell current={selectedDetail?.averageCompDps ?? null} previous={compareDetail?.averageCompDps ?? null} betterWhenLower={false} format={formatDps} />
              ) : (
                <span className="muted">—</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function formatDurationCell(encounter: EncounterComparisonRow["current"]): string {
  const duration = getComparableEncounterDuration(encounter);
  return duration == null ? "N/A" : formatSeconds(duration);
}
