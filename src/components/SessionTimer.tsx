import { useMemo, useState } from "react";
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
    <section className="session-layout">
      <div className="panel two-column-panel">
        <div>
          <h3>Use existing dps.report links</h3>
          <textarea
            className="session-links-input"
            value={linksText}
            onChange={(event) => setLinksText(event.target.value)}
            placeholder="Paste one or more dps.report links here..."
            rows={6}
          />
          <div className="inline-actions">
            <button type="button" className="primary" disabled={!extractedLinks.length || isWorking} onClick={fetchLinks}>
              Fetch {extractedLinks.length || ""} link{extractedLinks.length === 1 ? "" : "s"}
            </button>
            <span className="muted">Detected {extractedLinks.length} link{extractedLinks.length === 1 ? "" : "s"}.</span>
          </div>
          {(progress || errors.length > 0) && (
            <div className="compact-status">
              {progress && <div className={errors.length ? "status-text warning-text" : "status-text"}>{progress}</div>}
              {errors.map((error) => (
                <div className="status-text error-text" key={`${error.source}-${error.message}`}>
                  <strong>{error.source}</strong>: {error.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3>Or upload logs</h3>
          <label className="field upload-domain-field">
            <span>Upload domain</span>
            <select value={uploadDomain} onChange={(event) => setUploadDomain(event.target.value as DpsReportDomain)}>
              <option value="https://dps.report">https://dps.report</option>
              <option value="https://b.dps.report">https://b.dps.report</option>
            </select>
          </label>
          <label className="dropzone compact-dropzone">
            <input
              type="file"
              multiple
              accept=".evtc,.zevtc,.zip,application/zip,application/octet-stream"
              onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
            />
            <span>Choose EVTC/ZEVTC logs</span>
            <small>{uploadFiles.length ? `${uploadFiles.length} file(s) selected` : "Uploaded from your browser to dps.report"}</small>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
            <span>Upload anonymously</span>
          </label>
          <button type="button" className="primary" disabled={!uploadFiles.length || isWorking} onClick={uploadFilesToDpsReport}>
            Upload and calculate
          </button>
          {uploadFiles.length > 25 && (
            <p className="notice warning">
              dps.report rate-limits uploads. This app uploads sequentially, but 25+ files may still need a retry if the
              server asks you to slow down.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Session summary</h3>
          </div>
          <div className="inline-actions summary-actions">
            <label className="field compact inline-field">
              <span>History type</span>
              <select value={runSessionType} disabled={isWorking} onChange={(event) => setRunSessionType(event.target.value as RunSessionType)}>
                <option value="full-clear">Full clear</option>
                <option value="practice">Practice</option>
              </select>
            </label>
            <button type="button" className="secondary" disabled={!logs.length} onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="secondary" disabled={!logs.length} onClick={exportJson}>
              Export JSON
            </button>
            <button type="button" className="secondary" disabled={!logs.length || isWorking} onClick={saveToRunHistory}>
              Save to Run History
            </button>
            <button type="button" className="ghost" disabled={!logs.length} onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>

        {historyStatus ? <p className="status-text">{historyStatus}</p> : null}

        <div className="time-sections single-summary">
          <article className="time-section full-session">
            <div className="time-section-header">
              <div>
                <span className="eyebrow">Full</span>
                <h4>Full session</h4>
              </div>
              <span className="pill">{summary.logs.length} logs</span>
            </div>
            <div className="time-stats">
              <div>
                <span>First pull</span>
                <strong>{summary.start ? formatDateTime(summary.start) : "N/A"}</strong>
              </div>
              <div>
                <span>Last end</span>
                <strong>{summary.end ? formatDateTime(summary.end) : "N/A"}</strong>
              </div>
              <div>
                <span>Elapsed</span>
                <strong>{formatSeconds(summary.elapsed)}</strong>
              </div>
              <div>
                <span>Combat</span>
                <strong>{formatSeconds(summary.combat)}</strong>
              </div>
              <div>
                <span>Downtime</span>
                <strong>{formatSeconds(summary.downtime)}</strong>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Session breakdown</h3>
          </div>
          <div className="view-toggle" role="group" aria-label="Session breakdown view">
            <button
              type="button"
              className={breakdownView === "timeline" ? "active" : ""}
              aria-pressed={breakdownView === "timeline"}
              onClick={() => setBreakdownView("timeline")}
            >
              Timeline
            </button>
            <button
              type="button"
              className={breakdownView === "details" ? "active" : ""}
              aria-pressed={breakdownView === "details"}
              onClick={() => setBreakdownView("details")}
            >
              Details
            </button>
          </div>
        </div>

        {!summary.logs.length ? <p className="muted">No logs loaded yet.</p> : null}
        {summary.logs.length > 0 && breakdownView === "timeline" ? <TimelineView items={timelineItems} /> : null}
        {summary.logs.length > 0 && breakdownView === "details" ? <WingDetails logDetailGroups={logDetailGroups} /> : null}
      </div>
    </section>
  );
}

function TimelineView({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return <p className="muted">No logs with usable encounter times were loaded.</p>;
  }

  const firstPull = items.find((item): item is Extract<TimelineItem, { type: "pull" }> => item.type === "pull");
  const lastPull = [...items].reverse().find((item): item is Extract<TimelineItem, { type: "pull" }> => item.type === "pull");
  const rows = buildTimelineRows(items);

  return (
    <div className="timeline-view">
      <div className="timeline-meta">
        <span>{firstPull ? formatDateTime(firstPull.log.start) : "N/A"}</span>
        <span>{lastPull ? formatDateTime(lastPull.log.end) : "N/A"}</span>
      </div>
      <div className="timeline-scroll" aria-label="Session timeline">
        <div className="timeline-lines">
          {rows.map((row) => (
            <div className="timeline-row" key={row.key}>
              <div className="timeline-row-heading">
                <span>{row.label}</span>
              </div>
              <div className="timeline-track">{row.items.map((item) => renderTimelineItem(item))}</div>
              {row.transitionAfter ? (
                <div className="timeline-row-divider">
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
      <div className="timeline-legend" aria-label="Timeline legend">
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
    <div className="log-groups">
      {logDetailGroups.map((wing) => (
        <section className="log-group" key={wing.label}>
          <div className="log-group-heading">
            <h4>{wing.label}</h4>
            <span className="pill">{wing.logs.length} logs</span>
          </div>
          <div className="wing-time-summary" aria-label={`${wing.label} timing summary`}>
            <div>
              <span>First pull</span>
              <strong>{wing.start ? formatDateTime(wing.start) : "N/A"}</strong>
            </div>
            <div>
              <span>Last end</span>
              <strong>{wing.end ? formatDateTime(wing.end) : "N/A"}</strong>
            </div>
            <div>
              <span>Elapsed</span>
              <strong>{formatSeconds(wing.elapsed)}</strong>
            </div>
            <div>
              <span>Combat</span>
              <strong>{formatSeconds(wing.combat)}</strong>
            </div>
            <div>
              <span>Downtime</span>
              <strong>{formatSeconds(wing.downtime)}</strong>
            </div>
          </div>
          <div className="table-wrap">
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
                      {log.isCm ? <span className="pill">CM</span> : null}
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
