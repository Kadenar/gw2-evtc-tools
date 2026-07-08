import { useMemo, useState } from "react";
import { getEncounterName } from "../data/encounters";
import { downloadBlob, makeSafeFilename } from "../lib/format";
import { ExtractedEvtc, EvtcHeaderInfo, parseEvtcHeader, readEvtcFile, repackEvtc, rewriteEvtcBossId } from "../lib/evtc";

type LoadedLog = {
  file: File;
  extracted: ExtractedEvtc;
  header: EvtcHeaderInfo;
};

const SUPPORTED_REWRITES = new Map([
  [15429, 15375],
  [16247, 16246],
]);

export function TriggerRewriter() {
  const [loaded, setLoaded] = useState<LoadedLog | null>(null);
  const [manualOffset, setManualOffset] = useState<number | null>(null);
  const [preserveName, setPreserveName] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const suggestedOffset = loaded?.header.bossIdOffset ?? 13;
  const activeOffset = manualOffset ?? suggestedOffset;
  const currentBossLabel = loaded?.header.bossId ? getEncounterName(loaded.header.bossId) : "Unknown";
  const targetBossId = loaded?.header.bossId ? SUPPORTED_REWRITES.get(loaded.header.bossId) ?? null : null;
  const targetBossLabel = targetBossId ? getEncounterName(targetBossId) : null;
  const canRewrite = loaded != null && targetBossId != null;

  const knownCandidates = useMemo(() => loaded?.header.candidates.filter((candidate) => candidate.known) ?? [], [loaded]);

  async function handleFile(file: File | null) {
    setLoaded(null);
    setMessage("");
    setError("");
    setManualOffset(null);
    if (!file) return;

    try {
      const extracted = await readEvtcFile(file);
      const header = parseEvtcHeader(extracted.evtcBytes);
      setLoaded({ file, extracted, header });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this EVTC/ZEVTC file.");
    }
  }

  function rewriteAndDownload() {
    if (!loaded || targetBossId == null) return;
    setMessage("");
    setError("");

    try {
      const rewrittenEvtc = rewriteEvtcBossId(loaded.extracted.evtcBytes, targetBossId, activeOffset);
      const outputBytes = repackEvtc(loaded.extracted, rewrittenEvtc);
      const arrayBuffer = new ArrayBuffer(outputBytes.byteLength);
      new Uint8Array(arrayBuffer).set(outputBytes);
      const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });

      const targetName = getEncounterName(targetBossId)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const extension = loaded.file.name.toLowerCase().endsWith(".evtc") ? ".evtc" : ".zevtc";
      const filename = preserveName
        ? loaded.file.name
        : `${makeSafeFilename(loaded.file.name)}_${targetName}${extension}`;

      downloadBlob(blob, filename);
      setMessage(`Downloaded rewritten file as ${filename}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rewrite this file.");
    }
  }

  return (
    <section className="grid gap-4 grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] max-nav:grid-cols-1">
      <div className="panel">
        <h2>ID Rewriter</h2>
        <p>
          Missing Sabetha or Xera logs? Your data is probably in the previous log. A separate one was not generated because your entire squad was never out of combat.
        </p>
        <p>
          Upload your Gorseval or Twisted Castle log below and we will try to generate your missing log.
        </p>
        <p>
          Supports only <strong>Gorseval -&gt; Sabetha</strong> and <strong>Twisted Castle -&gt; Xera</strong>.
        </p>

        <label className="dropzone">
          <input
            type="file"
            accept=".evtc,.zevtc,.zip,application/zip,application/octet-stream"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          <span>Choose EVTC/ZEVTC file</span>
          <small className="text-muted">Supports raw EVTC and zipped ZEVTC-style archives.</small>
        </label>

        {error && <div role="alert" className="alert alert-error mt-3">{error}</div>}
        {message && <div role="alert" className="alert alert-success mt-3">{message}</div>}
      </div>

      <div className="panel">
        <h3>Rewrite settings</h3>
        {!loaded ? (
          <p className="text-muted">Upload a file to inspect its header.</p>
        ) : (
          <>
            <div className="stat-list">
              <div>
                <span>Detected file</span>
                <strong>{loaded.file.name}</strong>
              </div>
              <div>
                <span>Container</span>
                <strong>{loaded.extracted.kind}</strong>
              </div>
              <div>
                <span>EVTC version</span>
                <strong>{loaded.header.version}</strong>
              </div>
              <div>
                <span>Current trigger</span>
                <strong>
                  {currentBossLabel} {loaded.header.bossId ? `(${loaded.header.bossId})` : ""}
                </strong>
              </div>
              <div>
                <span>Boss ID offset</span>
                <strong>0x{activeOffset.toString(16).toUpperCase()}</strong>
              </div>
            </div>

            {canRewrite ? (
              <div role="alert" className="alert alert-info mt-3">
                <span>
                  Rewrite target: <strong>{targetBossLabel}</strong> ({targetBossId})
                </span>
              </div>
            ) : (
              <div role="alert" className="alert alert-warning mt-3">
                <span>Unsupported source log. Upload Gorseval (15429) or Twisted Castle (16247).</span>
              </div>
            )}

            <details className="my-4 rounded-2xl border border-line bg-black/[0.16] p-[0.85rem]">
              <summary className="cursor-pointer font-extrabold">Advanced header details</summary>
              <label className="field compact">
                <span>Manual boss-id offset</span>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={manualOffset ?? suggestedOffset}
                  onChange={(event) => setManualOffset(Number(event.target.value))}
                />
              </label>
              <label className="my-[0.8rem] flex items-center gap-[0.55rem] text-muted">
                <input type="checkbox" checked={preserveName} onChange={(event) => setPreserveName(event.target.checked)} />
                <span>Preserve original filename on download</span>
              </label>
              <div className="mt-[0.6rem] flex flex-wrap gap-[0.45rem]">
                {knownCandidates.length ? (
                  knownCandidates.map((candidate) => (
                    <span className="badge badge-outline" key={`${candidate.offset}-${candidate.bossId}`}>
                      0x{candidate.offset.toString(16).toUpperCase()}: {getEncounterName(candidate.bossId)} ({candidate.bossId})
                    </span>
                  ))
                ) : (
                  <span className="badge badge-outline">No known boss ids found in the first 32 bytes.</span>
                )}
              </div>
            </details>

            <button type="button" className="btn btn-primary btn-block" disabled={!canRewrite} onClick={rewriteAndDownload}>
              Download rewritten log
            </button>
          </>
        )}
      </div>
    </section>
  );
}
