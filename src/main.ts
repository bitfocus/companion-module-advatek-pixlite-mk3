import {
  InstanceBase,
  InstanceStatus,
  type CompanionHTTPRequest,
  type CompanionHTTPResponse,
  type SomeCompanionConfigField,
} from "@companion-module/base";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import { PixLiteClient } from "./pixlite/client.js";
import { emptySnapshot, object } from "./pixlite/model.js";
import { valuesFor } from "./state/view.js";
import { actionDefinitions } from "./actions.js";
import { feedbackDefinitions } from "./feedbacks.js";
import { presetDefinitions } from "./presets.js";
import { configFields } from "./config.js";
import { connectionConfig, connectionOptions } from "./connection.js";
import type { ModuleConfig, ModuleSchema } from "./types.js";
export type { ModuleConfig, ModuleSchema } from "./types.js";
export { UpgradeScripts } from "./upgrades.js";
import { AdarDiscovery } from "./discovery/adar.js";
import { discoveryPage } from "./discovery/page.js";
import {
  discoveredConfig,
  preferHttpsDefaults,
} from "./discovery/selection.js";
import { MediaButtonLabels } from "./companion/media-labels.js";
import { firmwareOutdated } from "./pixlite/version.js";
import { ColourMixer } from "./colour-mixer.js";

