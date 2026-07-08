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

type FetchError = {
  source: string;
  message: string;
};

export function SessionTimer() {
  const [domain, setDomain] = useState<DpsReportDomain>("https://dps.report");
  const [linksText, setLinksText] = useState("");
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [errors, setErrors] = useState<FetchError[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [userToken, setUserToken] = useState("");
  const [progress, setProgress] = useState("");

  const summary = useMemo(() => summarizeSession(logs), [logs]);
  const logDetailGroups = useMemo(() => summary.wings.filter((wing) => wing.logs.length > 0), [summary.wings]);
  const extractedLinks = useMemo(() => extractPermalinks(linksText), [linksText]);

  async function fetchLinks() {
    setIsWorking(true);
    setErrors([]);
    setProgress(`Fetching ${extractedLinks.length} report${extractedLinks.length === 1 ? "" : "s"}...`);

    const nextLogs: SessionLog[] = [];
    const nextErrors: FetchError[] = [];

    for (const permalink of extractedLinks) {
      try {
        const metadata = await fetchUploadMetadata(permalink, domain);
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
        const metadata = await uploadLogToDpsReport(file, domain, { anonymous, userToken });
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
      <div className="panel">
        <h2>Raid Session Timer</h2>
        <p>
          Paste dps.report links or upload logs directly. The app groups encounters by Wings 1-8 and calculates elapsed
          time, combat time, downtime, and the full session duration.
        </p>

        <div className="settings-row">
          <label className="field">
            <span>dps.report domain</span>
            <select value={domain} onChange={(event) => setDomain(event.target.value as DpsReportDomain)}>
              <option value="https://dps.report">https://dps.report</option>
              <option value="https://b.dps.report">https://b.dps.report</option>
            </select>
          </label>
          <label className="field">
            <span>User token, optional</span>
            <input
              type="password"
              placeholder="Only needed if you want uploads tied to your token"
              value={userToken}
              onChange={(event) => setUserToken(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="panel two-column-panel">
        <div>
          <h3>Use existing dps.report links</h3>
          <textarea
            value={linksText}
            onChange={(event) => setLinksText(event.target.value)}
            placeholder="Paste one or more dps.report links here..."
            rows={9}
          />
          <div className="inline-actions">
            <button type="button" className="primary" disabled={!extractedLinks.length || isWorking} onClick={fetchLinks}>
              Fetch {extractedLinks.length || ""} link{extractedLinks.length === 1 ? "" : "s"}
            </button>
            <span className="muted">Detected {extractedLinks.length} link{extractedLinks.length === 1 ? "" : "s"}.</span>
          </div>
        </div>

        <div>
          <h3>Or upload logs</h3>
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

      {(progress || errors.length > 0) && (
        <div className="panel slim-panel">
          {progress && <div className="notice info">{progress}</div>}
          {errors.map((error) => (
            <div className="notice error" key={`${error.source}-${error.message}`}>
              <strong>{error.source}</strong>: {error.message}
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Session summary</h3>
          </div>
          <div className="inline-actions">
            <button type="button" className="secondary" disabled={!logs.length} onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="secondary" disabled={!logs.length} onClick={exportJson}>
              Export JSON
            </button>
            <button type="button" className="ghost" disabled={!logs.length} onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>

        <div className="time-sections">
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

          {summary.wings.map((wing) => (
            <article className="time-section" key={wing.label}>
              <div className="time-section-header">
                <div>
                  <span className="eyebrow">{wing.wing == null ? "Other" : `W${wing.wing}`}</span>
                  <h4>{wing.label}</h4>
                </div>
                <span className="pill">{wing.logs.length} logs</span>
              </div>
              <div className="time-stats">
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
            </article>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Log details</h3>
        {!summary.logs.length ? (
          <p className="muted">No logs loaded yet.</p>
        ) : (
          <div className="log-groups">
            {logDetailGroups.map((wing) => (
              <section className="log-group" key={wing.label}>
                <div className="log-group-heading">
                  <h4>{wing.label}</h4>
                  <span className="pill">{wing.logs.length} logs</span>
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
                          <td>{log.success == null ? "N/A" : log.success ? "Success" : "Fail"}</td>
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
        )}
      </div>
    </section>
  );
}

function mergeLogs(current: SessionLog[], incoming: SessionLog[]): SessionLog[] {
  const byKey = new Map<string, SessionLog>();
  for (const log of current) byKey.set(log.permalink || log.source, log);
  for (const log of incoming) byKey.set(log.permalink || log.source, log);
  return Array.from(byKey.values());
}
