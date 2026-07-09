// Main table for player metrics: rows for each player, columns for wing average + per-encounter DPS.
// Owns expand state for detailed view. Uses PlayerComparisonCell for each DPS cell.

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { WeekSummary } from "../../../lib/runHistory";
import { cx } from "../../../lib/ui";
import { PlayerComparisonCell } from "./PlayerComparisonCell";
import { ExpandedPlayerDetail } from "./ExpandedPlayerDetail";
import type { PlayerComparisonRow, PlayerEncounterColumn } from "./playerAggregation";

export function PlayerMetricsTable({
  rows,
  encounterColumns,
  currentWeek,
}: {
  rows: PlayerComparisonRow[];
  encounterColumns: PlayerEncounterColumn[];
  currentWeek: WeekSummary;
}) {
  const [expandedPlayerKey, setExpandedPlayerKey] = useState<string | null>(null);
  const activeKey = expandedPlayerKey && rows.some((row) => row.key === expandedPlayerKey) ? expandedPlayerKey : null;
  const subgroupRowSpans = getSubgroupRowSpans(rows, activeKey);

  return (
    <table className="min-w-full [&_td]:align-top [&_td]:px-3 [&_td]:py-[0.65rem] [&_th]:px-3 [&_th]:py-[0.65rem]">
      <thead>
        <tr>
          <th className="w-16 min-w-16">Sub</th>
          <th className="min-w-[16rem]">Player</th>
          <th className="min-w-44">
            Wing Avg
            <small className="block text-[0.74rem] font-normal text-muted">current / delta / average</small>
          </th>
          {encounterColumns.map((column) => (
            <th className="min-w-44" key={column.encounterKey}>
              <span>{column.label}</span>
              {column.isCm ? <span className="badge badge-sm badge-outline ml-1 align-middle">CM</span> : null}
              <small className="block text-[0.74rem] font-normal text-muted">current / delta / average</small>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isExpanded = activeKey === row.key;
          const subgroupSpan = subgroupRowSpans.get(row.key) ?? 0;

          return (
            <Fragment key={row.key}>
              <tr className={cx("transition-colors", isExpanded && "bg-primary/6")}>
                {subgroupSpan > 0 ? (
                  <td className="border-r border-line bg-base-100/55 text-center !align-middle" rowSpan={subgroupSpan}>
                    <strong className="text-[1rem]">{row.subgroup ?? "-"}</strong>
                  </td>
                ) : null}
                <td>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-[0.1rem] leading-tight">
                      <strong className="text-[0.95rem]">{[row.name, row.account].filter(Boolean).join(" | ")}</strong>
                      <small className="block text-[0.78rem] leading-[1.2]">{row.professions.join(", ") || "No profession data"}</small>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-base-100 text-muted transition-[border-color,background-color,color] hover:border-primary/45 hover:bg-primary/10 hover:text-fg"
                      aria-label={isExpanded ? `Collapse ${row.name}` : `Expand ${row.name}`}
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedPlayerKey((current) => (current === row.key ? null : row.key))}
                    >
                      <ChevronDown className={cx("size-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </td>
                <td>
                  <PlayerComparisonCell current={row.current?.averageTargetDps ?? null} averageValue={row.average?.averageTargetDps ?? null} />
                </td>
                {encounterColumns.map((column) => (
                  <td key={`${row.key}:${column.encounterKey}`}>
                    <PlayerComparisonCell
                      current={row.current?.encounterMap.get(column.encounterKey) ?? null}
                      averageValue={row.average?.encounterMap.get(column.encounterKey) ?? null}
                    />
                  </td>
                ))}
              </tr>
              {isExpanded ? (
                <tr>
                  <td className="bg-base-100/55" colSpan={encounterColumns.length + 2}>
                    <ExpandedPlayerDetail row={row} currentWeek={currentWeek} encounterColumns={encounterColumns} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function getSubgroupRowSpans(rows: PlayerComparisonRow[], activeKey: string | null): Map<string, number> {
  const spans = new Map<string, number>();
  let startIndex = 0;

  while (startIndex < rows.length) {
    const subgroup = rows[startIndex]?.subgroup ?? null;
    let endIndex = startIndex + 1;
    let span = 1 + (rows[startIndex].key === activeKey ? 1 : 0);

    while (endIndex < rows.length && (rows[endIndex]?.subgroup ?? null) === subgroup) {
      span += 1;
      if (rows[endIndex].key === activeKey) {
        span += 1;
      }
      endIndex += 1;
    }

    spans.set(rows[startIndex].key, span);
    startIndex = endIndex;
  }

  return spans;
}
