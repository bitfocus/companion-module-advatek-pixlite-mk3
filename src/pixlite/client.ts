import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";
import { advatekAgent } from "./advatek-tls.js";
import {
  array,
  at,
  emptySnapshot,
  filename,
  intensityOutputs,
  isFresh,
  normaliseMac,
  numberInput,
  stringInput,
  object,
  parseMedia,
  verifyVersion,
  type ObjectValue,
  type Snapshot,
} from "./model.js";

export interface ClientOptions {
  host: string;
  port: number;
  secure: boolean;
  tlsProfile?: "standard" | "advatek";
  password: string;
  expectedMac?: string;
  ca?: string;
  timeoutMs?: number;
  telemetry?: boolean;
}
const REQUESTS = new Set([
  "constantRead",
  "configRead",
  "statusRead",
  "fileList",
  "scnFileInfo",
  "statisticRead",
  "modePlayback",
  "modeLive",
  "playbackCtrl",
  "progInt",
]);
// Fixed TLS diagnostics omit peer-supplied details and credential-bearing URLs.
const TLS_TRUST_ERROR =
  "HTTPS certificate is not trusted. Choose HTTPS for an Advatek certificate, or check Advanced > CA certificate for a custom issuer.";
const TLS_ERRORS: Record<string, string> = {
  ADVATEK_TLS_INVALID:
    "Advatek HTTPS certificate verification failed. Check Device MAC and the controller certificate.",
  INVALID_PURPOSE:
    "HTTPS certificate purpose is incompatible (INVALID_PURPOSE). Choose HTTPS for the Advatek certificate, or check your custom certificate.",
  ERR_TLS_CERT_ALTNAME_INVALID:
    "HTTPS certificate identity does not match the controller address. See connection help.",
  CERT_HAS_EXPIRED:
    "HTTPS certificate has expired. Check the computer clock and contact Advatek.",
  CERT_NOT_YET_VALID:
    "HTTPS certificate is not yet valid. Check the computer clock and contact Advatek.",
  DEPTH_ZERO_SELF_SIGNED_CERT: TLS_TRUST_ERROR,
  SELF_SIGNED_CERT_IN_CHAIN: TLS_TRUST_ERROR,
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: TLS_TRUST_ERROR,
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:
    "HTTPS certificate chain could not be verified. Check Connection and any Advanced > CA certificate.",
};
export class DeviceError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly httpStatus?: number,
    readonly uncertain = false,
  ) {
    super(message);
  }
}

