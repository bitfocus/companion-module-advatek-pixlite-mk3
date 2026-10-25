import type {
  CompanionOptionValues,
  CompanionPresetDefinitions,
  CompanionPresetSection,
} from "@companion-module/base";
import { at, type Snapshot } from "./pixlite/model.js";
import type { ModuleSchema } from "./types.js";
import { artwork, type ArtworkId } from "./companion/artwork.generated.js";
import { labelledArtwork } from "./companion/labelled-artwork.generated.js";
import { mediaLabel, mediaName } from "./companion/media-labels.js";
import { MIX_CHANNELS, mixChannelAvailable } from "./colour-mixer.js";
export function presetDefinitions(snapshot: Snapshot): {
  sections: CompanionPresetSection<ModuleSchema>[];
  presets: CompanionPresetDefinitions<ModuleSchema>;
} {
  const controlsArtwork: Record<string, [ArtworkId, string]> = {
    live: ["live", "Live\ndata"],
    blank: ["blank", "Blank\noutputs"],
    freeze: ["freeze", "Freeze\nframe"],
    pause: ["pause", "Pause"],
    resume: ["resume", "Resume"],
    playlist_previous_item: ["previous", "Prev\nitem"],
    playlist_next_item: ["next", "Next\nitem"],
    playback_restart_item: ["restart", "Restart\nitem"],
    playlist_previous_recorded: ["previous_recorded", "Prev\nscene"],
    playlist_next_recorded: ["next_recorded", "Next\nscene"],
    release: ["release", "Release\nintensity"],
  };
  const presets: CompanionPresetDefinitions<ModuleSchema> = {};
  const add = (
    id: string,
    text: string,
    actionId: string,
    options: CompanionOptionValues,
    feedbackId?: string,
    value?: string,
    appearance?: [ArtworkId, string],
  ): void => {
    const [icon, label] = appearance ?? controlsArtwork[id] ?? ["scene", text];
    const images = labelledArtwork[id] ?? artwork[icon];
    presets[id] = {
      type: "simple",
      name: text,
      style: {
        text: labelledArtwork[id] ? "" : label,
        size: id.startsWith("media_") ? "7" : "14",
        color: 0xffffff,
        bgcolor: 0x353436,
        alignment: "center:bottom",
        pngalignment: "center:center",
        png64: images.dark.idle,
        show_topbar: false,
      },
      steps: [{ down: [{ actionId, options }], up: [] }],
      feedbacks: [
        ...(feedbackId
          ? [
              {
                feedbackId,
                options:
                  feedbackId === "intensity_priority_is"
                    ? { output: "pix", value: value ?? "Lo" }
                    : value
                      ? { value }
                      : {},
                style: { png64: images.dark.active },
              },
            ]
          : []),
        {
          feedbackId: "button_action_failed",
          options: {},
          style: { png64: images.dark.fault },
        },
        {
          feedbackId: "mode_error",
          options: {},
          style: { png64: images.dark.fault },
        },
        {
          feedbackId: "state_stale",
          options: {},
          style: { png64: images.dark.stale, color: 0xb8b7b9 },
        },
      ],
    };
  };
  add("live", "Live data", "mode_live", { fade: 0 }, "mode_is", "live");
  add(
    "blank",
    "Blank",
    "output_blank",
    { fade: 0 },
    "playback_operation_is",
    "Blank",
  );
  add(
    "freeze",
    "Freeze",
    "output_freeze",
    { fade: 0 },
    "playback_operation_is",
    "Freeze",
  );
  add("pause", "Pause", "playback_pause", { fade: 0 }, "playback_paused");
  add("resume", "Resume", "playback_play", { fade: 0 }, "playback_running");
  for (const [id, label] of [
    ["playlist_previous_item", "Previous playlist item"],
    ["playlist_next_item", "Next playlist item"],
    ["playback_restart_item", "Restart current item"],
    ["playlist_previous_recorded", "Previous recorded playlist item"],
    ["playlist_next_recorded", "Next recorded playlist item"],
  ] as const)
    add(id, label, id, { fade: 0 });
  for (const step of [1, 5])
    for (const direction of ["increase", "decrease"] as const) {
      const up = direction === "increase";
      add(
        `intensity_${direction}_${step}`,
        `Pixel intensity ${up ? "+" : "-"}${step}% (override live intensity)`,
        `intensity_${direction}`,
        { output: "Pix", priority: "override", step, fade: 0 },
        undefined,
        undefined,
        [
          up ? "intensity_up" : "intensity_down",
          `${up ? "+" : "-"}${step}%\nIntensity`,
        ],
      );
    }
  for (const level of [0, 25, 50, 75, 100]) {
    add(
      `level_${level}`,
      `Intensity ${level}%`,
      "intensity_set",
      { output: "Pix", priority: "override", level, fade: 0 },
      undefined,
      undefined,
      ["level", `${level}%\nIntensity`],
    );
    const preset = presets[`level_${level}`];
    if (preset?.type === "simple")
      preset.feedbacks.unshift({
        feedbackId: "programmed_intensity_compare",
        options: {
          metric: "pix_programmed_factor",
          comparison: "eq",
          threshold: Math.round((level * 255) / 100),
          tolerance: 0.001,
        },
        style: { png64: labelledArtwork[`level_${level}`]?.dark.active },
      });
  }
  add(
    "release",
    "Release intensity override",
    "intensity_release_override",
    { output: "Pix" },
    "intensity_priority_is",
    "Lo",
  );
  for (const [name, colour] of [
    ["Red", 0xff0000],
    ["Green", 0x00ff00],
    ["Blue", 0x0000ff],
    ["White RGB", 0xffffff],
  ] as const) {
    add(
      `colour_${name}`,
      name,
      "output_static_colour",
      {
        colour,
        resolution: "8Bit",
        fade: 0,
        white: 0,
        extra: 0,
      },
      undefined,
      undefined,
      ["colour", name],
    );
    const preset = presets[`colour_${name}`];
    if (preset?.type === "simple")
      preset.feedbacks.unshift({
        feedbackId: "static_colour_matches",
        options: { colour, white: 0, extra: 0 },
        style: { png64: labelledArtwork[`colour_${name}`]?.dark.active },
      });
  }
  const controls = Object.keys(presets);
  const rgbColours = controls.filter((id) => id.startsWith("colour_"));
  const colourType = snapshot.connected
    ? at(snapshot.config, "pix.colorType")
    : undefined;
  const knownColourType = ["RGB", "RGBW", "RGBWX"].includes(String(colourType));
  const whiteChannels = !knownColourType
    ? ["white_W", "white_X"]
    : colourType === "RGBWX"
      ? ["white_W", "white_X"]
      : colourType === "RGBW"
        ? ["white_W"]
        : [];
  const colourGroupName = !knownColourType
    ? "RGB and white channels (offline setup)"
    : colourType === "RGBWX"
      ? "RGBCCT (RGBWX): W and X white channels"
      : colourType === "RGBW"
        ? "RGBW: dedicated W white channel"
        : "RGB colours";
  const otherWhiteChannels = ["white_W", "white_X"].filter(
    (id) => !whiteChannels.includes(id),
  );
  add(
    "pause_toggle",
    "Toggle pause / resume",
    "playback_pause_toggle",
    { fade: 0 },
    "playback_paused",
  );
  const toggle = presets.pause_toggle;
  if (toggle?.type === "simple") {
    toggle.feedbacks = [
      {
        feedbackId: "playback_running",
        options: {},
        style: { png64: labelledArtwork.pause!.dark.idle },
      },
      {
        feedbackId: "playback_paused",
        options: {},
        style: { png64: labelledArtwork.resume!.dark.active },
      },
      {
        feedbackId: "pause_state_unavailable",
        options: {},
        style: { png64: labelledArtwork.pause_toggle!.dark.stale },
      },
      ...toggle.feedbacks.filter((feedback) =>
        ["button_action_failed", "mode_error", "state_stale"].includes(
          feedback.feedbackId,
        ),
      ),
    ];
  }
  add(
    "override",
    "Override pixel live intensity",
    "intensity_override_live",
    { output: "Pix" },
    "intensity_priority_is",
    "Hi",
    ["override", "Override\nintensity"],
  );
  controls.push("pause_toggle", "override");
  const outputs: string[] = [];
  for (const [prefix, output, caption] of [
    ["aux1", "Aux:1", "Aux 1"],
    ["all", "All", "All outputs"],
  ] as const) {
    for (const direction of ["increase", "decrease"] as const) {
      const id = `${prefix}_${direction}_5`;
      add(
        id,
        `${caption}: ${direction === "increase" ? "+" : "-"}5% intensity (override)`,
        `intensity_${direction}`,
        { output, priority: "override", step: 5, fade: 0 },
      );
      outputs.push(id);
    }
    for (const level of [0, 50, 100]) {
      const id = `${prefix}_level_${level}`;
      add(id, `${caption}: intensity ${level}% (override)`, "intensity_set", {
        output,
        priority: "override",
        level,
        fade: 0,
      });
      const preset = presets[id];
      // All outputs must match, not just one group.
      if (prefix === "aux1" && preset?.type === "simple")
        preset.feedbacks.unshift({
          feedbackId: "programmed_intensity_compare",
          options: {
            metric: "aux_1_programmed_factor",
            comparison: "eq",
            threshold: Math.round((level * 255) / 100),
            tolerance: 0.001,
          },
          style: { png64: labelledArtwork[id]?.dark.active },
        });
      outputs.push(id);
    }
    for (const [suffix, actionId, value] of [
      ["release", "intensity_release_override", "Lo"],
      ["override", "intensity_override_live", "Hi"],
    ] as const) {
      const id = `${prefix}_${suffix}`;
      add(
        id,
        `${caption}: ${suffix === "release" ? "release programmed intensity priority" : "override live intensity"}`,
        actionId,
        {
          output,
        },
      );
      const preset = presets[id];
      if (prefix === "aux1" && preset?.type === "simple")
        preset.feedbacks.unshift({
          feedbackId: "intensity_priority_is",
          options: { output: "aux_1", value },
          style: { png64: labelledArtwork[id]?.dark.active },
        });
      outputs.push(id);
    }
  }
  const colours: string[] = [];
  for (const channel of ["W", "X"] as const) {
    const id = `white_${channel}`;
    const white = channel === "W" ? 255 : 0,
      extra = channel === "X" ? 255 : 0;
    add(
      id,
      `White ${channel} only, 100% (${channel === "W" ? "RGBW or RGBCCT" : "RGBCCT / RGBWX"})`,
      "output_static_colour",
      { colour: 0, resolution: "8Bit", white, extra, fade: 0 },
    );
    const preset = presets[id];
    if (preset?.type === "simple") {
      preset.feedbacks.unshift({
        feedbackId: "static_colour_matches",
        options: { colour: 0, white, extra },
        style: { png64: labelledArtwork[id]?.dark.active },
      });
      preset.feedbacks.splice(1, 0, {
        feedbackId: "capability_unavailable",
        options: { value: `white_${channel.toLowerCase()}_available` },
        style: { png64: labelledArtwork[id]?.dark.stale },
      });
    }
  }
  controls.push(...whiteChannels);
  for (let slot = 0; slot < 12; slot++) {
    const id = `palette_${slot + 1}`;
    add(
      id,
      `Recall dashboard palette ${slot + 1} (verify on connection)`,
      "palette_recall",
      { slot, fade: 0 },
    );
    colours.push(id);
  }
  const utilities: string[] = [];
  for (const id of ["media_refresh", "status_refresh"] as const) {
    add(
      id,
      id === "media_refresh"
        ? "Refresh scenes and playlists"
        : "Refresh monitoring",
      id,
      {},
    );
    utilities.push(id);
  }
  for (const [id, actionId] of [
    ["scene_template", "scene_play"],
    ["playlist_template", "playlist_play"],
    ["scene_inspect", "scene_inspect"],
  ] as const) {
    // Require an explicit filename before an editable template can run.
    add(
      id,
      `${id === "scene_inspect" ? "Scene info" : id === "scene_template" ? "Play scene" : "Play playlist"}: editable template, set filename before use`,
      actionId,
      actionId === "scene_inspect" ? { file: "" } : { file: "", fade: 0 },
    );
    utilities.push(id);
  }
  const scenes: string[] = [],
    playlists: string[] = [];
  for (const entry of snapshot.files
    .filter((file) => file.attr !== "h")
    .slice(0, 200)) {
    const playlist = entry.file.endsWith(".pl"),
      id = `media_${Buffer.from(entry.file).toString("base64url")}`;
    add(
      id,
      mediaName(entry.file),
      playlist ? "playlist_play" : "scene_play",
      { file: entry.file, fade: 0 },
      playlist ? "playlist_selected" : "scene_selected",
      entry.file,
      [
        playlist ? "playlist" : "scene",
        (entry.file.length > 30 ? `${entry.file.slice(0, 27)}...` : entry.file)
          .match(/.{1,15}/gu)
          ?.join("\n") ?? entry.file,
      ],
    );
    (playlist ? playlists : scenes).push(id);
  }
  // Placed keys follow their action filename; unplaced previews use a fixed caption.
  for (const preset of Object.values(presets)) {
    if (preset?.type !== "simple") continue;
    const action = preset.steps[0]?.down[0];
    if (
      !action ||
      !["scene_play", "playlist_play", "scene_inspect"].includes(
        action.actionId,
      )
    )
      continue;
    const icon =
      action.actionId === "playlist_play"
        ? "playlist"
        : action.actionId === "scene_inspect"
          ? "inspect"
          : "scene";
    const images = artwork[icon];
    const options = action.options as CompanionOptionValues;
    const file = typeof options.file === "string" ? options.file : "";
    const label = file
      ? mediaLabel(file)
      : action.actionId === "playlist_play"
        ? "Select\nplaylist"
        : "Select\nscene";
    preset.style = {
      ...preset.style,
      text: "$(local:media_name)",
      textExpression: false,
      size: 12,
      png64: images.dark.idle,
    };
    preset.previewStyle = { text: label, size: 12 };
    preset.localVariables = [
      {
        variableType: "feedback",
        variableName: "media_name",
        feedbackId: "button_media_name",
        options: {},
      },
    ];
    preset.feedbacks = [
      ...(action.actionId !== "scene_inspect"
        ? [
            {
              feedbackId: "button_media_selected",
              options: {},
              style: { png64: images.dark.active },
            },
          ]
        : []),
      {
        feedbackId: "button_action_failed",
        options: {},
        style: { png64: images.dark.fault },
      },
      {
        feedbackId: "mode_error",
        options: {},
        style: { png64: images.dark.fault },
      },
      {
        feedbackId: "state_stale",
        options: {},
        style: { png64: images.dark.stale, color: 0xb8b7b9 },
      },
    ];
  }
  const mixerControls = ["mix_recall", "mix_live", "mix_load", "mix_prepare"];
  const otherMixerControls: string[] = [];
  add(
    "mix_recall",
    "Recall prepared mix",
    "colour_mix_recall",
    { fade: 0 },
    "colour_mix_matches",
  );
  add(
    "mix_live",
    "Toggle Live Mix",
    "colour_mix_live",
    { mode: "toggle" },
    "colour_mix_live",
  );
  add("mix_load", "Load reported Static Colour", "colour_mix_load", {});
  add("mix_prepare", "Prepare custom colour (editable)", "colour_mix_prepare", {
    colour: 0xffffff,
    white: 0,
    extra: 0,
  });
  for (const channel of MIX_CHANNELS) {
    const ids: string[] = [];
    const caption =
      channel === "white"
        ? "White W"
        : channel === "extra"
          ? "White X"
          : channel[0]!.toUpperCase() + channel.slice(1);
    for (const [suffix, operation] of [
      ["down", "decrease"],
      ["up", "increase"],
    ] as const) {
      const id = `mix_${channel}_${suffix}`;
      add(
        id,
        `${caption} mix ${suffix === "up" ? "+" : "-"}1%`,
        "colour_mix_channel",
        { channel, operation, step: 1, level: 100 },
      );
      ids.push(id);
    }
    const id = `mix_${channel}`;
    add(id, `${caption} mix dial (turn 1%, press 0%)`, "colour_mix_channel", {
      channel,
      operation: "set",
      level: 0,
      step: 1,
    });
    const dial = presets[id];
    if (dial?.type === "simple") {
      // Companion 5.1.1 reads rotaryActions; SDK 2.1.3 omits it from simple preset options.
      const rotaryOptions = { stepAutoProgress: false, rotaryActions: true };
      dial.options = rotaryOptions;
      dial.steps[0]!.rotate_left = [
        {
          actionId: "colour_mix_channel",
          options: { channel, operation: "decrease", step: 1, level: 100 },
        },
      ];
      dial.steps[0]!.rotate_right = [
        {
          actionId: "colour_mix_channel",
          options: { channel, operation: "increase", step: 1, level: 100 },
        },
      ];
      dial.localVariables = [
        {
          variableType: "feedback",
          variableName: "mix_level",
          feedbackId: "colour_mix_channel_value",
          options: { channel },
        },
      ];
      dial.style = {
        ...dial.style,
        text: "$(local:mix_level)",
        textExpression: false,
        alignment: "center:center",
        size: 14,
      };
      dial.previewStyle = { text: "100%" };
    }
    ids.push(id);
    (mixChannelAvailable(snapshot, channel)
      ? mixerControls
      : otherMixerControls
    ).push(...ids);
    for (const key of ids) {
      const preset = presets[key];
      if (preset?.type === "simple")
        preset.feedbacks.unshift({
          feedbackId: "colour_mix_channel_unavailable",
          options: { channel },
          style: { png64: labelledArtwork[key]!.dark.stale },
        });
    }
  }
  for (const id of [...mixerControls, ...otherMixerControls]) {
    const preset = presets[id];
    if (preset?.type !== "simple") continue;
    preset.feedbacks = preset.feedbacks.filter(
      (feedback) =>
        !["mode_error", "state_stale", "button_action_failed"].includes(
          feedback.feedbackId,
        ),
    );
    preset.feedbacks.push({
      feedbackId: "colour_mix_error",
      options: {},
      style: { png64: labelledArtwork[id]!.dark.fault },
    });
  }
  // Preserve dark IDs and bindings; light variants change presentation only.
  const lightImages = new Map<string, string>();
  for (const images of [
    ...Object.values(artwork),
    ...Object.values(labelledArtwork),
  ])
    for (const state of ["idle", "active", "stale", "fault"] as const)
      lightImages.set(images.dark[state], images.light[state]);
  for (const [id, preset] of Object.entries(presets)) {
    if (preset?.type !== "simple") continue;
    presets[`light_${id}`] = {
      ...preset,
      style: {
        ...preset.style,
        bgcolor: 0xffffff,
        color: 0x353436,
        png64: lightImages.get(preset.style.png64 ?? ""),
      },
      feedbacks: preset.feedbacks.map((feedback) => ({
        ...feedback,
        style: {
          ...feedback.style,
          ...(feedback.style?.png64
            ? { png64: lightImages.get(feedback.style.png64) }
            : {}),
          ...(feedback.style?.color === 0xb8b7b9 ? { color: 0x78787a } : {}),
        },
      })),
    };
  }
  return {
    presets,
    sections: [
      {
        id: "operator",
        name: "SHOWTime operator (dark keys)",
        definitions: [
          {
            id: "controls",
            type: "simple",
            name: "Controls",
            presets: controls,
          },
          {
            id: "colour_controls",
            type: "simple",
            name: colourGroupName,
            presets: [...rgbColours, ...whiteChannels],
          },
          {
            id: "white_templates",
            type: "simple",
            name: "Other white channels (offline preparation)",
            presets: otherWhiteChannels,
          },
          {
            id: "outputs",
            type: "simple",
            name: "Aux 1 and all outputs",
            presets: outputs,
          },
          {
            id: "colours",
            type: "simple",
            name: "Dashboard palette",
            presets: colours,
          },
          {
            id: "utilities",
            type: "simple",
            name: "Refresh and editable media templates",
            presets: utilities,
          },
          { id: "scenes", type: "simple", name: "Scenes", presets: scenes },
          {
            id: "mixer",
            type: "simple",
            name: "Colour mixer (prepare / live)",
            presets: mixerControls,
          },
          {
            id: "other_mixer",
            type: "simple",
            name: "Other mix channels (offline preparation)",
            presets: otherMixerControls,
          },
          {
            id: "playlists",
            type: "simple",
            name: "Playlists",
            presets: playlists,
          },
        ],
      },
      {
        id: "light_operator",
        name: "SHOWTime operator (light keys)",
        definitions: [
          {
            id: "light_controls",
            type: "simple",
            name: "Controls",
            presets: controls.map((id) => `light_${id}`),
          },
          {
            id: "light_colour_controls",
            type: "simple",
            name: colourGroupName,
            presets: [...rgbColours, ...whiteChannels].map(
              (id) => `light_${id}`,
            ),
          },
          {
            id: "light_white_templates",
            type: "simple",
            name: "Other white channels (offline preparation)",
            presets: otherWhiteChannels.map((id) => `light_${id}`),
          },
          {
            id: "light_outputs",
            type: "simple",
            name: "Aux 1 and all outputs",
            presets: outputs.map((id) => `light_${id}`),
          },
          {
            id: "light_colours",
            type: "simple",
            name: "Dashboard palette",
            presets: colours.map((id) => `light_${id}`),
          },
          {
            id: "light_utilities",
            type: "simple",
            name: "Refresh and editable media templates",
            presets: utilities.map((id) => `light_${id}`),
          },
          {
            id: "light_scenes",
            type: "simple",
            name: "Scenes",
            presets: scenes.map((id) => `light_${id}`),
          },
          {
            id: "light_mixer",
            type: "simple",
            name: "Colour mixer (prepare / live)",
            presets: mixerControls.map((id) => `light_${id}`),
          },
          {
            id: "light_other_mixer",
            type: "simple",
            name: "Other mix channels (offline preparation)",
            presets: otherMixerControls.map((id) => `light_${id}`),
          },
          {
            id: "light_playlists",
            type: "simple",
            name: "Playlists",
            presets: playlists.map((id) => `light_${id}`),
          },
        ],
      },
    ],
  };
}
