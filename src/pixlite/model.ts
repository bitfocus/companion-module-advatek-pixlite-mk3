import { firmwareOutdated } from "./version.js";
/** Only supported controller identities are accepted, including manual targets. */
export const SUPPORTED_MODELS = new Set([
  "PixLite A4-S Mk3",
  "PixLite E4-S Mk3",
  "PixLite E16-S Mk3",
  "PixLite T8-S Mk3",
]);

export type ObjectValue = Record<string, unknown>;
export const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
export function at(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, key) => object(current)[key], value);
}
export const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
export const normaliseMac = (value: unknown): string =>
  typeof value === "string" ? value.replace(/[:-]/g, "").toUpperCase() : "";
export function numberInput(
  value: unknown,
  fallback: number,
  min = 0,
  max = 4294967295,
): number {
  const result =
    value === undefined
      ? fallback
      : typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : NaN;
  if (!Number.isFinite(result) || result < min || result > max)
    throw new Error(`Value must be between ${min} and ${max}`);
  return result;
}
export function filename(value: unknown, extension: ".scn" | ".pl"): string {
  if (
    typeof value !== "string" ||
    !value.endsWith(extension) ||
    value.length > 63 ||
    !/^[\x20-\x21\x23-\x5b\x5d-\x7e]+$/.test(value) ||
    /[/\\]/.test(value)
  ) {
    throw new Error(
      `Enter an exact ASCII ${extension} filename, at most 63 characters, without a path`,
    );
  }
  return value;
}

export interface MediaFile {
  file: string;
  attr: string;
  size: number;
}
export interface VerifiedVersion {
  model: string;
  name: string;
  firmware: string;
  api: string;
  minor: number;
}
export function verifyVersion(value: unknown): VerifiedVersion {
  const version = object(object(value).result ?? value);
  if (
    !SUPPORTED_MODELS.has(String(version.prodName)) ||
    version.prodFamily !== 0x50697833
  )
    throw new Error("Unsupported device");
  if (object(version.operUser).en !== true)
    throw new Error("Operator account is unavailable");
  if (typeof version.fwVer === "string" && firmwareOutdated(version.fwVer))
    throw new Error("Firmware v3.15.0 or newer is required");
  const supported = array(version.apiVer)
    .map(object)
    .find((entry) => entry.maj === "v1");
  const range = array(supported?.min);
  const low = range[0],
    high = range[1];
  if (
    typeof low !== "number" ||
    typeof high !== "number" ||
    !Number.isInteger(low) ||
    !Number.isInteger(high) ||
    low < 0 ||
    low > high ||
    low > 9 ||
    high < 9
  )
    throw new Error("PixLite API v1.9 is required");
  const minor = Math.min(high, 9);
  return {
    model: String(version.prodName),
    name: typeof version.nickname === "string" ? version.nickname : "",
    firmware: typeof version.fwVer === "string" ? version.fwVer : "",
    api: `v1.${minor}`,
    minor,
  };
}
export function parseMedia(value: unknown): MediaFile[] {
  return array(value)
    .map(object)
    .flatMap((entry) => {
      if (typeof entry.file !== "string" || typeof entry.attr !== "string")
        return [];
      const extension = entry.file.endsWith(".scn")
        ? ".scn"
        : entry.file.endsWith(".pl")
          ? ".pl"
          : undefined;
      if (!extension) return [];
      try {
        filename(entry.file, extension);
      } catch {
        return [];
      }
      return [
        {
          file: entry.file,
          attr: entry.attr,
          size: typeof entry.size === "number" ? entry.size : 0,
        },
      ];
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

export interface Snapshot {
  connected: boolean;
  version?: VerifiedVersion;
  constants: ObjectValue;
  config: ObjectValue;
  status: ObjectValue;
  statistics: ObjectValue;
  files: MediaFile[];
  statusAt: number;
  mediaAt: number;
  statisticsAt: number;
  metadata: ObjectValue;
  metadataFile: string;
  lastAction: string;
  lastActionControlId: string;
  delivery: string;
  error: string;
  errorCode?: number;
  httpStatus?: number;
}
export const emptySnapshot = (): Snapshot => ({
  connected: false,
  constants: {},
  config: {},
  status: {},
  statistics: {},
  files: [],
  statusAt: 0,
  mediaAt: 0,
  statisticsAt: 0,
  metadata: {},
  metadataFile: "",
  lastAction: "",
  lastActionControlId: "",
  delivery: "Idle",
  error: "",
});
export const isFresh = (timestamp: number, maxAge = 3500): boolean =>
  timestamp > 0 && Date.now() - timestamp <= maxAge;
export function availableIntensityOutputs(snapshot: Snapshot): string[] {
  const modes = array(at(snapshot.config, "auxPort.mode"));
  return array(snapshot.status.outInt)
    .map(object)
    .map((item) => String(item.out))
    .filter(
      (out) =>
        out === "Pix" ||
        (/^Aux:[1-8]$/.test(out) &&
          modes[Number(out.split(":")[1]) - 1] === "DMX512Out"),
    );
}
export function intensityOutputs(snapshot: Snapshot, target: string): string[] {
  const available = availableIntensityOutputs(snapshot);
  const outputs =
    target === "All" ? available : available.filter((out) => out === target);
  if (!outputs.length)
    throw new Error("Selected intensity output is unavailable");
  return outputs;
}

/** Dropdown values are strings; malformed values must not select a fallback action. */
export function stringInput(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string") throw new Error("Expected a text option");
  return value;
}