/** One client belongs to one Companion instance. No global device state or write retries. */
export class PixLiteClient extends EventEmitter {
  snapshot: Snapshot = emptySnapshot();
  private requestId = 0;
  private generation = 0;
  private destroyed = false;
  private ready = false;
  private timer?: ReturnType<typeof setTimeout>;
  private requests = new Set<http.ClientRequest>();
  private exchanges: Promise<void> = Promise.resolve();
  private writes: Promise<void> = Promise.resolve();
  private pendingCommands = 0;
  private commandGeneration = 0;
  private configAt = 0;
  private optionalDenied = new Set<string>();
  constructor(readonly options: ClientOptions) {
    super();
    if (
      !options.host ||
      /[\s/?#@\\]/.test(options.host) ||
      options.host.includes("://")
    )
      throw new Error("Enter a host name or IP address without a URL or path");
    if (
      !Number.isInteger(options.port) ||
      options.port < 1 ||
      options.port > 65535
    )
      throw new Error("Enter a controller port from 1 to 65535");
    if (!["standard", "advatek"].includes(options.tlsProfile ?? "standard"))
      throw new Error("Choose a valid Connection option");
    if (options.secure && options.tlsProfile === "advatek") {
      if (
        !/^(?:[a-f0-9]{12}|(?:[a-f0-9]{2}:){5}[a-f0-9]{2}|(?:[a-f0-9]{2}-){5}[a-f0-9]{2})$/i.test(
          options.expectedMac ?? "",
        )
      )
        throw new Error(
          "HTTPS requires the controller's Device MAC. Use discovery to fill it.",
        );
      if (options.ca)
        throw new Error(
          "A custom CA requires HTTPS (custom certificate). Use Advanced > CA certificate for that connection type.",
        );
    }
  }
  private clean(message: string): string {
    const auth = createHash("sha256")
      .update(this.options.password)
      .digest("base64url");
    let clean = message
      .replace(/https?:\/\/\S+/gi, "[address]")
      .replace(/auth=[^\s&]+/gi, "auth=[redacted]");
    for (const secret of [this.options.password, auth])
      if (secret) clean = clean.split(secret).join("[redacted]");
    return clean.slice(0, 250);
  }
  private async exchange(
    path: string,
    body?: ObjectValue,
    commandSession?: number,
    expiresAt = Infinity,
    beforeSend?: () => void,
  ): Promise<ObjectValue> {
    // API v1.9 section 6.1: serialize reads and writes on one transport queue.
    const generation = this.generation;
    const operation = this.exchanges.then(async () => {
      if (generation !== this.generation || this.destroyed)
        throw new DeviceError("Connection closed");
      try {
        if (commandSession !== undefined) {
          this.assertCommandReady(commandSession, expiresAt);
          beforeSend?.();
          if (this.options.expectedMac) {
            // Keep identity verification and mutation in the same queue slot.
            try {
              const identity = await this.exchangeOnce(path, {
                req: "constantRead",
                id: ++this.requestId,
                params: { path: ["dev.macAddr"] },
              });
              if (
                normaliseMac(at(identity, "result.constant.dev.macAddr")) !==
                normaliseMac(this.options.expectedMac)
              )
                throw new Error("Selected device identity has changed");
            } catch {
              this.disconnect();
              // The mutation has not been sent when identity verification fails.
              throw new DeviceError(
                "Selected device identity could not be verified before command",
              );
            }
            this.assertCommandReady(commandSession, expiresAt);
            beforeSend?.();
          }
        }
        const response = await this.exchangeOnce(path, body);
        if (
          body?.req === "statusRead" &&
          typeof at(response, "result.status.mode") !== "string"
        )
          throw new DeviceError("Status is unavailable");
        return response;
      } catch (error) {
        // Invalidate inside this slot before the next queued operation can dispatch.
        if (
          generation === this.generation &&
          error instanceof DeviceError &&
          (body?.req === "statusRead" ||
            error.uncertain ||
            (error.httpStatus !== undefined && error.httpStatus !== 200))
        )
          this.disconnect();
        throw error;
      }
    });
    this.exchanges = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
  private disconnect(): void {
    this.ready = false;
    this.snapshot.connected = false;
    this.commandGeneration++;
    this.emit("change");
  }
  private assertCommandReady(session: number, expiresAt = Infinity): void {
    if (performance.now() >= expiresAt)
      throw new Error("Command expired while waiting. Press again.");
    if (session !== this.commandGeneration)
      throw new Error(
        "Pending command cancelled after connection loss or uncertain delivery",
      );
    if (
      this.destroyed ||
      !this.ready ||
      !this.snapshot.connected ||
      !isFresh(this.snapshot.statusAt)
    )
      throw new Error("Operator connection is not ready");
  }
  private async exchangeOnce(
    path: string,
    body?: ObjectValue,
  ): Promise<ObjectValue> {
    if (this.destroyed) throw new DeviceError("Connection closed");
    const generation = this.generation;
    return new Promise((resolve, reject) => {
      const transport = this.options.secure ? https : http;
      const agent =
        this.options.secure && this.options.tlsProfile === "advatek"
          ? advatekAgent(
              this.options.host,
              this.options.port,
              normaliseMac(this.options.expectedMac).toLowerCase(),
            )
          : undefined;
      const request = transport.request(
        {
          hostname: this.options.host,
          port: this.options.port,
          path,
          method: body ? "POST" : "GET",
          ...(agent ? { agent } : {}),
          headers: body ? { "Content-Type": "application/json" } : {},
          ...(this.options.secure && this.options.ca
            ? { ca: this.options.ca }
            : {}),
        },
        (response) => {
          const chunks: Buffer[] = [];
          let bytes = 0;
          response.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 2_000_000)
              request.destroy(new Error("Response too large"));
            else chunks.push(chunk);
          });
          response.on("error", () =>
            reject(
              new DeviceError(
                "Incomplete response",
                undefined,
                response.statusCode,
                !!body,
              ),
            ),
          );
          response.on("end", () => {
            if (generation !== this.generation || this.destroyed)
              return reject(new DeviceError("Superseded connection"));
            this.snapshot.httpStatus = response.statusCode;
            if (response.statusCode !== 200)
              return reject(
                new DeviceError(
                  `HTTP ${response.statusCode ?? "error"}`,
                  undefined,
                  response.statusCode,
                  response.statusCode !== undefined &&
                    response.statusCode >= 500 &&
                    [
                      "modePlayback",
                      "modeLive",
                      "playbackCtrl",
                      "progInt",
                    ].includes(String(body?.req)),
                ),
              );
            try {
              const data: unknown = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
              if (!data || typeof data !== "object" || Array.isArray(data))
                throw new Error("Invalid object");
              const result = object(data);
              // Correlate errors as well as successes before trusting their meaning.
              if (
                body &&
                (result.resp !== body.req ||
                  (body.id !== undefined && result.id !== body.id))
              )
                return reject(
                  new DeviceError("Mismatched response", undefined, 200, true),
                );
              if (result.err !== undefined) {
                const err = object(result.err);
                return reject(
                  new DeviceError(
                    this.clean(
                      typeof err.msg === "string"
                        ? err.msg
                        : "Device rejected request",
                    ),
                    typeof err.code === "number" ? err.code : undefined,
                    200,
                  ),
                );
              }
              resolve(result);
            } catch {
              reject(
                new DeviceError("Malformed response", undefined, 200, !!body),
              );
            }
          });
        },
      );
      this.requests.add(request);
      request.once("close", () => {
        this.requests.delete(request);
        agent?.destroy();
      });
      // An absolute deadline also bounds peers that keep sending partial data.
      const deadline = setTimeout(
        () => request.destroy(new Error("Request timeout")),
        this.options.timeoutMs ?? 3000,
      );
      request.once("close", () => clearTimeout(deadline));
      request.on("error", (error: NodeJS.ErrnoException) =>
        reject(
          new DeviceError(
            (this.options.secure && TLS_ERRORS[error.code ?? ""]) ||
              "Connection failed or timed out",
            undefined,
            undefined,
            !!body && !TLS_ERRORS[error.code ?? ""],
          ),
        ),
      );
      request.end(body ? JSON.stringify(body) : undefined);
    });
  }
  private async request(
    req: string,
    params?: ObjectValue,
    commandSession?: number,
    expiresAt = Infinity,
    beforeSend?: () => void,
  ): Promise<ObjectValue> {
    if (!REQUESTS.has(req))
      throw new Error("Request is outside the operator API");
    const api = this.snapshot.version?.api;
    if (!api) throw new Error("Not connected");
    const auth = createHash("sha256")
      .update(this.options.password)
      .digest("base64url");
    const response = await this.exchange(
      `/${api}/?user=oper&auth=${auth}`,
      { req, id: ++this.requestId, ...(params ? { params } : {}) },
      commandSession,
      expiresAt,
      beforeSend,
    );
    return object(response.result);
  }
  async connect(): Promise<void> {
    this.disconnect();
    const previous = this.snapshot;
    this.snapshot = {
      ...emptySnapshot(),
      lastAction: previous.lastAction,
      lastActionControlId: previous.lastActionControlId,
      delivery: previous.delivery,
      error: previous.error,
      errorCode: previous.errorCode,
    };
    this.configAt = 0;
    this.emit("media");
    this.emit("change");
    const generation = this.generation;
    const session = this.commandGeneration;
    const version = verifyVersion(await this.exchange("/ver"));
    this.snapshot.version = version;
    this.optionalDenied.clear();
    // Require MAC verification for discovered targets; manual hosts may deny constants.
    try {
      this.snapshot.constants = object(
        (await this.request("constantRead", { path: ["dev"] })).constant,
      );
    } catch (error) {
      if (this.options.expectedMac) throw error;
    }
    if (
      this.options.expectedMac &&
      normaliseMac(at(this.snapshot.constants, "dev.macAddr")) !==
        normaliseMac(this.options.expectedMac)
    )
      throw new DeviceError("Selected device identity could not be verified");
    if (generation !== this.generation) return;
    await this.refreshStatus();
    await this.refreshContext();
    await this.refreshMedia().catch(() => undefined);
    if (this.options.telemetry) await this.refreshStatistics();
    if (generation !== this.generation || session !== this.commandGeneration)
      throw new DeviceError("Connection initialization was interrupted");
    // Optional reads can expire status; refresh it before publishing Ready.
    this.ready = true;
    await this.refreshStatus();
  }
  async refreshStatus(): Promise<void> {
    const status = object(
      (await this.request("statusRead", { path: [""] })).status,
    );
    if (typeof status.mode !== "string")
      throw new DeviceError("Status is unavailable");
    this.snapshot.status = status;
    this.snapshot.statusAt = Date.now();
    this.snapshot.connected = this.ready;
    this.emit("change");
  }
  async refreshMedia(): Promise<void> {
    const result = await this.request("fileList", {
      pattern: ["*.scn", "*.pl"],
    });
    if (!Array.isArray(result.files))
      throw new DeviceError("Invalid media list");
    this.snapshot.files = parseMedia(result.files);
    this.snapshot.mediaAt = Date.now();
    this.emit("media");
    this.emit("change");
  }
  private async optional(
    key: string,
    req: string,
    path: string[],
  ): Promise<ObjectValue | undefined> {
    if (this.optionalDenied.has(key)) return undefined;
    try {
      return await this.request(req, { path });
    } catch (error) {
      if (
        error instanceof DeviceError &&
        [3, 10, 11, 12].includes(error.code ?? -1)
      )
        this.optionalDenied.add(key);
      return undefined;
    }
  }
  private async refreshContext(): Promise<void> {
    const core = await this.optional("context", "configRead", [
      "pix.colorType",
      "pix.pbMode",
      "pix.liveIntSrc",
      "auxPort",
    ]);
    const palette = await this.optional("palette", "configRead", [
      "operIf.pal",
      "operIf.colorRes",
      "operIf.fadeMs",
    ]);
    this.snapshot.config = {
      ...object(core?.config),
      ...object(palette?.config),
    };
    this.configAt = Date.now();
    this.emit("media");
  }
  async refreshStatistics(): Promise<void> {
    const result = await this.optional("statistics", "statisticRead", [
      "dev.temp",
      "dev.bankVolt",
      "dev.cpu",
      "pixPwrOuts",
      "pixData",
      "auxData",
      "diag",
    ]);
    if (result && object(result.statistic) !== result.statistic) return;
    if (result) {
      this.snapshot.statistics = object(result.statistic);
      this.snapshot.statisticsAt = Date.now();
      this.emit("change");
    }
  }
  async inspectScene(file: string): Promise<void> {
    filename(file, ".scn");
    const result = await this.request("scnFileInfo", { file });
    this.snapshot.metadata = result;
    this.snapshot.metadataFile = file;
    this.emit("change");
  }
  start(): void {
    const tick = async (): Promise<void> => {
      try {
        if (!this.snapshot.connected) await this.connect();
        else {
          await this.refreshStatus();
          if (
            this.options.telemetry &&
            Date.now() - this.snapshot.statisticsAt > 2000
          )
            await this.refreshStatistics();
          if (Date.now() - this.snapshot.mediaAt > 30000)
            await this.refreshMedia().catch(() => undefined);
          if (Date.now() - this.configAt > 30000) await this.refreshContext();
        }
      } catch (error) {
        if (!this.destroyed) {
          this.disconnect();
          this.snapshot.error = this.clean(
            error instanceof Error ? error.message : "Connection failed",
          );
          this.emit("change");
        }
      } finally {
        if (!this.destroyed)
          this.timer = setTimeout(
            () => void tick(),
            this.snapshot.connected ? 1000 : 4000,
          );
      }
    };
    if (!this.destroyed && !this.timer)
      this.timer = setTimeout(
        () => void tick(),
        Math.floor(Math.random() * 250),
      );
  }
  async execute(
    action: string,
    options: ObjectValue,
    controlId = "",
    beforeSend?: () => void,
  ): Promise<void> {
    // Check now and at execution so an offline press cannot run after reconnect.
    if (
      this.destroyed ||
      !this.snapshot.connected ||
      !isFresh(this.snapshot.statusAt)
    ) {
      const message = "Operator connection is not ready";
      // Preserve an in-flight command or unresolved delivery warning.
      if (
        !this.destroyed &&
        this.pendingCommands === 0 &&
        this.snapshot.delivery !== "Unknown delivery"
      ) {
        this.snapshot.lastAction = action;
        this.snapshot.lastActionControlId = controlId;
        this.snapshot.delivery = "Rejected";
        this.snapshot.error = message;
        this.snapshot.errorCode = undefined;
        this.emit("change");
      }
      throw new Error(message);
    }
    if (this.pendingCommands >= 32)
      throw new Error(
        "Command queue is full. Wait for pending commands to complete.",
      );
    const generation = this.commandGeneration;
    // Bound queued operator intent, including time spent verifying identity.
    const expiresAt = performance.now() + 10000;
    this.pendingCommands++;
    const operation = this.writes.then(async () => {
      try {
        if (generation !== this.commandGeneration)
          throw new Error(
            "Pending command cancelled after connection loss or uncertain delivery",
          );
        await this.perform(
          action,
          options,
          generation,
          controlId,
          expiresAt,
          beforeSend,
        );
      } finally {
        this.pendingCommands--;
      }
    });
    this.writes = operation.catch(() => undefined);
    return operation;
  }
  private async perform(
    action: string,
    opts: ObjectValue,
    session: number,
    controlId: string,
    expiresAt: number,
    beforeSend?: () => void,
  ): Promise<void> {
    if (
      this.destroyed ||
      !this.snapshot.connected ||
      !isFresh(this.snapshot.statusAt)
    )
      throw new Error("Operator connection is not ready");
    this.snapshot.lastAction = action;
    this.snapshot.lastActionControlId = controlId;
    this.snapshot.delivery = "Pending";
    this.snapshot.error = "";
    this.snapshot.errorCode = undefined;
    this.emit("change");
    try {
      this.assertCommandReady(session, expiresAt);
      if (beforeSend) {
        await this.refreshStatus();
        beforeSend();
      }
      const send = async (
        req: string,
        params: ObjectValue,
      ): Promise<ObjectValue> =>
        this.request(req, params, session, expiresAt, beforeSend);
      const fadeMs = Math.round(numberInput(opts.fade, 0));
      if (action === "media_refresh") await this.refreshMedia();
      else if (action === "status_refresh") {
        await this.refreshStatus();
        if (this.options.telemetry) await this.refreshStatistics();
      } else if (action === "scene_inspect")
        await this.inspectScene(stringInput(opts.file, ""));
      else if (action === "scene_play" || action === "playlist_play") {
        const file = filename(
          opts.file,
          action === "scene_play" ? ".scn" : ".pl",
        );
        if (
          this.snapshot.files.some(
            (entry) => entry.file === file && entry.attr === "h",
          )
        )
          throw new Error(
            "Selected file is hidden from the operator dashboard",
          );
        await send("modePlayback", {
          op: "File",
          file,
          cnt: 0,
          fadeMs,
        });
      } else if (action === "mode_live") await send("modeLive", { fadeMs });
      else if (action === "output_blank" || action === "output_freeze")
        await send("modePlayback", {
          op: action === "output_blank" ? "Blank" : "Freeze",
          durMs: 0,
          fadeMs,
        });
      else if (
        action === "output_static_colour" ||
        action === "palette_recall"
      ) {
        let color: number[], colorRes: string;
        if (action === "palette_recall") {
          const slot = numberInput(opts.slot, 0, 0, 11);
          const selected = array(at(this.snapshot.config, "operIf.pal"))[slot];
          if (!Array.isArray(selected))
            throw new Error("Dashboard palette is unavailable to the operator");
          colorRes = String(at(this.snapshot.config, "operIf.colorRes"));
          color = selected.map((entry) =>
            numberInput(entry, 0, 0, colorRes === "16Bit" ? 65535 : 255),
          );
        } else {
          colorRes = stringInput(opts.resolution, "8Bit");
          if (!["8Bit", "16Bit"].includes(colorRes))
            throw new Error("Invalid colour resolution");
          const max = colorRes === "16Bit" ? 65535 : 255;
          const rgb = Math.round(
            numberInput(opts.colour, 0xffffff, 0, 0xffffff),
          );
          color = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255].map(
            (channel) => channel * (max / 255),
          );
          const type = at(this.snapshot.config, "pix.colorType");
          if (!["RGB", "RGBW", "RGBWX"].includes(String(type)))
            throw new Error(
              "Controller pixel colour type is unavailable. Refresh the connection before setting a colour.",
            );
          if (
            rgb === 0 &&
            ((type === "RGB" && Number(opts.white ?? 0) > 0) ||
              (type !== "RGBWX" && Number(opts.extra ?? 0) > 0))
          )
            throw new Error(
              "Selected white channel is unavailable for the configured pixel type",
            );
          if (type === "RGBW" || type === "RGBWX")
            color.push(Math.round(numberInput(opts.white, 0, 0, max)));
          if (type === "RGBWX")
            color.push(Math.round(numberInput(opts.extra, 0, 0, max)));
        }
        if (
          color.length < 3 ||
          color.length > 5 ||
          !["8Bit", "16Bit"].includes(colorRes)
        )
          throw new Error("Invalid colour data");
        await send("modePlayback", {
          op: "Color",
          color,
          colorRes,
          durMs: 0,
          fadeMs,
        });
      } else if (action.startsWith("intensity_")) {
        await this.refreshStatus();
        const outputs = intensityOutputs(
          this.snapshot,
          stringInput(opts.output, "Pix"),
        );
        const priority = stringInput(opts.priority, "retain");
        const operations: Record<string, string> = {
          retain: "Set",
          override: "HiSet",
          defer: "LoSet",
        };
        if (!operations[priority])
          throw new Error("Invalid intensity priority");
        const item = outputs.map((out) => {
          if (
            action === "intensity_override_live" ||
            action === "intensity_release_override"
          )
            return {
              out,
              op: action === "intensity_override_live" ? "Hi" : "Lo",
            };
          let factor = Math.round(
            (numberInput(opts.level, 100, 0, 100) * 255) / 100,
          );
          if (
            action === "intensity_increase" ||
            action === "intensity_decrease"
          ) {
            const state = array(this.snapshot.status.outInt)
              .map(object)
              .find((entry) => entry.out === out);
            const current = array(state?.fc)[1];
            if (typeof current !== "number")
              throw new Error("Programmed intensity is unavailable");
            factor = Math.max(
              0,
              Math.min(
                255,
                current +
                  (action === "intensity_increase" ? 1 : -1) *
                    Math.round((numberInput(opts.step, 5, 0, 100) * 255) / 100),
              ),
            );
          } else if (action !== "intensity_set")
            throw new Error("Unknown intensity action");
          return { out, op: operations[priority], fc: factor, durMs: fadeMs };
        });
        await send("progInt", { item });
      } else {
        const operations: Record<string, string> = {
          playback_play: "Play",
          playback_pause: "Paus",
          playback_pause_toggle: "PausTog",
          playback_restart_item: "Rst",
          playlist_previous_item: "Prv",
          playlist_next_item: "Nxt",
          playlist_previous_recorded: "PrvRec",
          playlist_next_recorded: "NxtRec",
        };
        const op = operations[action];
        if (!op) throw new Error("Action is outside the operator dashboard");
        await send("playbackCtrl", { op, fadeMs });
      }
      this.snapshot.delivery = "Accepted";
      if (session === this.commandGeneration)
        await this.refreshStatus().catch(() => {
          // The command was accepted, but its resulting state is unconfirmed.
          if (session === this.commandGeneration) this.disconnect();
        });
    } catch (error) {
      if (error instanceof DeviceError && error.uncertain) {
        this.disconnect();
      }
      this.snapshot.delivery =
        error instanceof DeviceError && error.uncertain
          ? "Unknown delivery"
          : "Rejected";
      this.snapshot.error = this.clean(
        error instanceof Error ? error.message : "Action failed",
      );
      this.snapshot.errorCode =
        error instanceof DeviceError ? error.code : undefined;
      // Do not attach a cause that could expose unsanitised transport details.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(this.snapshot.error);
    } finally {
      this.emit("change");
    }
  }
  destroy(): void {
    this.destroyed = true;
    this.commandGeneration++;
    this.generation++;
    clearTimeout(this.timer);
    for (const request of this.requests) request.destroy();
    this.snapshot.connected = false;
    this.removeAllListeners();
  }
}
