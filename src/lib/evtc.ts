import { decompressSync, gzipSync, unzipSync, zipSync } from "fflate";
import { ENCOUNTER_BY_ID } from "../data/encounters";

export type ContainerKind = "raw" | "zip" | "compressed";

export type ExtractedEvtc = {
  originalBytes: Uint8Array;
  evtcBytes: Uint8Array;
  kind: ContainerKind;
  innerFilename?: string;
};

export type EvtcHeaderInfo = {
  version: string;
  bossId: number | null;
  bossIdOffset: number | null;
  candidates: Array<{ offset: number; bossId: number; known: boolean }>;
};

const decoder = new TextDecoder("utf-8");

function looksLikeEvtc(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  return decoder.decode(bytes.slice(0, 4)) === "EVTC";
}

function pickZipEvtc(entries: Record<string, Uint8Array>): { name: string; bytes: Uint8Array } | null {
  const names = Object.keys(entries);
  const evtcName = names.find((name) => name.toLowerCase().endsWith(".evtc"));
  if (evtcName) return { name: evtcName, bytes: entries[evtcName] };

  const firstBinary = names.find((name) => entries[name].length > 16 && looksLikeEvtc(entries[name]));
  if (firstBinary) return { name: firstBinary, bytes: entries[firstBinary] };

  return null;
}

export function extractEvtc(bytes: Uint8Array): ExtractedEvtc {
  if (looksLikeEvtc(bytes)) {
    return { originalBytes: bytes, evtcBytes: bytes, kind: "raw" };
  }

  let zipEntries: Record<string, Uint8Array> | null = null;
  try {
    zipEntries = unzipSync(bytes);
  } catch {
    // Not a zip archive; fall through to generic compressed stream handling.
  }

  if (zipEntries) {
    const evtc = pickZipEvtc(zipEntries);
    if (!evtc) {
      throw new Error("The archive did not contain an .evtc file.");
    }
    return {
      originalBytes: bytes,
      evtcBytes: evtc.bytes,
      kind: "zip",
      innerFilename: evtc.name,
    };
  }

  try {
    const decompressed = decompressSync(bytes);
    if (!looksLikeEvtc(decompressed)) {
      throw new Error("The decompressed file did not look like an EVTC file.");
    }
    return {
      originalBytes: bytes,
      evtcBytes: decompressed,
      kind: "compressed",
    };
  } catch {
    throw new Error("Could not read this file as raw EVTC, zipped ZEVTC, or compressed EVTC.");
  }
}

export async function readEvtcFile(file: File): Promise<ExtractedEvtc> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return extractEvtc(bytes);
}

function readUint16LE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 1 >= bytes.length) return null;
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function parseEvtcHeader(bytes: Uint8Array): EvtcHeaderInfo {
  if (!looksLikeEvtc(bytes)) {
    throw new Error("This does not look like a valid EVTC header.");
  }

  const rawVersion = decoder.decode(bytes.slice(4, 12));
  const version = /^\d{8}$/.test(rawVersion) ? rawVersion : decoder.decode(bytes.slice(0, 12));

  const candidates: EvtcHeaderInfo["candidates"] = [];
  for (let offset = 12; offset <= 31; offset += 1) {
    const bossId = readUint16LE(bytes, offset);
    if (bossId == null) continue;
    const known = ENCOUNTER_BY_ID.has(bossId);
    candidates.push({ offset, bossId, known });
  }

  // Current EVTC headers normally store the encounter/trigger ID near the top of the header.
  // Prefer a known boss/trash id at offset 13, then offset 14, then any known match nearby.
  const preferred =
    candidates.find((candidate) => candidate.offset === 13 && candidate.known) ??
    candidates.find((candidate) => candidate.offset === 14 && candidate.known) ??
    candidates.find((candidate) => candidate.known) ??
    candidates.find((candidate) => candidate.offset === 13) ??
    null;

  return {
    version,
    bossId: preferred?.bossId ?? null,
    bossIdOffset: preferred?.offset ?? null,
    candidates,
  };
}

export function rewriteEvtcBossId(bytes: Uint8Array, newBossId: number, offset: number): Uint8Array {
  if (!looksLikeEvtc(bytes)) {
    throw new Error("Cannot rewrite boss id: file is not a valid EVTC payload.");
  }
  if (!Number.isInteger(newBossId) || newBossId < 0 || newBossId > 65535) {
    throw new Error("Boss ID must fit in an unsigned 16-bit integer.");
  }
  if (!Number.isInteger(offset) || offset < 0 || offset + 1 >= bytes.length) {
    throw new Error("Invalid boss-id offset.");
  }

  const copy = new Uint8Array(bytes);
  copy[offset] = newBossId & 0xff;
  copy[offset + 1] = (newBossId >> 8) & 0xff;
  return copy;
}

export function repackEvtc(extracted: ExtractedEvtc, rewrittenEvtc: Uint8Array): Uint8Array {
  if (extracted.kind === "raw") {
    return rewrittenEvtc;
  }

  if (extracted.kind === "zip") {
    const innerFilename = extracted.innerFilename ?? "rewritten.evtc";
    return zipSync({ [innerFilename]: rewrittenEvtc }, { level: 6 });
  }

  return gzipSync(rewrittenEvtc, { level: 6 });
}
