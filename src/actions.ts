import type {
  CompanionActionDefinitions,
  CompanionActionDefinition,
  CompanionOptionValues,
  SomeCompanionActionInputField,
} from "@companion-module/base";
import {
  array,
  at,
  availableIntensityOutputs,
  type Snapshot,
} from "./pixlite/model.js";
import { mediaName, type MediaButtonLabels } from "./companion/media-labels.js";
const fade = (): SomeCompanionActionInputField => ({
  id: "fade",
  type: "dropdown",
  label: "Transition fade (milliseconds)",
  default: 0,
  allowCustom: true,
  choices: [
    { id: 0, label: "Snap" },
    { id: 500, label: "0.5 seconds" },
    { id: 1000, label: "1 second" },
    { id: 2000, label: "2 seconds" },
  ],
});

const numberField = (
  id: string,
  label: string,
  defaultValue: number,
  max: number,
): SomeCompanionActionInputField => ({
  id,
  type: "number",
  label,
  default: defaultValue,
  min: 0,
  max,
});

export function mediaField(
  snapshot: Snapshot,
  extension: string,
): SomeCompanionActionInputField {
  return {
    id: "file",
    type: "dropdown",
    label: `${extension === ".pl" ? "Playlist" : "Scene"}: select, or type a filename and choose Use`,
    description: `For a manual entry, include ${extension} and select the Use option in the list to save it. Offline preparation is supported.`,
    default: "",
    allowCustom: true,
    minChoicesForSearch: 0,
    choices: [
      { id: "", label: "Enter a filename or select a file" },
      ...snapshot.files
        .filter((entry) => entry.attr !== "h" && entry.file.endsWith(extension))
        .map((entry) => ({ id: entry.file, label: mediaName(entry.file) })),
    ],
  };
}

