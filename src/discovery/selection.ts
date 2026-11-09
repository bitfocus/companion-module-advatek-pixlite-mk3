import type { ModuleConfig } from "../types.js";
import type { DiscoveredDevice } from "./adar.js";

export function preferHttpsDefaults(config: ModuleConfig): boolean {
  return (
    !config.host &&
    (config.port === 0 || config.port === 80) &&
    (!config.connectionMode || config.connectionMode === "http") &&
    !config.secure &&
    (config.tlsProfile ?? "standard") === "standard" &&
    !config.ca
  );
}

export function discoveredConfig(
  config: ModuleConfig,
  device: DiscoveredDevice,
  useHttpsDefaults = preferHttpsDefaults(config),
): ModuleConfig {
  return {
    ...config,
    ...(useHttpsDefaults
      ? {
          secure: true,
          port: 0,
          connectionMode: "advatek" as const,
          tlsProfile: "advatek" as const,
          ca: "",
        }
      : {}),
    host: device.host,
    expectedMac: device.mac,
  };
}
