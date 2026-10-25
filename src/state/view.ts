import { array, at, isFresh, object, type Snapshot } from "../pixlite/model.js";
import { mediaName } from "../companion/media-labels.js";
export type Values = Record<string, string | number | boolean>;
const scalar = (value: unknown): string | number | boolean =>
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "string" ||
  typeof value === "boolean"
    ? value
    : "";
const numeric = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Rebuild each publication to discard obsolete mode and port values. */
export function valuesFor(snapshot: Snapshot): Values {
  const fresh = snapshot.connected && isFresh(snapshot.statusAt);
  const telemetry = snapshot.connected && isFresh(snapshot.statisticsAt, 6500);
  const media = snapshot.connected && isFresh(snapshot.mediaAt, 65000);
  const status = fresh ? snapshot.status : {};
  const stats = telemetry ? snapshot.statistics : {};
  const playback = status.mode === "playback";
  const reportedFile = at(status, "params.file");
  const file = playback && typeof reportedFile === "string" ? reportedFile : "";
  const modeError = object(at(status, "state.err"));
  const pauseStateAvailable =
    playback && typeof at(status, "state.paus") === "boolean";
  const result: Values = {
    connection_ready: fresh,
    connection_state: fresh
      ? "Ready"
      : snapshot.connected
        ? "Stale"
        : "Disconnected",
    status_available: snapshot.statusAt > 0,
    status_stale: !fresh,
    status_age_s: snapshot.statusAt
      ? Math.round((Date.now() - snapshot.statusAt) / 1000)
      : "",
    media_available: snapshot.mediaAt > 0,
    media_stale: !media,
    media_age_s: snapshot.mediaAt
      ? Math.round((Date.now() - snapshot.mediaAt) / 1000)
      : "",
    telemetry_available: telemetry,
    telemetry_stale: !telemetry,
    telemetry_age_s: snapshot.statisticsAt
      ? Math.round((Date.now() - snapshot.statisticsAt) / 1000)
      : "",
    device_name: snapshot.version?.name ?? "",
    device_model: snapshot.version?.model ?? "",
    firmware_version: snapshot.version?.firmware ?? "",
    api_version: snapshot.version?.api ?? "",
    device_mac: scalar(at(snapshot.constants, "dev.macAddr")),
    mode: scalar(status.mode),
    playback_operation: playback ? scalar(at(status, "params.op")) : "",
    active_file: file,
    active_scene: file.endsWith(".scn") ? file : "",
    active_playlist: file.endsWith(".pl") ? file : "",
    active_file_name: mediaName(file),
    active_scene_name: file.endsWith(".scn") ? mediaName(file) : "",
    active_playlist_name: file.endsWith(".pl") ? mediaName(file) : "",
    playback_continuous: scalar(at(status, "state.cont")),
    playback_paused: playback ? scalar(at(status, "state.paus")) : "",
    pause_state_available: pauseStateAvailable,
    pix_programmed_display: "Unavailable",
    playback_elapsed_s: playback ? scalar(at(status, "state.timS")) : "",
    playback_running:
      pauseStateAvailable &&
      !Object.keys(modeError).length &&
      at(status, "state.paus") === false,
    playlist_item_index: playback ? scalar(at(status, "state.item")) : "",
    playlist_item_operation: playback ? scalar(at(status, "state.op")) : "",
    playlist_item_file: playback ? scalar(at(status, "state.file")) : "",
    playlist_item_name:
      playback && typeof at(status, "state.file") === "string"
        ? mediaName(at(status, "state.file") as string)
        : "",
    mode_error_code: scalar(modeError.code),
    mode_error_message: scalar(modeError.msg),
    last_action: snapshot.lastAction,
    last_action_delivery: snapshot.delivery,
    last_api_error_message: snapshot.error,
    last_api_error_code: snapshot.errorCode ?? "",
    last_http_status: snapshot.httpStatus ?? "",
    scene_count: media
      ? snapshot.files.filter(
          (entry) => entry.attr !== "h" && entry.file.endsWith(".scn"),
        ).length
      : "",
    playlist_count: media
      ? snapshot.files.filter(
          (entry) => entry.attr !== "h" && entry.file.endsWith(".pl"),
        ).length
      : "",
    metadata_scene_name: snapshot.metadataFile,
    metadata_scene_display_name: mediaName(snapshot.metadataFile),
    selected_scene_valid: scalar(snapshot.metadata.valid),
    selected_scene_duration_s: numeric(snapshot.metadata.durMs)
      ? snapshot.metadata.durMs / 1000
      : "",
    selected_scene_universes: scalar(snapshot.metadata.unis),
    selected_scene_pixel_ports: scalar(snapshot.metadata.pixPorts),
    selected_scene_aux_ports: scalar(snapshot.metadata.auxPorts),
    pixel_playback_policy: scalar(at(snapshot.config, "pix.pbMode")),
    pixel_colour_type: scalar(at(snapshot.config, "pix.colorType")),
    white_w_available:
      fresh &&
      ["RGBW", "RGBWX"].includes(String(at(snapshot.config, "pix.colorType"))),
    white_x_available:
      fresh && at(snapshot.config, "pix.colorType") === "RGBWX",
    pix_input_fps: scalar(at(stats, "pixData.inFrmRate")),
    pix_output_fps: scalar(at(stats, "pixData.outFrmRate")),
    pix_overruns: scalar(at(stats, "pixData.overrun")),
    pix_dropped_frames: scalar(at(stats, "pixData.overrunDrop")),
    pix_partial_frames: scalar(at(stats, "pixData.inPartial")),
    diagnostic_error_count: scalar(at(stats, "diag.errCnt")),
    diagnostic_last_error: scalar(at(stats, "diag.err")),
    temperature_c: scalar(at(stats, "dev.temp.current")),
    temperature_min_c: scalar(at(stats, "dev.temp.min")),
    temperature_max_c: scalar(at(stats, "dev.temp.max")),
    cpu_percent: scalar(at(stats, "dev.cpu")),
    thermal_available: numeric(at(stats, "dev.temp.current")),
  };
  const store = array(status.store)
    .map(object)
    .find((entry) => entry.typ === "MicroSD");
  result.sd_present = fresh ? !!store : "";
  result.sd_filesystem = scalar(store?.fs);
  result.sd_speed_class = scalar(store?.speed);
  result.sd_used_bytes = scalar(store?.used);
  result.sd_available_bytes = scalar(store?.avail);
  result.sd_free_percent =
    numeric(store?.used) &&
    numeric(store?.avail) &&
    store.used + store.avail > 0
      ? (100 * store.avail) / (store.used + store.avail)
      : "";
  const colours = ["r", "g", "b", "w", "x"];
  colours.forEach((channel, index) => {
    result[`static_colour_${channel}`] =
      playback && at(status, "params.op") === "Color"
        ? scalar(array(at(status, "params.color"))[index])
        : "";
    result[`playlist_item_colour_${channel}`] =
      playback && at(status, "state.op") === "Color"
        ? scalar(array(at(status, "state.color"))[index])
        : "";
  });
  for (const output of array(status.outInt).map(object)) {
    const out = String(output.out);
    if (out !== "Pix" && !/^Aux:[1-8]$/.test(out)) continue;
    const index = out === "Pix" ? -1 : Number(out.split(":")[1]) - 1;
    const prefix = index < 0 ? "pix" : `aux_${index + 1}`;
    const programmed = array(output.fc)[1],
      live = array(output.fc)[0];
    const configured =
      index < 0
        ? at(snapshot.config, "pix.liveIntSrc")
        : array(at(snapshot.config, "auxPort.liveIntSrc"))[index];
    const available =
      index < 0
        ? at(stats, "pixData.liveIntAv")
        : array(at(stats, "auxData.liveIntAv"))[index];
    const authority =
      output.progPri === "Hi"
        ? "Programmed"
        : typeof configured !== "string"
          ? ""
          : configured === ""
            ? "Programmed"
            : typeof available !== "boolean"
              ? ""
              : available
                ? "Live"
                : "Programmed";
    const effective =
      authority === "Programmed"
        ? programmed
        : authority === "Live"
          ? live
          : undefined;
    result[`${prefix}_programmed_factor`] = scalar(programmed);
    result[`${prefix}_programmed_percent`] = numeric(programmed)
      ? (programmed * 100) / 255
      : "";
    result[`${prefix}_programmed_display`] = numeric(programmed)
      ? `${Math.round((programmed * 100) / 255)}%`
      : "Unavailable";
    result[`${prefix}_live_factor`] = scalar(live);
    result[`${prefix}_live_percent`] = numeric(live) ? (live * 100) / 255 : "";
    result[`${prefix}_programmed_priority`] = scalar(output.progPri);
    result[`${prefix}_intensity_authority`] = authority;
    const outputConfigured =
      index < 0 ||
      array(at(snapshot.config, "auxPort.mode"))[index] === "DMX512Out";
    result[`${prefix}_effective_factor`] = outputConfigured
      ? scalar(effective)
      : "";
    result[`${prefix}_effective_percent`] =
      outputConfigured && numeric(effective) ? (effective * 100) / 255 : "";
    result[`${prefix}_live_intensity_available`] = scalar(available);
    result[`${prefix}_intensity_available`] = numeric(programmed);
    if (index >= 0) {
      result[`${prefix}_port_mode`] = scalar(
        array(at(snapshot.config, "auxPort.mode"))[index],
      );
      result[`${prefix}_output_configured`] = fresh ? outputConfigured : "";
      result[`${prefix}_playback_policy`] = scalar(
        array(at(snapshot.config, "auxPort.pbMode"))[index],
      );
      result[`${prefix}_input_fps`] = scalar(
        array(at(stats, "auxData.inFrmRate"))[index],
      );
      result[`${prefix}_output_fps`] = scalar(
        array(at(stats, "auxData.outFrmRate"))[index],
      );
    }
  }
  const powered = at(snapshot.constants, "dev.pwrOut") === true;
  const reportedPorts = at(snapshot.constants, "dev.pixPorts");
  // Supported controllers have at most 16 ports; do not loop over unchecked input.
  const ports =
    typeof reportedPorts === "number" &&
    Number.isInteger(reportedPorts) &&
    reportedPorts > 0 &&
    reportedPorts <= 16
      ? reportedPorts
      : 0;
  const voltages = at(snapshot.constants, "dev.pwrPixVolts") === true;
  const currents = array(at(stats, "pixPwrOuts.current")),
    voltage = array(at(stats, "pixPwrOuts.voltage"));
  let total = 0,
    watts = 0,
    complete = powered && ports > 0,
    estimates = complete && voltages;
  if (powered)
    for (let index = 0; index < ports; index++) {
      const current = currents[index],
        volts = voltages ? voltage[index] : undefined;
      result[`port_${index + 1}_current_a`] = numeric(current)
        ? current / 1000
        : "";
      result[`port_${index + 1}_voltage_v`] = numeric(volts)
        ? volts / 1000
        : "";
      result[`port_${index + 1}_power_active`] = scalar(
        array(at(stats, "pixPwrOuts.fuseGood"))[index],
      );
      const state = array(at(stats, "pixPwrOuts.stat"))[index];
      result[`port_${index + 1}_power_state`] = [
        "Good",
        "Inactv",
        "OvrCur",
      ].includes(String(state))
        ? String(state)
        : "";
      const power =
        numeric(current) && numeric(volts)
          ? (current * volts) / 1_000_000
          : undefined;
      result[`port_${index + 1}_estimated_w`] = scalar(power);
      if (numeric(current)) total += current / 1000;
      else complete = false;
      if (numeric(power)) watts += power;
      else estimates = false;
    }
  array(at(stats, "dev.bankVolt")).forEach((entry, index) => {
    result[`bank_${index + 1}_voltage_v`] = numeric(entry) ? entry / 1000 : "";
  });
  result.output_current_total_a = complete ? total : "";
  result.estimated_output_w_total = estimates ? watts : "";
  result.power_current_available = complete;
  result.power_estimate_available = estimates;
  result.power_state_available =
    powered &&
    array(at(stats, "pixPwrOuts.stat")).some((entry) =>
      ["Good", "Inactv", "OvrCur"].includes(String(entry)),
    );
  result.power_voltage_available = powered && voltages && voltage.some(numeric);
  return result;
}
