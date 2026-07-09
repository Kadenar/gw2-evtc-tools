import { useMemo, useState } from "react";
import { EmptyCard } from "./ui/empty-card";
import { FileDropzone } from "./ui/file-dropzone";
import { AppSelect } from "./ui/app-select";
import {
  DpsReportDomain,
  SessionLog,
  extractPermalinks,
  fetchUploadMetadata,
  logsToCsv,
  metadataToSessionLog,
  summarizeSession,
  uploadLogToDpsReport,
} from "../lib/dpsReport";
import { downloadBlob } from "../lib/format";
import { formatDateTime, formatSeconds } from "../lib/format";
import { RunSessionType, saveSessionLogs } from "../lib/runHistory";
import { compactFieldClass, cx, fieldClass, inlineActionsClass, panelClass, sectionHeadingClass } from "../lib/ui";

type BreakdownView = "timeline" | "details";

type FetchError = {
  source: string;
  message: string;
};

type TimelineItem =
  | {
      type: "pull";
      key: string;
      log: SessionLog;
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

type TimelineRow = {
  key: string;
  label: string;
  items: TimelineItem[];
  transitionAfter?: Extract<TimelineItem, { type: "gap" }>;
};

const UPLOAD_DOMAIN_OPTIONS = [
  { value: "https://dps.report", label: "https://dps.report" },
  { value: "https://b.dps.report", label: "https://b.dps.report" },
] satisfies Array<{ value: DpsReportDomain; label: string }>;

const RUN_SESSION_TYPE_OPTIONS = [
  { value: "full-clear", label: "Full clear" },
  { value: "practice", label: "Practice" },
] satisfies Array<{ value: RunSessionType; label: string }>;

export function SessionTimer() {
  const [uploadDomain, setUploadDomain] = useState<DpsReportDomain>("https://dps.report");
  const [linksText, setLinksText] = useState("");
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [errors, setErrors] = useState<FetchError[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [progress, setProgress] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [breakdownView, setBreakdownView] = useState<BreakdownView>("timeline");
  const [runSessionType, setRunSessionType] = useState<RunSessionType>("full-clear");

  const summary = useMemo(() => summarizeSession(logs), [logs]);
  const logDetailGroups = useMemo(() => summary.wings.filter((wing) => wing.logs.length > 0), [summary.wings]);
  const extractedLinks = useMemo(() => extractPermalinks(linksText), [linksText]);
  const timelineItems = useMemo(() => buildTimelineItems(summary.logs), [summary.logs]);

  async function fetchLinks() {
    setIsWorking(true);
    setErrors([]);
    setProgress(`Fetching ${extractedLinks.length} report${extractedLinks.length === 1 ? "" : "s"}...`);

    const nextLogs: SessionLog[] = [];
    const nextErrors: FetchError[] = [];

    for (const permalink of extractedLinks) {
      try {
        const metadata = await fetchUploadMetadata(permalink);
        nextLogs.push(metadataToSessionLog(metadata, permalink));
      } catch (err) {
        nextErrors.push({ source: permalink, message: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    setLogs((current) => mergeLogs(current, nextLogs));
    setErrors(nextErrors);
    setProgress(nextErrors.length ? "Finished with some errors." : "Finished.");
    setIsWorking(false);
  }

  async function uploadFilesToDpsReport() {
    setIsWorking(true);
    setErrors([]);
    setProgress(`Uploading ${uploadFiles.length} file${uploadFiles.length === 1 ? "" : "s"}...`);

    const nextLogs: SessionLog[] = [];
    const nextErrors: FetchError[] = [];

    for (let index = 0; index < uploadFiles.length; index += 1) {
      const file = uploadFiles[index];
      setProgress(`Uploading ${index + 1}/${uploadFiles.length}: ${file.name}`);
      try {
        const metadata = await uploadLogToDpsReport(file, uploadDomain, { anonymous });
        nextLogs.push(metadataToSessionLog(metadata, file.name));
      } catch (err) {
        nextErrors.push({ source: file.name, message: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    setLogs((current) => mergeLogs(current, nextLogs));
    setErrors(nextErrors);
    setProgress(nextErrors.length ? "Finished with some errors." : "Finished.");
    setIsWorking(false);
  }

  function clearAll() {
    setLogs([]);
    setErrors([]);
    setProgress("");
    setHistoryStatus("");
  }

  async function saveToRunHistory() {
    setIsWorking(true);
    setHistoryStatus("Saving run history...");

    try {
      const result = await saveSessionLogs(summary.logs, runSessionType);
      setHistoryStatus(
        `Saved ${result.saved} new and updated ${result.updated} existing run${result.updated === 1 ? "" : "s"} as ${formatRunSessionType(runSessionType)}.`,
      );
    } catch (err) {
      setHistoryStatus(err instanceof Error ? err.message : "Could not save run history.");
    } finally {
      setIsWorking(false);
    }
  }

  function exportCsv() {
    const csv = logsToCsv(summary.logs);
    downloadBlob(new Blob([csv], { type: "text/csv" }), "gw2-raid-session.csv");
  }

  function exportJson() {
    const json = JSON.stringify(summary, null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), "gw2-raid-session.json");
  }

  return (
    <section className="grid gap-4">
      <div className={cx(panelClass, "grid items-start gap-4 [grid-template-columns:minmax(0,1fr)_minmax(320px,0.75fr)] max-nav:grid-cols-1")}>
        <div>
          <h3 className="mb-3 mt-0 text-[1.25rem]">Use existing dps.report links</h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-[1.25rem]">Or upload logs</h3>
          <label className="flex min-w-0 items-center gap-3 text-sm text-muted">
            <span className="whitespace-nowrap">Upload domain</span>
            <AppSelect
              value={uploadDomain}
              onValueChange={(value) => setUploadDomain(value as DpsReportDomain)}
              options={UPLOAD_DOMAIN_OPTIONS}
              size="sm"
              triggerClassName="min-w-52"
            />
          </label>
        </div>

        <div className="grid content-start">
          <textarea
            className="min-h-30"
            value={linksText}
            onChange={(event) => setLinksText(event.target.value)}
            placeholder="Paste one or more dps.report links here..."
            rows={6}
          />
          <div className={inlineActionsClass}>
            <button type="button" className="btn btn-primary" disabled={!extractedLinks.length || isWorking} onClick={fetchLinks}>
              Fetch {extractedLinks.length || ""} link{extractedLinks.length === 1 ? "" : "s"}
            </button>
            <span className="muted">Detected {extractedLinks.length} link{extractedLinks.length === 1 ? "" : "s"}.</span>
          </div>
          {(progress || errors.length > 0) && (
            <div className="mt-[0.45rem] grid gap-1">
              {progress && <div className={errors.length ? "status-text warning-text" : "status-text"}>{progress}</div>}
              {errors.map((error) => (
                <div className="status-text error-text" key={`${error.source}-${error.message}`}>
                  <strong>{error.source}</strong>: {error.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid content-start">
          <FileDropzone
            className="min-h-35"
            title="Choose EVTC/ZEVTC logs"
            description="Logs upload directly from your browser to dps.report."
            hint="Drop one or more files here, or click to pick them."
            accept=".evtc,.zevtc,.zip,application/zip,application/octet-stream"
            multiple
            files={uploadFiles}
            onFilesChange={setUploadFiles}
          />
          <label className="my-[0.8rem] flex items-center gap-[0.55rem] text-muted">
            <input className="w-auto" type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
            <span>Upload anonymously</span>
          </label>
          <button type="button" className="btn btn-primary" disabled={!uploadFiles.length || isWorking} onClick={uploadFilesToDpsReport}>
            Upload and calculate
          </button>
          {uploadFiles.length > 25 && (
            <div role="alert" className="alert alert-warning mt-3">
              <span>
                dps.report rate-limits uploads. This app uploads sequentially, but 25+ files may still need a retry if the
                server asks you to slow down.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Session summary</h3>
          </div>
          <div className={cx(inlineActionsClass, "items-center")}>
            <label className={cx(fieldClass, compactFieldClass, "m-0 flex max-w-none items-center gap-[0.6rem]")}>
              <span className="whitespace-nowrap text-muted">History type</span>
              <AppSelect
                value={runSessionType}
                disabled={isWorking}
                onValueChange={(value) => setRunSessionType(value as RunSessionType)}
                options={RUN_SESSION_TYPE_OPTIONS}
                size="sm"
                triggerClassName="min-w-42"
              />
            </label>
            <button type="button" className="btn" disabled={!logs.length} onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="btn" disabled={!logs.length} onClick={exportJson}>
              Export JSON
            </button>
            <button type="button" className="btn" disabled={!logs.length || isWorking} onClick={saveToRunHistory}>
              Save to Run History
            </button>
            <button type="button" className="btn btn-ghost" disabled={!logs.length} onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>

        {historyStatus ? <p className="status-text">{historyStatus}</p> : null}

        <div className="mt-[0.65rem] grid gap-[0.55rem]">
          <article className="grid gap-[0.45rem] rounded-[0.6rem] border border-line bg-primary/8 p-[0.65rem]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="eyebrow">Full</span>
                <h4 className="mb-0 mt-[0.05rem] text-[0.98rem]">Full session</h4>
              </div>
              <span className="badge badge-outline">{summary.logs.length} logs</span>
            </div>
            <div className="grid grid-cols-5 gap-[0.35rem] gap-x-[0.55rem] max-nav:grid-cols-2">
              <div className="grid min-w-0 gap-[0.1rem]">
                <span className="text-muted">First pull</span>
                <strong className="wrap-anywhere text-[0.92rem]">{summary.start ? formatDateTime(summary.start) : "N/A"}</strong>
              </div>
              <div className="grid min-w-0 gap-[0.1rem]">
                <span className="text-muted">Last end</span>
                <strong className="wrap-anywhere text-[0.92rem]">{summary.end ? formatDateTime(summary.end) : "N/A"}</strong>
              </div>
              <div className="grid min-w-0 gap-[0.1rem]">
                <span className="text-muted">Elapsed</span>
                <strong className="wrap-anywhere text-[0.92rem]">{formatSeconds(summary.elapsed)}</strong>
              </div>
              <div className="grid min-w-0 gap-[0.1rem]">
                <span className="text-muted">Combat</span>
                <strong className="wrap-anywhere text-[0.92rem]">{formatSeconds(summary.combat)}</strong>
              </div>
              <div className="grid min-w-0 gap-[0.1rem]">
                <span className="text-muted">Downtime</span>
                <strong className="wrap-anywhere text-[0.92rem]">{formatSeconds(summary.downtime)}</strong>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className={panelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h3 className="mb-3 mt-0 text-[1.25rem]">Session breakdown</h3>
          </div>
          <div role="tablist" className="tabs tabs-box" aria-label="Session breakdown view">
            <button
              type="button"
              role="tab"
              className={`tab ${breakdownView === "timeline" ? "tab-active" : ""}`}
              aria-selected={breakdownView === "timeline"}
              onClick={() => setBreakdownView("timeline")}
            >
              Timeline
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${breakdownView === "details" ? "tab-active" : ""}`}
              aria-selected={breakdownView === "details"}
              onClick={() => setBreakdownView("details")}
            >
              Details
            </button>
          </div>
        </div>

        {!summary.logs.length ? <EmptyCard title="No logs loaded yet" description="Fetch dps.report links or upload EVTC files to generate a session breakdown." /> : null}
        {summary.logs.length > 0 && breakdownView === "timeline" ? <TimelineView items={timelineItems} /> : null}
        {summary.logs.length > 0 && breakdownView === "details" ? <WingDetails logDetailGroups={logDetailGroups} /> : null}
      </div>
    </section>
  );
}

function TimelineView({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return <EmptyCard title="No usable encounter times" description="The loaded logs do not include enough timing data to build a timeline view." />;
  }

  const firstPull = items.find((item): item is Extract<TimelineItem, { type: "pull" }> => item.type === "pull");
  const lastPull = [...items].reverse().find((item): item is Extract<TimelineItem, { type: "pull" }> => item.type === "pull");
  const rows = buildTimelineRows(items);

  return (
    <div className="grid gap-[0.7rem]">
      <div className="grid gap-1 text-[0.9rem] text-muted sm:flex sm:justify-between sm:gap-4">
        <span>{firstPull ? formatDateTime(firstPull.log.start) : "N/A"}</span>
        <span>{lastPull ? formatDateTime(lastPull.log.end) : "N/A"}</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-base-100" aria-label="Session timeline">
        <div className="grid min-w-[760px] gap-[0.7rem] p-3">
          {rows.map((row) => (
            <div className="grid gap-[0.35rem]" key={row.key}>
              <div className="flex items-center text-[0.78rem] font-black uppercase text-accent-2 tracking-[0.08em]">
                <span>{row.label}</span>
              </div>
              <div className="flex min-h-[4.625rem] items-stretch gap-[0.3rem]">{row.items.map((item) => renderTimelineItem(item))}</div>
              {row.transitionAfter ? (
                <div className="mx-auto mt-[0.2rem] flex w-max max-w-full items-center justify-center gap-2 rounded-full border border-dashed border-primary/55 bg-primary/8 px-3 py-[0.35rem] text-[0.86rem] text-accent-2">
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

function renderTimelineItem(item: TimelineItem) {
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

function WingDetails({ logDetailGroups }: { logDetailGroups: ReturnType<typeof summarizeSession>["wings"] }) {
  return (
    <div className="grid gap-[0.9rem]">
      {logDetailGroups.map((wing) => (
        <section className="log-group" key={wing.label}>
          <div className="mb-[0.4rem] flex items-center justify-between gap-3">
            <h4 className="m-0 text-[1rem]">{wing.label}</h4>
            <span className="badge badge-outline">{wing.logs.length} logs</span>
          </div>
          <div
            className="grid grid-cols-5 gap-x-[0.55rem] gap-y-[0.35rem] rounded-t-2xl border border-b-0 border-line bg-primary/6 px-[0.85rem] py-[0.7rem] max-nav:grid-cols-2"
            aria-label={`${wing.label} timing summary`}
          >
            <div className="grid min-w-0 gap-[0.1rem]">
              <span className="text-[0.86rem] text-muted">First pull</span>
              <strong className="wrap-anywhere">{wing.start ? formatDateTime(wing.start) : "N/A"}</strong>
            </div>
            <div className="grid min-w-0 gap-[0.1rem]">
              <span className="text-[0.86rem] text-muted">Last end</span>
              <strong className="wrap-anywhere">{wing.end ? formatDateTime(wing.end) : "N/A"}</strong>
            </div>
            <div className="grid min-w-0 gap-[0.1rem]">
              <span className="text-[0.86rem] text-muted">Elapsed</span>
              <strong className="wrap-anywhere">{formatSeconds(wing.elapsed)}</strong>
            </div>
            <div className="grid min-w-0 gap-[0.1rem]">
              <span className="text-[0.86rem] text-muted">Combat</span>
              <strong className="wrap-anywhere">{formatSeconds(wing.combat)}</strong>
            </div>
            <div className="grid min-w-0 gap-[0.1rem]">
              <span className="text-[0.86rem] text-muted">Downtime</span>
              <strong className="wrap-anywhere">{formatSeconds(wing.downtime)}</strong>
            </div>
          </div>
          <div className="overflow-x-auto rounded-b-2xl border border-line">
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>Encounter</th>
                  <th>Result</th>
                  <th>Duration</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {wing.logs.map((log) => (
                  <tr key={`${wing.label}-${log.permalink}-${log.source}`}>
                    <td>{formatDateTime(log.start)}</td>
                    <td>
                      {log.bossName}
                      {log.isCm ? <span className="badge badge-sm badge-outline ml-1">CM</span> : null}
                    </td>
                    <td>{getPullResult(log)}</td>
                    <td>{formatSeconds(log.duration)}</td>
                    <td>
                      <a href={log.permalink} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function mergeLogs(current: SessionLog[], incoming: SessionLog[]): SessionLog[] {
  const byKey = new Map<string, SessionLog>();
  for (const log of current) byKey.set(log.permalink || log.source, log);
  for (const log of incoming) byKey.set(log.permalink || log.source, log);
  return Array.from(byKey.values());
}

function buildTimelineItems(logs: SessionLog[]): TimelineItem[] {
  const sorted = logs
    .filter((log) => Number.isFinite(log.start) && log.start > 0 && Number.isFinite(log.end) && log.end >= log.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const items: TimelineItem[] = [];
  let previous: SessionLog | null = null;

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

function buildTimelineRows(items: TimelineItem[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let currentItems: TimelineItem[] = [];

  function pushRow(transitionAfter?: Extract<TimelineItem, { type: "gap" }>) {
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

function getTimelineRowLabel(items: TimelineItem[]): string {
  const pull = items.find((item): item is Extract<TimelineItem, { type: "pull" }> => item.type === "pull");
  return pull ? formatWing(pull.log.wing) : "Timeline";
}

function getPullResult(log: SessionLog): string {
  if (log.success == null) return "N/A";
  return log.success ? "Success" : "Fail";
}

function getPullClass(log: SessionLog): string {
  if (log.success == null) return "unknown";
  return log.success ? "kill" : "wipe";
}

function formatRunSessionType(sessionType: RunSessionType): string {
  return sessionType === "full-clear" ? "full clear" : "practice";
}

function formatWing(wing: number | null): string {
  return wing == null ? "Unmapped" : `Wing ${wing}`;
}
