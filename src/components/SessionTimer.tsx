import { useMemo, useState } from "react";
import { EmptyCard } from "./ui/empty-card";
import { FileDropzone } from "./ui/file-dropzone";
import { AppSelect } from "./ui/app-select";
import { buildSessionTimelineItems, SessionTimelineView } from "./SessionTimeline";
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
import { downloadBlob, formatDateTime, formatRunSessionType, formatSeconds, pluralize } from "../lib/format";
import { RunSessionType, saveSessionLogs } from "../lib/runHistory";
import { compactFieldClass, cx, fieldClass, inlineActionsClass, panelClass, sectionHeadingClass } from "../lib/ui";

type BreakdownView = "timeline" | "details";

type FetchError = {
  source: string;
  message: string;
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
  const timelineItems = useMemo(() => buildSessionTimelineItems(summary.logs), [summary.logs]);

  async function fetchLinks() {
    setIsWorking(true);
    setErrors([]);
    setProgress(`Fetching ${extractedLinks.length} ${pluralize(extractedLinks.length, "report")}...`);

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
    setProgress(`Uploading ${uploadFiles.length} ${pluralize(uploadFiles.length, "file")}...`);

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
        `Saved ${result.saved} new and updated ${result.updated} existing ${pluralize(result.updated, "run")} as ${formatRunSessionType(runSessionType)}.`,
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
      <div className={cx(panelClass, "grid items-start gap-4 grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)] max-nav:grid-cols-1")}>
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
              Fetch {extractedLinks.length || ""} {pluralize(extractedLinks.length, "link")}
            </button>
            <span className="muted">Detected {extractedLinks.length} {pluralize(extractedLinks.length, "link")}.</span>
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
        {summary.logs.length > 0 && breakdownView === "timeline" ? <SessionTimelineView items={timelineItems} /> : null}
        {summary.logs.length > 0 && breakdownView === "details" ? <WingDetails logDetailGroups={logDetailGroups} /> : null}
      </div>
    </section>
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

function getPullResult(log: SessionLog): string {
  if (log.success == null) return "N/A";
  return log.success ? "Success" : "Fail";
}

