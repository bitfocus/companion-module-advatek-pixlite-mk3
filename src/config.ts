import type { SomeCompanionConfigField } from "@companion-module/base";
export function configFields(label: string): SomeCompanionConfigField[] {
  return [
    {
      id: "discovery",
      type: "static-text",
      label: "Discovery",
      width: 12,
      value: `<a href="/instance/${encodeURIComponent(label)}/" target="_blank" rel="noopener">Find controllers</a>`,
    },
    {
      id: "host",
      type: "textinput",
      label: "Controller address",
      tooltip: "IP address or hostname, without a URL path.",
      width: 12,
      default: "",
    },
    {
      id: "connectionMode",
      type: "dropdown",
      label: "Connection",
      width: 12,
      default: "http",
      disableAutoExpression: true,
      tooltip:
        "HTTPS uses the controller's Advatek certificate. Choose custom for a standard server certificate.",
      choices: [
        { id: "http", label: "HTTP" },
        { id: "advatek", label: "HTTPS" },
        { id: "standard", label: "HTTPS (custom certificate)" },
      ],
    },
    {
      id: "password",
      type: "secret-text",
      label: "Operator password",
      width: 12,
      default: "",
    },
    {
      id: "expectedMac",
      type: "textinput",
      label: "Device MAC",
      width: 12,
      default: "",
      tooltip:
        "Discovery fills this. Required for Advatek HTTPS; optional identity check for other connections.",
    },
    {
      id: "telemetry",
      type: "checkbox",
      label: "Device statistics",
      width: 12,
      default: false,
      tooltip:
        "Read supported statistics, including A4-S temperature and power readings. Playback status always updates automatically.",
    },
    {
      id: "advanced",
      type: "checkbox",
      label: "Advanced",
      width: 12,
      default: false,
      disableAutoExpression: true,
    },
    {
      id: "port",
      type: "number",
      label: "Port override",
      width: 12,
      default: 0,
      min: 0,
      max: 65535,
      tooltip: "0 uses the normal port: HTTP 80 or HTTPS 4443.",
      isVisibleExpression: "$(options:advanced)",
    },
    {
      id: "ca",
      type: "textinput",
      label: "CA certificate",
      width: 12,
      multiline: true,
      default: "",
      tooltip:
        "Optional PEM certificate for a custom HTTPS issuer. Not needed for the supplied Advatek certificate.",
      isVisibleExpression:
        "$(options:advanced) && $(options:connectionMode) == 'standard'",
    },
  ];
}