export default class PixLiteInstance extends InstanceBase<ModuleSchema> {
  private config: ModuleConfig = {
    host: "",
    port: 0,
    secure: false,
    expectedMac: "",
    ca: "",
    telemetry: false,
  };
  private secrets = { password: "" };
  private client?: PixLiteClient;
  private configError = "";
  private readonly discovery = new AdarDiscovery();
  private readonly nonce = randomBytes(24).toString("hex");
  private variableNames = new Set<string>();
  private publishTimer?: ReturnType<typeof setInterval>;
  private readonly mixer = new ColourMixer(
    () => this.client,
    () => this.publish(),
  );
  private readonly mediaButtons = new MediaButtonLabels(() =>
    this.checkAllFeedbacks(),
  );
  async init(
    config: ModuleConfig,
    _first: boolean,
    secrets: { password: string },
  ): Promise<void> {
    await this.configure(config, secrets);
  }
  async configUpdated(
    config: ModuleConfig,
    secrets: { password: string },
  ): Promise<void> {
    await this.configure(config, secrets);
  }
  private async configure(
    config: ModuleConfig,
    secrets: { password: string },
  ): Promise<void> {
    clearInterval(this.publishTimer);
    this.mixer.reset();
    this.client?.destroy();
    this.client = undefined;
    this.configError = "";
    this.discovery.cancel();
    this.config = Object.assign(
      {
        host: "",
        port: 0,
        secure: false,
        expectedMac: "",
        ca: "",
        telemetry: false,
      },
      config,
    );
    this.secrets = { password: secrets?.password ?? "" };
    try {
      this.config = connectionConfig(this.config);
    } catch (error) {
      this.configError =
        error instanceof Error ? error.message : "Invalid connection type";
    }
    if (this.config.host && !this.configError) {
      try {
        const client = new PixLiteClient({
          ...connectionOptions(this.config),
          password: this.secrets.password,
        });
        this.client = client;
        let wasConnected = false;
        client.on("change", () => {
          if (wasConnected !== client.snapshot.connected) {
            wasConnected = client.snapshot.connected;
            this.definitions();
          }
          this.publish();
        });
        client.on("media", () => this.definitions());
        client.start();
      } catch (error) {
        this.configError =
          error instanceof Error
            ? error.message
            : "Invalid connection settings";
      }
    }
    this.definitions();
    this.publish();
    // Expire values and feedback during pending requests without another device read.
    this.publishTimer = setInterval(() => this.publish(), 500);
  }
  private definitions(): void {
    const snapshot = this.client?.snapshot ?? emptySnapshot();
    this.setActionDefinitions(
      actionDefinitions(
        snapshot,
        (id, options, controlId) => {
          if (id.startsWith("colour_mix_")) {
            void this.mixer
              .execute(id, options, controlId)
              .catch((error: unknown) => {
                this.log(
                  "warn",
                  error instanceof Error ? error.message : "Colour mix failed",
                );
              });
            return;
          }
          if (
            !id.startsWith("intensity_") &&
            !["status_refresh", "media_refresh", "scene_inspect"].includes(id)
          )
            this.mixer.stop();
          const client = this.client;
          if (!client) throw new Error("Select a controller first");
          // Delivery feedback follows the response; do not hold Companion's IPC callback open.
          void client
            .execute(id, options, controlId)
            .catch((error: unknown) => {
              this.log(
                "warn",
                error instanceof Error ? error.message : "Action failed",
              );
            });
        },
        this.mediaButtons,
      ),
    );
    this.setFeedbackDefinitions(
      feedbackDefinitions(
        () => this.client?.snapshot ?? emptySnapshot(),
        this.mediaButtons,
        this.mixer,
      ),
    );
    const presets = presetDefinitions(snapshot);
    this.setPresetDefinitions(presets.sections, presets.presets);
  }
  private publish(): void {
    const snapshot = this.client?.snapshot ?? emptySnapshot();
    this.mixer.observe(snapshot);
    const values = { ...valuesFor(snapshot), ...this.mixer.values(snapshot) };
    values.device_ip = this.config.host;
    values.connection_source = this.config.expectedMac
      ? snapshot.connected
        ? "Expected MAC verified"
        : "Expected MAC pending verification"
      : "Manual";
    // Clear variables absent on the new target or in the new mode.
    for (const name of this.variableNames)
      if (!(name in values)) values[name] = "";
    const newNames = Object.keys(values);
    if (newNames.some((name) => !this.variableNames.has(name))) {
      newNames.forEach((name) => this.variableNames.add(name));
      this.setVariableDefinitions(
        Object.fromEntries(
          [...this.variableNames].map((name) => [
            name,
            { name: name.replaceAll("_", " ") },
          ]),
        ),
      );
    }
    this.setVariableValues(values);
    this.checkAllFeedbacks();
    this.updateStatus(
      !this.config.host || !this.client
        ? InstanceStatus.BadConfig
        : values.connection_ready
          ? InstanceStatus.Ok
          : InstanceStatus.ConnectionFailure,
      !this.config.host
        ? "Select a controller or enter its address"
        : !this.client
          ? this.configError || "Invalid connection settings"
          : values.connection_ready
            ? undefined
            : snapshot.error || "Connecting as operator",
    );
  }
  getConfigFields(): SomeCompanionConfigField[] {
    return configFields(this.label);
  }
  async handleHttpRequest(
    request: CompanionHTTPRequest,
  ): Promise<CompanionHTTPResponse> {
    const path = request.path.replace(/\/$/, "") || "/";
    const json = (status: number, data: unknown): CompanionHTTPResponse => ({
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(data),
    });
    if (request.method === "GET" && path === "/")
      return {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
        body: discoveryPage(this.nonce, this.id),
      };
    const interfaces = Object.entries(networkInterfaces()).flatMap(
      ([name, entries]) =>
        (entries ?? [])
          .filter((entry) => entry.family === "IPv4" && !entry.internal)
          .map((entry) => ({ name, address: entry.address })),
    );
    if (request.method === "GET" && path === "/discovery/state")
      return json(200, {
        interfaces,
        state: this.discovery.state,
        generation: this.discovery.generation,
        devices: this.discovery.devices.map((device) => ({
          ...device,
          firmwareOutdated: firmwareOutdated(device.firmware),
        })),
        partial: this.discovery.partial,
        useHttpsDefaults: preferHttpsDefaults(this.config),
      });
    if (
      request.method !== "POST" ||
      request.headers["x-pixlite-nonce"] !== this.nonce
    )
      return json(403, { error: "Request rejected" });
    let body: Record<string, unknown>;
    try {
      // Companion 5.1.1 can supply parsed JSON despite the API's string-typed body.
      const raw: unknown = request.body;
      if (!raw || JSON.stringify(raw).length > 4096) throw new Error();
      const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      body = object(parsed);
    } catch {
      return json(400, { error: "Invalid request" });
    }
    if (path === "/discovery/scan") {
      if (!interfaces.some((entry) => entry.address === body.interface))
        return json(400, { error: "Choose a host interface" });
      void this.discovery.scan(String(body.interface)).catch(() => undefined);
      return json(202, { state: "Scanning" });
    }
    if (path === "/discovery/select") {
      if (
        body.httpsDefaults !== undefined &&
        typeof body.httpsDefaults !== "boolean"
      )
        return json(400, { error: "Invalid HTTPS selection" });
      const selected =
        this.discovery.generation &&
        body.generation === this.discovery.generation
          ? this.discovery.devices.find(
              (device) =>
                device.mac === body.mac && !device.recovery && device.web,
            )
          : undefined;
      if (!selected)
        return json(409, { error: "Rescan and choose an available device" });
      const config = discoveredConfig(
        this.config,
        selected,
        body.httpsDefaults,
      );
      this.saveConfig(config, undefined);
      await this.configure(config, this.secrets);
      return json(200, { selected: true });
    }
    return json(404, { error: "Unknown route" });
  }
  async destroy(): Promise<void> {
    clearInterval(this.publishTimer);
    this.mixer.stop();
    this.mediaButtons.clear();
    this.discovery.cancel();
    this.client?.destroy();
    this.client = undefined;
  }
}
