import { useState } from "react";
import { formatSeconds } from "../../../lib/format";
import type { RunRecord } from "../../../lib/runHistory";
import { cx, sectionHeadingClass } from "../../../lib/ui";
import { Collapsible, CollapsibleContent } from "../../ui/collapsible";
import { CollapsibleChevronTrigger } from "../shared";
import { formatDps, formatResult, formatRunDate } from "../utils";

// Collapse state resets when the encounter changes via a `key` on this
// component at the call site (EncounterDetail) — a remount, not an effect.
export function EncounterRunList({
  runs,
  onSelectRun,
}: {
  runs: RunRecord[];
  onSelectRun: (run: RunRecord) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cx(sectionHeadingClass, "items-center")}>
        <div>
          <h4 className="mb-[0.2rem] mt-0">Saved logs</h4>
        </div>
        <CollapsibleChevronTrigger open={isExpanded} openLabel="Hide logs" closedLabel="View logs" />
      </div>

      <CollapsibleContent className="grid gap-[0.45rem] pt-[0.45rem]">
        {/* Column headers (desktop only) */}
        <div className="grid gap-3 px-[0.8rem] pb-[0.15rem] pt-0 text-[0.78rem] font-black uppercase text-muted tracking-[0.08em] max-nav:hidden grid-cols-[minmax(180px,1fr)_90px_90px_140px]" aria-hidden="true">
          <span>Date</span>
          <span>Result</span>
          <span>Time</span>
          <span>DPS</span>
        </div>

        {/* Log entries (newest first) */}
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
  );
}
