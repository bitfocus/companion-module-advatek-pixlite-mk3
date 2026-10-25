import type {
  CompanionOptionValues,
  CompanionVariableValue,
} from "@companion-module/base";
export type ModuleConfig = {
  host: string;
  // Zero selects the normal protocol port; resolve it before creating a client.
  port: number;
  // Legacy saved fields. connectionMode takes precedence when present.
  secure: boolean;
  tlsProfile?: "standard" | "advatek";
  expectedMac: string;
  ca: string;
  telemetry: boolean;
  connectionMode?: "http" | "advatek" | "standard";
  advanced?: boolean;
};

export type ModuleSchema = {
  config: ModuleConfig;
  secrets: { password: string };
  actions: Record<string, { options: CompanionOptionValues }>;
  feedbacks: Record<
    string,
    { type: "boolean" | "value"; options: CompanionOptionValues }
  >;
  variables: Record<string, CompanionVariableValue>;
};