export function actionDefinitions(
  snapshot: Snapshot,
  execute: (
    id: string,
    opts: CompanionOptionValues,
    controlId?: string,
  ) => Promise<void> | void,
  mediaButtons?: MediaButtonLabels,
): CompanionActionDefinitions {
  const output: SomeCompanionActionInputField = {
    id: "output",
    type: "dropdown",
    label: "Output group",
    default: "Pix",
    description:
      "Commands can be prepared offline. Aux targets must be configured as DMX outputs when executed.",
    choices: [
      { id: "Pix", label: "Pixel outputs" },
      ...Array.from({ length: 8 }, (_, index) => {
        const id = `Aux:${index + 1}`;
        const available = availableIntensityOutputs(snapshot).includes(id);
        return {
          id,
          label: `Auxiliary output ${index + 1}${available ? "" : snapshot.connected ? " (not configured for output)" : " (verify on connection)"}`,
        };
      }),
      { id: "All", label: "Pixels and configured auxiliary outputs" },
    ],
  };
  const priority: SomeCompanionActionInputField = {
    id: "priority",
    type: "dropdown",
    label: "Priority versus incoming live intensity",
    default: "retain",
    choices: [
      { id: "retain", label: "Retain priority" },
      { id: "override", label: "Override live intensity" },
      { id: "defer", label: "Defer to live intensity" },
    ],
  };
  const definitions: CompanionActionDefinitions = {};
  const add = (
    id: string,
    name: string,
    options: SomeCompanionActionInputField[] = [],
    description?: string,
  ): void => {
    const definition: CompanionActionDefinition = {
      name,
      options,
      description,
      callback: (event): Promise<void> | void =>
        execute(id, event.options, event.controlId),
    };
    definitions[id] =
      ["scene_play", "playlist_play", "scene_inspect"].includes(id) &&
      mediaButtons
        ? {
            ...definition,
            optionsToMonitorForSubscribe: ["file"],
            subscribe: (action) => mediaButtons.subscribe(action),
            unsubscribe: (action) => mediaButtons.unsubscribe(action),
          }
        : definition;
  };
  add("scene_play", "Scene: Play continuously", [
    mediaField(snapshot, ".scn"),
    fade(),
  ]);
  add("playlist_play", "Playlist: Play continuously", [
    mediaField(snapshot, ".pl"),
    fade(),
  ]);
  const transport: Record<string, string> = {
    playback_play: "Resume",
    playback_pause: "Pause",
    playback_pause_toggle: "Toggle pause",
    playback_restart_item: "Restart current item",
    playlist_previous_item: "Previous playlist item",
    playlist_next_item: "Next playlist item",
    playlist_previous_recorded: "Previous recorded playlist item",
    playlist_next_recorded: "Next recorded playlist item",
  };
  for (const [id, name] of Object.entries(transport))
    add(id, `Playback: ${name}`, [fade()]);
  add("mode_live", "Mode: Return to live data", [fade()]);
  add("output_blank", "Mode: Blank outputs", [fade()]);
  add("output_freeze", "Mode: Freeze output frame", [fade()]);
  const colours: SomeCompanionActionInputField[] = [
    {
      id: "colour",
      type: "colorpicker",
      label: "RGB colour",
      default: 0xffffff,
    },
    {
      id: "resolution",
      type: "dropdown",
      label: "Colour resolution",
      default: "8Bit",
      choices: [
        { id: "8Bit", label: "8 bit" },
        { id: "16Bit", label: "16 bit" },
      ],
    },
  ];
  const colourType = at(snapshot.config, "pix.colorType");
  // Companion omits hidden option values when executing saved keys. Keep W/X editable.
  colours.push(
    {
      ...numberField(
        "white",
        `White W channel (RGBW / RGBCCT)${snapshot.connected && colourType === "RGB" ? " (unavailable on this controller)" : ""}`,
        0,
        65535,
      ),
      isVisibleExpression: "true",
      description:
        "0..255 at 8 bit, 0..65535 at 16 bit. Prepare offline; follows the controller's configured channel mapping.",
    },
    {
      ...numberField(
        "extra",
        `White X channel (RGBCCT / RGBWX)${snapshot.connected && ["RGB", "RGBW"].includes(String(colourType)) ? " (unavailable on this controller)" : ""}`,
        0,
        65535,
      ),
      isVisibleExpression: "true",
      description:
        "0..255 at 8 bit, 0..65535 at 16 bit. Prepare offline for RGBWX. W/X do not assume a warm/cool order.",
    },
  );
  add(
    "output_static_colour",
    "Colour: Set static playback colour",
    [...colours, fade()],
    "Replaces the current operating mode with static colour playback. Does not recolour incoming live content.",
  );
  const palette = array(at(snapshot.config, "operIf.pal"));
  add("palette_recall", "Colour: Recall readable dashboard palette slot", [
    {
      id: "slot",
      type: "dropdown",
      label: "Palette slot",
      default: 0,
      description:
        "Slots can be prepared offline. Recall requires a readable slot on the connected controller.",
      choices: Array.from({ length: 12 }, (_, index) => ({
        id: index,
        label: `Colour ${index + 1}${Array.isArray(palette[index]) ? "" : " (verify on connection)"}`,
      })),
    },
    fade(),
  ]);
  add("intensity_set", "Intensity: Set level", [
    output,
    numberField("level", "Programmed intensity (%)", 100, 100),
    priority,
    fade(),
  ]);
  for (const direction of ["increase", "decrease"])
    add(`intensity_${direction}`, `Intensity: ${direction}`, [
      output,
      {
        id: "step",
        type: "dropdown",
        label: "Step (%)",
        default: 5,
        allowCustom: true,
        choices: [1, 5, 10].map((value) => ({ id: value, label: `${value}%` })),
      },
      priority,
      fade(),
    ]);
  add("intensity_override_live", "Intensity: Override live intensity", [
    output,
  ]);
  add("intensity_release_override", "Intensity: Release override", [output]);
  add("media_refresh", "Refresh: Scenes and playlists");
  add("status_refresh", "Refresh: Monitoring");
  add("scene_inspect", "Read: Scene metadata", [mediaField(snapshot, ".scn")]);
  add(
    "colour_mix_prepare",
    "Colour mix: Prepare colour",
    [
      {
        id: "colour",
        type: "colorpicker",
        label: "RGB colour",
        default: 0xffffff,
      },
      numberField("white", "White W (%)", 0, 100),
      numberField("extra", "White X (%)", 0, 100),
    ],
    "Prepares a colour locally and turns Live Mix off. Recall applies it; offline preparation is supported.",
  );
  add(
    "colour_mix_channel",
    "Colour mix: Adjust channel",
    [
      {
        id: "channel",
        type: "dropdown",
        label: "Channel",
        default: "red",
        choices: [
          { id: "red", label: "Red" },
          { id: "green", label: "Green" },
          { id: "blue", label: "Blue" },
          { id: "white", label: "White W (RGBW / RGBCCT)" },
          { id: "extra", label: "White X (RGBCCT)" },
        ],
      },
      {
        id: "operation",
        type: "dropdown",
        label: "Adjustment",
        default: "increase",
        disableAutoExpression: true,
        choices: [
          { id: "increase", label: "Increase" },
          { id: "decrease", label: "Decrease" },
          { id: "set", label: "Set" },
        ],
      },
      {
        id: "step",
        type: "dropdown",
        label: "Step (%)",
        default: 1,
        allowCustom: true,
        choices: [1, 5, 10].map((id) => ({ id, label: `${id}%` })),
        isVisibleExpression: '$(options:operation) != "set"',
      },
      {
        ...numberField("level", "Channel level (%)", 100, 100),
        isVisibleExpression: '$(options:operation) == "set"',
      },
    ],
    "Adjusts the prepared mix. With Live Mix enabled, applies changes only while the device remains in Static Colour mode.",
  );
  add("colour_mix_recall", "Colour mix: Recall prepared colour", [fade()]);
  add(
    "colour_mix_load",
    "Colour mix: Load current output",
    [],
    "Copies reported Static Colour into the prepared mix and turns Live Mix off.",
  );
  add(
    "colour_mix_live",
    "Colour mix: Live Mix",
    [
      {
        id: "mode",
        type: "dropdown",
        label: "Live Mix",
        default: "toggle",
        choices: [
          { id: "toggle", label: "Toggle" },
          { id: "on", label: "On" },
          { id: "off", label: "Off" },
        ],
      },
    ],
    "Enabling loads the current Static Colour without changing output. Disconnects and operating-mode changes turn Live Mix off.",
  );
  return definitions;
}
