import dgram from "node:dgram";
import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import { normaliseMac, object, SUPPORTED_MODELS } from "../pixlite/model.js";

import type { DiscoveredDevice } from "./types.js";
export type { DiscoveredDevice } from "./types.js";
export function discoveryRequest(excluded: string[] = []): Buffer {
  if (
    excluded.length > 50 ||
    excluded.some((mac) => !/^[\dA-F]{12}$/.test(normaliseMac(mac)))
  )
    throw new Error("Invalid discovery exclusions");
  const packet = Buffer.alloc(34 + excluded.length * 6);
  packet.write("DiscProt", 0, "ascii");
  packet.writeUInt16BE(0x1201, 8);
  packet.writeUInt16BE(0x0101, 10);
  packet.writeUInt32BE(0x50697833, 12);
  packet.writeUInt32BE(0, 16);
  packet.fill(0xff, 26, 32);
  packet.writeUInt16BE(excluded.length, 32);
  excluded.forEach((mac, index) =>
    Buffer.from(normaliseMac(mac), "hex").copy(packet, 34 + index * 6),
  );
  return packet;
}
export function parseDiscovery(packet: Buffer): DiscoveredDevice | undefined {
  if (
    packet.length <= 12 ||
    packet.length > 8192 ||
    packet.subarray(0, 8).toString("ascii") !== "DiscProt" ||
    packet.readUInt16BE(8) !== 0x2102 ||
    packet.readUInt16BE(10) !== 0x0101
  )
    return undefined;
  try {
    const value = object(JSON.parse(packet.subarray(12).toString("utf8")));
    const mac = normaliseMac(value.macAddr);
    if (
      value.prodFamily !== 0x50697833 ||
      value.oem !== 0 ||
      !SUPPORTED_MODELS.has(String(value.prodName)) ||
      !/^[\dA-F]{12}$/.test(mac) ||
      isIP(String(value.ipAddr)) !== 4 ||
      typeof value.inEmergRecovery !== "boolean" ||
      typeof value.hasWebIf !== "boolean"
    )
      return undefined;
    return {
      mac,
      host: String(value.ipAddr),
      model: String(value.prodName),
      name:
        typeof value.nickname === "string" ? value.nickname.slice(0, 63) : "",
      firmware: typeof value.fwVer === "string" ? value.fwVer.slice(0, 63) : "",
      recovery: value.inEmergRecovery === true,
      web: value.hasWebIf === true,
    };
  } catch {
    return undefined;
  }
}

/** Each instance owns its sockets and results. Scans require an explicit request. */
export class AdarDiscovery {
  state = "Idle";
  generation = "";
  devices: DiscoveredDevice[] = [];
  partial = false;
  private stop?: () => void;
  constructor(
    private readonly transport: {
      address?: string;
      port?: number;
      windowMs?: number;
    } = {},
  ) {}
  async scan(interfaceAddress: string): Promise<void> {
    this.cancel();
    if (isIP(interfaceAddress) !== 4)
      throw new Error("Choose a valid IPv4 interface");
    const id = randomUUID();
    this.generation = id;
    this.devices = [];
    this.partial = false;
    this.state = "Scanning";
    const socket = dgram.createSocket("udp4");
    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined,
        finished = false,
        rounds = 0,
        lastCount = -1,
        broadcast = false;
      const finish = (error?: Error): void => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try {
          socket.close();
        } catch {
          /* Closing an unbound socket is harmless. */
        }
        if (this.generation === id) {
          this.state = error ? "Discovery unavailable" : "Complete";
          this.stop = undefined;
        }
        if (error)
          reject(new Error("Discovery unavailable on the selected interface"));
        else resolve();
      };
      this.stop = () => finish();
      socket.on("error", () => finish(new Error("Socket error")));
      socket.on("message", (packet) => {
        if (this.generation !== id) return;
        const device = parseDiscovery(packet);
        if (!device) return;
        const index = this.devices.findIndex(
          (entry) => entry.mac === device.mac,
        );
        if (index >= 0) this.devices[index] = device;
        else if (this.devices.length < 50) this.devices.push(device);
        else this.partial = true;
      });
      const cycle = (): void => {
        if (this.generation !== id) return finish();
        if (++rounds > 6) {
          this.partial = true;
          return finish();
        }
        if (this.devices.length === lastCount && broadcast) return finish();
        if (this.devices.length === lastCount) broadcast = true;
        lastCount = this.devices.length;
        const address =
          this.transport.address ??
          (broadcast ? "255.255.255.255" : "239.255.251.1");
        socket.send(
          discoveryRequest(this.devices.map((device) => device.mac)),
          this.transport.port ?? 49151,
          address,
          (error) => {
            if (error) finish(error);
          },
        );
        timer = setTimeout(cycle, this.transport.windowMs ?? 500);
      };
      socket.bind(0, "0.0.0.0", () => {
        try {
          socket.setBroadcast(true);
          if (!this.transport.address) {
            socket.addMembership("239.255.251.2", interfaceAddress);
            socket.setMulticastInterface(interfaceAddress);
            socket.setMulticastTTL(255);
          }
          cycle();
        } catch {
          finish(new Error("Interface unavailable"));
        }
      });
    });
  }
  cancel(): void {
    this.stop?.();
    this.stop = undefined;
    this.generation = "";
    this.state = "Idle";
  }
}
