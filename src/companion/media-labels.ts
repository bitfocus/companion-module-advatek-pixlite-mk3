import type { CompanionActionInfo } from "@companion-module/base";

const mediaActions = new Set(["scene_play", "playlist_play", "scene_inspect"]);
type MediaSelection = { actionId: string; file: string };

/** Display only. Exact filenames remain untouched in bindings and HTTP requests. */
export function mediaName(file: string): string {
  return (
    file
      .replace(/\.(scn|pl)$/i, "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f]/g, " ")
      .trim()
  );
}

/** Compact caption for a physical key. Lists keep the complete display name. */
export function mediaLabel(file: string): string {
  const name = Array.from(mediaName(file));
  if (name.length <= 11) return name.join("");
  let split = name
    .slice(0, 11)
    .join("")
    .search(/[ _-][^ _-]*$/);
  if (split < 3) split = 11;
  else if (name[split] === "-") split++;
  const first = name.slice(0, split).join("").trim();
  const rest = name.slice(split).join("").trim();
  const tail = Array.from(rest);
  return `${first}\n${tail.length > 11 ? tail.slice(0, 8).join("") + "..." : rest}`;
}

/** Per-button captions follow action subscriptions without reading the controller. */
export class MediaButtonLabels {
  private readonly actions = new Map<
    string,
    { controlId: string } & MediaSelection
  >();
  constructor(private readonly changed: () => void = () => {}) {}

  subscribe(action: CompanionActionInfo): void {
    if (!mediaActions.has(action.actionId)) return;
    this.actions.set(action.id, {
      controlId: action.controlId,
      actionId: action.actionId,
      file: typeof action.options.file === "string" ? action.options.file : "",
    });
    this.changed();
  }

  unsubscribe(action: CompanionActionInfo): void {
    if (this.actions.delete(action.id)) this.changed();
  }

  selection(controlId: string): MediaSelection | undefined {
    const selections = [...this.actions.values()].filter(
      (action) => action.controlId === controlId,
    );
    const unique = new Map(
      selections.map((action) => [`${action.actionId}:${action.file}`, action]),
    );
    return unique.size === 1 ? unique.values().next().value : undefined;
  }

  label(controlId: string): string {
    const selection = this.selection(controlId);
    if (!selection)
      return [...this.actions.values()].some(
        (action) => action.controlId === controlId,
      )
        ? "Multiple\nmedia"
        : "Select\nmedia";
    return selection.file
      ? mediaLabel(selection.file)
      : selection.actionId === "playlist_play"
        ? "Select\nplaylist"
        : "Select\nscene";
  }

  clear(): void {
    this.actions.clear();
  }
}
