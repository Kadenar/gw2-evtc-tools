// Cell renderer for DPS comparison columns in the player metrics table.
// Displays current DPS, delta vs. average, and all-week average in a 3-line stack.

import { cx } from "../../../lib/ui";
import { formatDps } from "../utils";
import { formatPlayerDpsDelta, getPlayerDeltaClass } from "./playerFormat";

export function PlayerComparisonCell({ current, averageValue }: { current: number | null; averageValue: number | null }) {
  return (
    <div className="grid gap-[0.1rem] leading-tight">
      <strong className="whitespace-nowrap text-[0.92rem]">{formatDps(current)}</strong>
      <small className={cx("text-[0.78rem] font-black", getPlayerDeltaClass(current, averageValue))}>{formatPlayerDpsDelta(current, averageValue)}</small>
      <small className="whitespace-nowrap text-[0.78rem] text-muted">{formatDps(averageValue)}</small>
    </div>
  );
}
