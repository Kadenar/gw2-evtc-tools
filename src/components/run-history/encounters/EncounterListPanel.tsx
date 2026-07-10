import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { formatSeconds } from "../../../lib/format";
import { cx, panelClass, sectionHeadingClass, summaryCardClass } from "../../../lib/ui";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
import { EmptyCard } from "../../ui/empty-card";
import type { EncounterSummary } from "../types";
import { formatPercent, pluralize } from "../utils";
import { buildEncounterGroups } from "./encounterGroups";

export function EncounterListPanel({
  encounters,
  selectedEncounterKey,
  onSelectEncounter,
}: {
  encounters: EncounterSummary[];
  selectedEncounterKey: string | null;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  // Group encounters by wing
  const encounterGroups = buildEncounterGroups(encounters);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [lastAutoOpenedEncounterKey, setLastAutoOpenedEncounterKey] = useState<string | null>(null);

  // Auto-expand the group of the selected encounter. Done during render (React
  // supports conditional setState while rendering); the guard converges so it
  // runs once per selection change instead of via a post-paint effect.
  if (selectedEncounterKey && selectedEncounterKey !== lastAutoOpenedEncounterKey) {
    const selectedGroup = encounterGroups.find((group) =>
      group.encounters.some((encounter) => encounter.encounterKey === selectedEncounterKey)
    );
    if (selectedGroup) {
      setOpenGroups((current) => ({ ...current, [selectedGroup.key]: true }));
      setLastAutoOpenedEncounterKey(selectedEncounterKey);
    }
  }

  return (
    <div className={panelClass}>
      <div className={sectionHeadingClass}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Encounter list</h3>
        </div>
      </div>

      {/* Wing groups */}
      {encounterGroups.length ? (
        <div className="grid gap-[0.45rem]">
          {encounterGroups.map((group) => (
            <Collapsible
              className="grid gap-[0.6rem]"
              key={group.key}
              open={openGroups[group.key] ?? false}
              onOpenChange={(open) => setOpenGroups((current) => ({ ...current, [group.key]: open }))}
            >
              <section className={cx(summaryCardClass, "gap-3 p-[0.9rem]")}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <h5 className="m-0 text-[0.98rem]">{group.label}</h5>
                      <span className="badge badge-outline">
                        {group.encounters.length} {pluralize(group.encounters.length, "encounter")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-2 text-[0.82rem] font-black uppercase tracking-[0.04em] text-muted">
                      <span>{openGroups[group.key] ? "Hide" : "Show"}</span>
                      <ChevronDown className={cx("size-4 transition-transform duration-200", (openGroups[group.key] ?? false) && "rotate-180")} />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid gap-[0.55rem]">
                  {group.encounters.map((encounter) => (
                    <EncounterListRow
                      key={encounter.encounterKey}
                      encounter={encounter}
                      isSelected={selectedEncounterKey === encounter.encounterKey}
                      onSelectEncounter={onSelectEncounter}
                    />
                  ))}
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

// Individual encounter row
function EncounterListRow({
  encounter,
  isSelected,
  onSelectEncounter,
}: {
  encounter: EncounterSummary;
  isSelected: boolean;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  const latest = [...encounter.runsList].sort((a, b) => b.start - a.start)[0];

  return (
    <button
      type="button"
      className={cx(
        "grid w-full items-center gap-3 rounded-xl border border-line bg-base-100 px-[0.8rem] py-[0.8rem] text-left text-fg transition-colors hover:border-primary/45 hover:bg-primary/5 max-nav:grid-cols-1 grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(72px,auto))]",
        isSelected && "border-primary/55 bg-primary/8",
      )}
      onClick={() => onSelectEncounter(encounter.encounterKey)}
    >
      <div className="grid min-w-0 gap-[0.2rem]">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-[0.4rem]">
          <strong className="truncate">{encounter.bossName}</strong>
          {encounter.isCm ? <span className="badge badge-sm badge-outline">CM</span> : null}
        </span>
        <span className="text-[0.8rem] text-muted">
          {encounter.runs} {pluralize(encounter.runs, "run")}
        </span>
      </div>
      <EncounterListStat label="Latest" value={latest ? formatSeconds(latest.duration) : "N/A"} />
      <EncounterListStat label="Best" value={encounter.bestDuration == null ? "N/A" : formatSeconds(encounter.bestDuration)} />
      <EncounterListStat label="Wipes" value={String(encounter.wipes)} />
      <EncounterListStat label="Kill rate" value={formatPercent(encounter.killRate)} />
    </button>
  );
}

// Stat cell (label + value)
function EncounterListStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-[0.15rem]">
      <span className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-muted">{label}</span>
      <strong className="whitespace-nowrap [font-variant-numeric:tabular-nums]">{value}</strong>
    </div>
  );
}
