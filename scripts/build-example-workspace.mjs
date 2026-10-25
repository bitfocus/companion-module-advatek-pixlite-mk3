import fs from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { presetDefinitions } from "../dist/presets.js";
import { emptySnapshot } from "../dist/pixlite/model.js";

const value = (value) => ({ value, isExpression: false });
const options = {
  stepProgression: "auto",
  stepExpression: "",
  rotaryActions: false,
  canModifyStyleInApis: false,
  notes: "SHOWTime example control",
};

function button(text, connectionId, definitionId, actionOptions = {}) {
  return {
    type: "button-layered",
    style: {
      layers: [
        {
          id: "canvas",
          type: "canvas",
          decoration: value("border"),
          showStatusIcons: value("default"),
        },
        {
          id: "text",
          type: "text",
          enabled: value(true),
          opacity: value(100),
          x: value(0),
          y: value(0),
          width: value(100),
          height: value(100),
          rotation: value(0),
          text: value(text),
          color: value(0xffffff),
          halign: value("center"),
          valign: value("center"),
          fontsize: value(48),
          fontsizeAllowShrink: value(true),
          font: value("companion-sans"),
          weight: value("normal"),
          styles: value([]),
          outlineColor: value(0xff000000),
        },
      ],
    },
    options: { ...options },
    feedbacks: [],
    localVariables: [],
    steps: {
      0: {
        action_sets: {
          down: definitionId
            ? [
                {
                  type: "action",
                  id: `example-${definitionId}`,
                  connectionId,
                  definitionId,
                  options: Object.fromEntries(
                    Object.entries(actionOptions).map(([key, item]) => [
                      key,
                      value(item),
                    ]),
                  ),
                  upgradeIndex: 0,
                },
              ]
            : [],
          up: [],
        },
        options: { runWhileHeld: [] },
      },
    },
  };
}

