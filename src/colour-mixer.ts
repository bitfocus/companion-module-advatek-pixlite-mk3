import type { PixLiteClient } from "./pixlite/client.js";
import {
  array,
  at,
  isFresh,
  numberInput,
  type ObjectValue,
  type Snapshot,
} from "./pixlite/model.js";

export const MIX_CHANNELS = ["red", "green", "blue", "white", "extra"] as const;
export type MixChannel = (typeof MIX_CHANNELS)[number];
type Mix = Record<MixChannel, number>;
const initialMix = (): Mix => ({
  red: 100,
  green: 100,
  blue: 100,
  white: 0,
  extra: 0,
});
const percent = (value: number): number => Math.round(value * 100) / 100;

export function mixChannelAvailable(
  snapshot: Snapshot,
  channel: string,
): boolean {
  if (!MIX_CHANNELS.includes(channel as MixChannel)) return false;
  const type = at(snapshot.config, "pix.colorType");
  return (
    !snapshot.connected ||
    !["RGB", "RGBW", "RGBWX"].includes(String(type)) ||
    (channel !== "white" && channel !== "extra") ||
    (channel === "white" && type !== "RGB") ||
    (channel === "extra" && type === "RGBWX")
  );
}

/** Local preparation belongs to one connection; only explicit recall or live edits send commands. */
export class ColourMixer {
  private mix = initialMix();
  private live = false;
  private epoch = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private queued = false;
  private busy = false;
  private pending = 0;
  private error = "";
  private controlId = "";
  constructor(
    private readonly client: () => PixLiteClient | undefined,
    private readonly changed: () => void,
  ) {}

