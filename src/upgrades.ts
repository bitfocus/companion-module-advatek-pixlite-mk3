import type { CompanionStaticUpgradeScript } from "@companion-module/base";
import type { ModuleConfig } from "./types.js";
import { upgradeConnection } from "./connection.js";
// Add missing offline channel defaults without replacing literals or expressions.
const addChannelDefaults: CompanionStaticUpgradeScript<
  ModuleConfig,
  { password: string }
> = (_context, props) => ({
  updatedConfig: null,
  updatedActions: props.actions
    .filter(
      (action) =>
        action.actionId === "output_static_colour" &&
        (action.options.white === undefined ||
          action.options.extra === undefined),
    )
    .map((action) => ({
      ...action,
      options: {
        white: { value: 0, isExpression: false },
        extra: { value: 0, isExpression: false },
        ...action.options,
      },
    })),
  updatedFeedbacks: [],
});

const addTlsProfile: CompanionStaticUpgradeScript<
  ModuleConfig,
  { password: string }
> = (_context, props) => ({
  updatedConfig:
    props.config && props.config.tlsProfile === undefined
      ? { ...props.config, tlsProfile: "standard" }
      : null,
  updatedActions: [],
  updatedFeedbacks: [],
});

const simplifyConnection: CompanionStaticUpgradeScript<
  ModuleConfig,
  { password: string }
> = (_context, props) => ({
  updatedConfig: props.config ? upgradeConnection(props.config) : null,
  updatedActions: [],
  updatedFeedbacks: [],
});

export const UpgradeScripts = [
  addChannelDefaults,
  addTlsProfile,
  simplifyConnection,
];
