import { EmptyCard } from "./ui/empty-card";
import { formatDateTime, formatSeconds } from "../lib/format";

export type SessionTimelineLog = {
  permalink: string;
  source: string;
  bossName: string;
  wing: number | null;
  success: boolean | null;
  duration: number;
  start: number;
  end: number;
  isCm: boolean;
};

export type SessionTimelineItem =
  | {
      type: "pull";
      key: string;
      log: SessionTimelineLog;
      duration: number;
    }
  | {
      type: "gap";
      key: string;
      start: number;
      end: number;
      duration: number;
      fromWing: number | null;
      toWing: number | null;
      wingChanged: boolean;
    };

type SessionTimelineRow = {
  key: string;
  label: string;
  items: SessionTimelineItem[];
  transitionAfter?: Extract<SessionTimelineItem, { type: "gap" }>;
};

export function buildSessionTimelineItems(logs: SessionTimelineLog[]): SessionTimelineItem[] {
  const sorted = logs
    .filter((log) => Number.isFinite(log.start) && log.start > 0 && Number.isFinite(log.end) && log.end >= log.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const items: SessionTimelineItem[] = [];
  let previous: SessionTimelineLog | null = null;

  for (const log of sorted) {
    if (previous && log.start > previous.end) {
      items.push({
        type: "gap",
        key: `gap-${previous.permalink || previous.source}-${log.permalink || log.source}`,
        start: previous.end,
        end: log.start,
        duration: log.start - previous.end,
        fromWing: previous.wing,
        toWing: log.wing,
        wingChanged: previous.wing !== log.wing,
      });
    }

    items.push({
      type: "pull",
      key: `pull-${log.permalink || log.source}`,
      log,
      duration: Math.max(1, log.duration),
    });

    previous = !previous || log.end >= previous.end ? log : previous;
  }

  return items;
}

export function SessionTimelineView({
  items,
  emptyTitle = "No usable encounter times",
  emptyDescription = "The loaded logs do not include enough timing data to build a timeline view.",
}: {
  items: SessionTimelineItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!items.length) {
    return <EmptyCard title={emptyTitle} description={emptyDescription} />;
  }

  const firstPull = items.find((item): item is Extract<SessionTimelineItem, { type: "pull" }> => item.type === "pull");
  const lastPull = [...items].reverse().find((item): item is Extract<SessionTimelineItem, { type: "pull" }> => item.type === "pull");
  const rows = buildTimelineRows(items);

  return (
    <div className="grid gap-[0.55rem]">
      <div className="grid gap-1 text-[0.9rem] text-muted sm:flex sm:justify-between sm:gap-4">
        <span>{firstPull ? formatDateTime(firstPull.log.start) : "N/A"}</span>
        <span>{lastPull ? formatDateTime(lastPull.log.end) : "N/A"}</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-base-100" aria-label="Session timeline">
        <div className="grid min-w-[760px] gap-[0.55rem] p-3">
          {rows.map((row) => (
            <div className="grid gap-[0.25rem]" key={row.key}>
              <div className="flex items-center text-[0.78rem] font-black uppercase text-accent-2 tracking-[0.08em]">
                <span>{row.label}</span>
              </div>
              <div className="flex min-h-[3.7rem] items-stretch gap-[0.25rem]">{row.items.map((item) => renderTimelineItem(item))}</div>
              {row.transitionAfter ? (
                <div className="mx-auto mt-[0.1rem] flex w-max max-w-full items-center justify-center gap-2 rounded-full border border-dashed border-primary/55 bg-primary/8 px-3 py-[0.25rem] text-[0.82rem] text-accent-2">
                  <span>
                    {formatWing(row.transitionAfter.fromWing)} -&gt; {formatWing(row.transitionAfter.toWing)}
                  </span>
                  <strong>{formatSeconds(row.transitionAfter.duration)} downtime</strong>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-[0.9rem] gap-y-[0.55rem] text-[0.9rem] text-muted" aria-label="Timeline legend">
        <span>
          <i className="legend-dot kill" /> Kill
        </span>
        <span>
          <i className="legend-dot wipe" /> Wipe
        </span>
        <span>
          <i className="legend-dot downtime" /> Downtime
        </span>
        <span>
          <i className="legend-dot transition" /> Wing transition
        </span>
      </div>
    </div>
  );
}

function renderTimelineItem(item: SessionTimelineItem) {
  if (item.type === "pull") {
    return (
      <a
        className={`timeline-segment timeline-pull ${getPullClass(item.log)}`}
        href={item.log.permalink}
        target="_blank"
        rel="noreferrer"
        style={{ flexGrow: Math.max(1, item.duration) }}
        title={`${item.log.bossName} - ${getPullResult(item.log)} - ${formatSeconds(item.duration)}`}
        key={item.key}
      >
        <span className="timeline-label">
          {item.log.bossName}
          {item.log.isCm ? <span className="timeline-badge">CM</span> : null}
        </span>
        <span className="timeline-subline">
          {getPullResult(item.log)} - {formatSeconds(item.duration)}
        </span>
      </a>
    );
  }

  return (
    <div
      className="timeline-segment timeline-gap"
      style={{ flexGrow: Math.max(1, item.duration) }}
      title={`Downtime - ${formatSeconds(item.duration)}`}
      key={item.key}
    >
      <span className="timeline-label">Downtime</span>
      <span className="timeline-subline">{formatSeconds(item.duration)}</span>
    </div>
  );
}

function buildTimelineRows(items: SessionTimelineItem[]): SessionTimelineRow[] {
  const rows: SessionTimelineRow[] = [];
  let currentItems: SessionTimelineItem[] = [];

  function pushRow(transitionAfter?: Extract<SessionTimelineItem, { type: "gap" }>) {
    if (!currentItems.length) return;

    rows.push({
      key: `timeline-row-${rows.length}`,
      label: getTimelineRowLabel(currentItems),
      items: currentItems,
      transitionAfter,
    });
    currentItems = [];
  }

  for (const item of items) {
    if (item.type === "gap" && item.wingChanged) {
      pushRow(item);
      continue;
    }

    currentItems.push(item);
  }

  pushRow();
  return rows;
}

function getTimelineRowLabel(items: SessionTimelineItem[]): string {
  const pull = items.find((item): item is Extract<SessionTimelineItem, { type: "pull" }> => item.type === "pull");
  return pull ? formatWing(pull.log.wing) : "Timeline";
}

function getPullResult(log: SessionTimelineLog): string {
  if (log.success == null) return "N/A";
  return log.success ? "Success" : "Fail";
}

function getPullClass(log: SessionTimelineLog): string {
  if (log.success == null) return "unknown";
  return log.success ? "kill" : "wipe";
}

function formatWing(wing: number | null): string {
  return wing == null ? "Unmapped" : `Wing ${wing}`;
}