/** Native Companion v12 example, built without reading a user's profile. */
export function exampleWorkspace(version) {
  const workspace = {
    version: 12,
    type: "full",
    companionBuild: "5.1.1+10000-stable-1e2454ae78",
    pages: {},
    instances: {},
    triggers: {},
    triggerCollections: [],
    custom_variables: {},
    customVariablesCollections: [],
    expressionVariables: {},
    expressionVariablesCollections: [],
    connectionCollections: [],
    surfaces: {},
    surfaceGroups: {},
    surfacesRemote: {},
    surfaceInstances: {},
    surfaceInstanceCollections: [],
    imageLibrary: [],
    imageLibraryCollections: [],
  };
  const addPage = (name, buttons, columns = 7) => {
    const number = Object.keys(workspace.pages).length + 1;
    const controls = {
      0: { 0: { type: "pageup" } },
      1: { 0: { type: "pagenum" } },
      2: { 0: { type: "pagedown" } },
    };
    buttons.forEach((control, index) => {
      if (!control) return;
      const row = Math.floor(index / columns);
      controls[row] ??= {};
      controls[row][(index % columns) + 1] = control;
    });
    workspace.pages[number] = {
      id: `pixlite-example-page-${number}`,
      name,
      controls,
      gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 },
      pageVariables: [],
    };
  };
  for (let index = 0; index < 4; index++) {
    const letter = String.fromCharCode(65 + index);
    const offline = index === 3;
    const id = offline ? "example-offline" : `example-${letter}`;
    const label = offline ? "Example_Offline" : `Example_${letter}`;
    workspace.instances[id] = {
      moduleInstanceType: "connection",
      moduleId: "advatek-pixlite-mk3",
      moduleVersionId: version,
      updatePolicy: "manual",
      sortOrder: index,
      label,
      isFirstInit: false,
      lastUpgradeIndex: 0,
      enabled: true,
      config: {
        host: "",
        port: 0,
        secure: false,
        connectionMode: "http",
        advanced: false,
        tlsProfile: "standard",
        expectedMac: "",
        ca: "",
        telemetry: false,
      },
      secrets: { password: "" },
    };
    if (offline) {
      addPage("Offline preparation", [
        button("Select\nscene", id, "scene_play", {
          file: "",
          fade: 0,
        }),
        button("Select\nplaylist", id, "playlist_play", {
          file: "",
          fade: 0,
        }),
        button("Custom\nRGB W X", id, "output_static_colour", {
          colour: 0x123456,
          resolution: "8Bit",
          white: 78,
          extra: 91,
          fade: 0,
        }),
        button("Aux 1\n25%", id, "intensity_set", {
          output: "Aux:1",
          level: 25,
          priority: "override",
          fade: 0,
        }),
        button("Palette 12", id, "palette_recall", { slot: 11, fade: 0 }),
      ]);
      continue;
    }
    const snapshot = emptySnapshot();
    const { presets } = presetDefinitions(snapshot);
    const reference = (presetId) => ({
      ...button(""),
      type: "preset-reference",
      style: { layers: [] },
      presetRef: {
        connectionId: id,
        moduleId: "advatek-pixlite-mk3",
        presetId,
        variableValues: null,
      },
    });
    for (const theme of ["dark", "light"]) {
      const prefix = theme === "light" ? "light_" : "";
      const key = (preset) => reference(prefix + preset);
      addPage(
        `${letter} direct ${theme}`,
        [
          key("pause_toggle"),
          key("playback_restart_item"),
          key("playlist_template"),
          null,
          key("intensity_increase_5"),
          key("playlist_previous_recorded"),
          key("playlist_next_recorded"),
          key("playlist_previous_item"),
          key("playlist_next_item"),
          button(`$(${label}:pix_programmed_display)\nPROGRAM`, id),
          key("live"),
          key("freeze"),
          key("blank"),
          key("release"),
          key("intensity_decrease_5"),
          key("colour_White RGB"),
          key("white_W"),
          key("white_X"),
        ],
        5,
      );
      const ids = Object.keys(presets).filter(
        (key) =>
          key.startsWith("light_") === (theme === "light") &&
          !key.replace(/^light_/, "").startsWith("mix_"),
      );
      const whites = ["white_W", "white_X"].map((id) => prefix + id);
      const ordered = ids.filter((id) => !whites.includes(id));
      ordered.splice(
        ordered.indexOf(prefix + "colour_White RGB") + 1,
        0,
        ...whites,
      );
      for (let offset = 0; offset < ordered.length; offset += 28) {
        addPage(
          `${letter} ${theme} ${offset / 28 + 1}`,
          ordered.slice(offset, offset + 28).map(reference),
        );
      }
      addPage(
        `${letter} mix ${theme}`,
        [
          key("mix_recall"),
          key("mix_live"),
          key("mix_load"),
          key("mix_prepare"),
          button(`$(${label}:mix_mode)\n$(${label}:mix_hex)`, id),
          ...["red", "green", "blue", "white", "extra"].map((channel) =>
            key(`mix_${channel}_up`),
          ),
          ...["red", "green", "blue", "white", "extra"].map((channel) =>
            key(`mix_${channel}`),
          ),
          ...["red", "green", "blue", "white", "extra"].map((channel) =>
            key(`mix_${channel}_down`),
          ),
        ],
        5,
      );
    }
  }
  addPage(
    "Monitoring (automatic)",
    ["A", "B", "C"].flatMap((letter) =>
      [
        ["State", "connection_state"],
        ["Mode", "mode"],
        ["Playing", "active_file_name"],
        ["Temp C", "temperature_c"],
        ["Port 1 A", "port_1_current_a"],
        ["Status age s", "status_age_s"],
        ["Telemetry", "telemetry_available"],
        ["Last delivery", "last_action_delivery"],
        ["Last error", "last_api_error_message"],
      ].map(([caption, variable]) =>
        button(`${letter} ${caption}\n$(Example_${letter}:${variable})`),
      ),
    ),
  );
  return workspace;
}

export const workspacePath = new URL(
  "../companion/EXAMPLE.companionconfig",
  import.meta.url,
);
export const exampleWorkspacePath = new URL(
  "../examples/showtime-demo/SHOWTime.companionconfig",
  import.meta.url,
);
export function encodeWorkspace(workspace) {
  return gzipSync(Buffer.from(JSON.stringify(workspace)), { level: 9 });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { version } = JSON.parse(
    await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const bytes = encodeWorkspace(exampleWorkspace(version));
  for (const target of [workspacePath, exampleWorkspacePath]) {
    if (process.argv.includes("--check")) {
      if (!bytes.equals(await fs.readFile(target)))
        throw new Error(
          "Example workspace is stale. Run yarn workspace:build.",
        );
    } else {
      await fs.mkdir(new URL("./", target), { recursive: true });
      await fs.writeFile(target, bytes);
    }
  }
  const readme = await fs.readFile(
    new URL("../examples/showtime-demo/README.md", import.meta.url),
  );
  const help = new URL("../companion/EXAMPLE.md", import.meta.url);
  if (process.argv.includes("--check")) {
    if (!readme.equals(await fs.readFile(help)))
      throw new Error(
        "Example instructions are stale. Run yarn workspace:build.",
      );
  } else await fs.writeFile(help, readme);
  console.log(
    `Example workspace: ${bytes.length} bytes, four connections, addresses unset`,
  );
}