  stop(): void {
    this.epoch++;
    this.live = false;
    this.queued = false;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  reset(): void {
    this.stop();
    this.mix = initialMix();
    this.error = "";
  }

  observe(snapshot: Snapshot): void {
    if (this.live && !this.staticReady(snapshot)) {
      if (!snapshot.connected || !isFresh(snapshot.statusAt))
        this.error =
          snapshot.error ||
          "Live Mix stopped: controller status is unavailable";
      this.stop();
    }
  }

  private staticReady(snapshot: Snapshot): boolean {
    return (
      snapshot.connected &&
      isFresh(snapshot.statusAt) &&
      snapshot.status.mode === "playback" &&
      at(snapshot.status, "params.op") === "Color"
    );
  }

  private load(): void {
    const snapshot = this.client()?.snapshot;
    if (!snapshot || !this.staticReady(snapshot))
      throw new Error(
        "Select Static Colour on the controller before loading or enabling Live Mix",
      );
    const type = at(snapshot.config, "pix.colorType");
    const count =
      type === "RGB" ? 3 : type === "RGBW" ? 4 : type === "RGBWX" ? 5 : 0;
    const resolution = at(snapshot.status, "params.colorRes");
    if (!count || !["8Bit", "16Bit"].includes(String(resolution)))
      throw new Error("Controller colour channels are unavailable");
    const values = array(at(snapshot.status, "params.color"));
    const max = resolution === "16Bit" ? 65535 : 255;
    const next = initialMix();
    MIX_CHANNELS.forEach((channel, index) => {
      next[channel] =
        index < count
          ? percent((numberInput(values[index], NaN, 0, max) * 100) / max)
          : 0;
    });
    this.mix = next;
  }

  private options(fade = 0): ObjectValue {
    const factor = (channel: MixChannel): number =>
      Math.round((this.mix[channel] * 255) / 100);
    return {
      colour: (factor("red") << 16) | (factor("green") << 8) | factor("blue"),
      white: factor("white"),
      extra: factor("extra"),
      resolution: "8Bit",
      fade,
    };
  }

  values(snapshot: Snapshot): Record<string, string | number | boolean> {
    const opts = this.options();
    const channels = array(at(snapshot.status, "params.color"));
    const type = at(snapshot.config, "pix.colorType");
    const count =
      type === "RGB" ? 3 : type === "RGBW" ? 4 : type === "RGBWX" ? 5 : 0;
    const scale = at(snapshot.status, "params.colorRes") === "16Bit" ? 257 : 1;
    const expected = [
      Number(opts.colour) >> 16,
      (Number(opts.colour) >> 8) & 255,
      Number(opts.colour) & 255,
      Number(opts.white),
      Number(opts.extra),
    ];
    const unsupportedWhiteOnly =
      Number(opts.colour) === 0 &&
      ((type === "RGB" && Number(opts.white) > 0) ||
        (type !== "RGBWX" && Number(opts.extra) > 0));
    const matches =
      !unsupportedWhiteOnly &&
      !!count &&
      this.staticReady(snapshot) &&
      expected
        .slice(0, count)
        .every(
          (value, index) =>
            typeof channels[index] === "number" &&
            Math.abs(Number(channels[index]) / scale - value) <= 1,
        );
    return {
      mix_live_enabled: this.live,
      mix_mode: this.live ? "Live Mix" : "Prepare",
      mix_pending: this.pending > 0 || this.queued,
      mix_error: this.error,
      mix_matches_output: matches,
      mix_hex: `#${Number(opts.colour).toString(16).padStart(6, "0").toUpperCase()}`,
      ...Object.fromEntries(
        MIX_CHANNELS.flatMap((channel) => [
          [`mix_${channel}_percent`, this.mix[channel]],
          [`mix_${channel}_display`, `${this.mix[channel]}%`],
        ]),
      ),
    };
  }

  async execute(
    action: string,
    options: ObjectValue,
    controlId = "",
  ): Promise<void> {
    let errorEpoch = this.epoch;
    try {
      this.error = "";
      if (action === "colour_mix_prepare") {
        const rgb = Math.round(
          numberInput(options.colour, 0xffffff, 0, 0xffffff),
        );
        const next = {
          red: percent(((rgb >> 16) * 100) / 255),
          green: percent((((rgb >> 8) & 255) * 100) / 255),
          blue: percent(((rgb & 255) * 100) / 255),
          white: percent(numberInput(options.white, 0, 0, 100)),
          extra: percent(numberInput(options.extra, 0, 0, 100)),
        };
        this.stop();
        this.mix = next;
      } else if (action === "colour_mix_channel") {
        const channel = options.channel as MixChannel;
        if (!MIX_CHANNELS.includes(channel))
          throw new Error("Choose a colour-mix channel");
        const snapshot = this.client()?.snapshot;
        if (snapshot && !mixChannelAvailable(snapshot, channel))
          throw new Error(
            "Selected white channel is unavailable for the configured pixel type",
          );
        const operation = options.operation ?? "increase";
        if (
          typeof operation !== "string" ||
          !["set", "increase", "decrease"].includes(operation)
        )
          throw new Error("Choose a channel adjustment");
        const step = numberInput(options.step, 1, 0, 100);
        const next = percent(
          operation === "set"
            ? numberInput(options.level, 100, 0, 100)
            : Math.max(
                0,
                Math.min(
                  100,
                  this.mix[channel] + (operation === "increase" ? step : -step),
                ),
              ),
        );
        const modified = this.mix[channel] !== next;
        this.mix[channel] = next;
        if (this.live && modified) {
          this.queued = true;
          this.controlId = controlId;
          this.schedule();
        }
      } else if (action === "colour_mix_load") {
        this.load();
        this.stop();
      } else if (action === "colour_mix_live") {
        const mode = options.mode ?? "toggle";
        if (typeof mode !== "string" || !["on", "off", "toggle"].includes(mode))
          throw new Error("Choose a Live Mix mode");
        if (mode === "off" || (mode === "toggle" && this.live)) this.stop();
        else if (!this.live) {
          if (this.pending)
            throw new Error("Wait for the colour command to complete");
          this.load();
          this.live = true;
        }
      } else if (action === "colour_mix_recall") {
        const fade = Math.round(numberInput(options.fade, 0));
        this.stop();
        const client = this.client();
        if (!client) throw new Error("Select a controller first");
        const epoch = this.epoch;
        errorEpoch = epoch;
        this.pending++;
        this.changed();
        try {
          await client.execute(
            "output_static_colour",
            this.options(fade),
            controlId,
            () => {
              if (epoch !== this.epoch || client !== this.client())
                throw new Error("Colour recall cancelled");
            },
          );
        } finally {
          this.pending--;
        }
      } else throw new Error("Unknown colour-mix action");
    } catch (error) {
      if (errorEpoch === this.epoch)
        this.error =
          error instanceof Error ? error.message : "Colour mix failed";
      throw error;
    } finally {
      this.changed();
    }
  }

  private schedule(): void {
    if (!this.live || this.busy || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, 75);
  }

  private async flush(): Promise<void> {
    if (!this.live || !this.queued) return;
    const client = this.client();
    if (!client) {
      this.stop();
      this.changed();
      return;
    }
    this.queued = false;
    this.busy = true;
    this.pending++;
    const epoch = this.epoch;
    try {
      // Keep at most one request in flight and one latest local mix, never a dial-event backlog.
      await client.execute(
        "output_static_colour",
        this.options(),
        this.controlId,
        () => {
          if (
            epoch !== this.epoch ||
            !this.live ||
            client !== this.client() ||
            !this.staticReady(client.snapshot)
          )
            throw new Error("Live Mix stopped before the colour was sent");
        },
      );
    } catch (error) {
      if (epoch === this.epoch) {
        this.stop();
        this.error = error instanceof Error ? error.message : "Live Mix failed";
      }
    } finally {
      this.pending--;
      this.busy = false;
      this.changed();
      if (this.queued) this.schedule();
    }
  }
}
