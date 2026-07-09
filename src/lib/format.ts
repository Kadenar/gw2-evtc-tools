import type { RunSessionType } from "./runHistory";

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatWing(wing: number | null): string {
  return wing == null ? "Unmapped" : `Wing ${wing}`;
}

export function getResultClass(success: boolean | null): string {
  if (success == null) return "unknown";
  return success ? "kill" : "wipe";
}

export function formatRunSessionType(sessionType: RunSessionType): string {
  return sessionType === "full-clear" ? "Full clear" : "Practice";
}

/** Pluralize `word` based on `count` (naive +"s"). e.g. pluralize(1,"wing")="wing", pluralize(2,"wing")="wings". */
export function pluralize(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

export function formatSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDateTime(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function makeSafeFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
