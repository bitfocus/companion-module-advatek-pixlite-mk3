import "./style.css";
import type { DiscoveredDevice } from "../../src/discovery/types.js";

type DiscoveryState = {
  interfaces: { name: string; address: string }[];
  state: string;
  generation: string;
  devices: (DiscoveredDevice & { firmwareOutdated: boolean })[];
  partial: boolean;
  useHttpsDefaults: boolean;
};
const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error("Discovery page is incomplete");
  return found as T;
};
const nonce = document.querySelector<HTMLMetaElement>(
  'meta[name="pixlite-nonce"]',
)!.content;
const interfaces = element<HTMLSelectElement>("interfaces");
const scan = element<HTMLButtonElement>("scan");
const httpsDefaults = element<HTMLInputElement>("https-defaults");
const status = element("status");
let selectionMessage = "";
let refreshing = false;
let defaultsLoaded = false;
let renderedDevices = "";

async function send(path: string, body: unknown): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PixLite-Nonce": nonce },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Request rejected");
}

function deviceRow(
  device: DiscoveryState["devices"][number],
  generation: string,
): HTMLTableRowElement {
  const row = document.createElement("tr");
  for (const [index, value] of [
    device.name + " / " + device.model,
    device.host,
    device.mac,
    device.firmware,
  ].entries()) {
    const cell = document.createElement("td");
    cell.dataset.label = ["Controller", "Address", "MAC", "Firmware"][index];
    cell.textContent = value;
    if (index === 3 && device.firmwareOutdated) {
      const warning = document.createElement("small");
      warning.className = "firmware-warning";
      warning.textContent = "Update required: v3.15.0 or later";
      cell.append(warning);
    }
    row.append(cell);
  }
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.disabled = device.recovery || !device.web || !generation;
  button.textContent =
    device.recovery || !device.web ? "Unavailable" : "Use controller";
  button.onclick = async () => {
    button.disabled = true;
    selectionMessage = "";
    try {
      await send("discovery/select", {
        generation,
        mac: device.mac,
        httpsDefaults: httpsDefaults.checked,
      });
      selectionMessage =
        "Controller selected. Return to Companion to check the connection.";
      status.textContent = selectionMessage;
    } catch {
      selectionMessage = "Selection failed. Rescan and try again.";
      status.textContent = selectionMessage;
      button.disabled = false;
    }
  };
  cell.append(button);
  row.append(cell);
  return row;
}

async function refresh(): Promise<void> {
  // Serialize polling so a slow Companion host cannot accumulate requests.
  if (refreshing) return;
  refreshing = true;
  try {
    const response = await fetch("discovery/state");
    if (!response.ok) throw new Error("State unavailable");
    const state = (await response.json()) as DiscoveryState;
    if (!defaultsLoaded) {
      httpsDefaults.checked = state.useHttpsDefaults;
      defaultsLoaded = true;
    }
    if (!interfaces.options.length) {
      for (const iface of state.interfaces) {
        const option = document.createElement("option");
        option.value = iface.address;
        option.textContent = `${iface.name} (${iface.address})`;
        interfaces.append(option);
      }
    }
    const scanning = state.state === "Scanning";
    const unavailable = state.state === "Discovery unavailable";
    scan.disabled = !interfaces.options.length || scanning;
    element("empty").hidden =
      !!state.devices.length ||
      scanning ||
      unavailable ||
      !state.interfaces.length;
    element("device-table").hidden = !state.devices.length;
    status.textContent =
      selectionMessage ||
      (!state.interfaces.length
        ? "No eligible IPv4 interface. Enter the device address manually in Companion."
        : scanning
          ? "Scanning…"
          : unavailable
            ? "Discovery unavailable on the selected interface."
            : state.partial
              ? "Partial scan. Some controllers may be missing."
              : "");
    const devicesKey = JSON.stringify([state.generation, state.devices]);
    // Keep focused controls intact between unchanged status polls.
    if (devicesKey !== renderedDevices) {
      element("devices").replaceChildren(
        ...state.devices.map((device) => deviceRow(device, state.generation)),
      );
      renderedDevices = devicesKey;
    }
  } catch {
    status.textContent =
      "Discovery page unavailable. Check the Companion connection.";
    element("devices").replaceChildren();
    renderedDevices = "";
    element("device-table").hidden = true;
    element("empty").hidden = true;
  } finally {
    refreshing = false;
  }
}

scan.onclick = async () => {
  scan.disabled = true;
  selectionMessage = "";
  try {
    await send("discovery/scan", { interface: interfaces.value });
    await refresh();
  } catch {
    selectionMessage = "Unable to start scan. Check the selected interface.";
    status.textContent = selectionMessage;
    scan.disabled = false;
  }
};
async function poll(): Promise<void> {
  await refresh();
  setTimeout(() => void poll(), 1000);
}
void poll();
