# Actions and HTTP API

The module exposes 23 named actions. All operate through the `oper` account on one connection's selected controller. Every action can be configured offline; execution requires a ready, fresh connection. Offline presses are rejected, not replayed later.

## Action inventory

| Action ID                    | Operator function                      | Request / parameters                                                   | Reported-state feedback                                      |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `scene_play`                 | Play scene continuously                | `modePlayback`, `op: File`, exact `.scn` filename, `cnt: 0`, `fadeMs`  | Active scene, mode error, pause state                        |
| `playlist_play`              | Play playlist continuously             | Same, exact `.pl` filename                                             | Top-level playlist and current item                          |
| `playback_play`              | Resume existing playback               | `playbackCtrl`, `op: Play`, `fadeMs`                                   | Pause state where applicable                                 |
| `playback_pause`             | Pause playback                         | `playbackCtrl`, `op: Paus`, `fadeMs`                                   | Pause state                                                  |
| `playback_pause_toggle`      | Toggle pause                           | `playbackCtrl`, `op: PausTog`, `fadeMs`                                | Pause state                                                  |
| `playback_restart_item`      | Restart current item                   | `playbackCtrl`, `op: Rst`, `fadeMs`                                    | Item state; acknowledgement is not unique proof of restart   |
| `playlist_previous_item`     | Previous playlist operation            | `playbackCtrl`, `op: Prv`, `fadeMs`                                    | Current item                                                 |
| `playlist_next_item`         | Next playlist operation                | `playbackCtrl`, `op: Nxt`, `fadeMs`                                    | Current item                                                 |
| `playlist_previous_recorded` | Previous recorded playlist item        | `playbackCtrl`, `op: PrvRec`, `fadeMs`                                 | Current recorded item                                        |
| `playlist_next_recorded`     | Next recorded playlist item            | `playbackCtrl`, `op: NxtRec`, `fadeMs`                                 | Current recorded item                                        |
| `mode_live`                  | Return to live data                    | `modeLive`, `fadeMs`                                                   | Mode `live`; incoming data is a separate observation         |
| `output_blank`               | Blank outputs                          | `modePlayback`, `op: Blank`, `durMs: 0`, `fadeMs`                      | Playback operation `Blank`                                   |
| `output_freeze`              | Hold output frame                      | `modePlayback`, `op: Freeze`, `durMs: 0`, `fadeMs`                     | Playback operation `Freeze`                                  |
| `output_static_colour`       | Recall custom static colour            | `modePlayback`, `op: Color`, `color`, `colorRes`, `durMs: 0`, `fadeMs` | Reported static channels                                     |
| `palette_recall`             | Recall readable dashboard palette slot | Read `operIf.pal` / `colorRes`, then static colour request             | Reported static colour; no separate recall endpoint          |
| `intensity_set`              | Set programmed intensity               | `progInt`, `item: [{out, op, fc, durMs}]`                              | Per-group programmed factor/priority                         |
| `intensity_increase`         | Increase programmed intensity          | Fresh status, add/clamp step, then `progInt`                           | Per-group factor                                             |
| `intensity_decrease`         | Decrease programmed intensity          | Fresh status, subtract/clamp step, then `progInt`                      | Per-group factor                                             |
| `intensity_override_live`    | Override live intensity                | `progInt`, `item: [{out, op: Hi}]`                                     | Programmed priority `Hi`                                     |
| `intensity_release_override` | Defer to live intensity                | `progInt`, `item: [{out, op: Lo}]`                                     | Programmed priority `Lo`; live authority also needs a source |
| `media_refresh`              | Refresh scene/playlist choices         | `fileList`, `pattern: [*.scn, *.pl]`                                   | Media cache age/list                                         |
| `status_refresh`             | Refresh monitoring                     | `statusRead`, optional `statisticRead` when enabled                    | State and telemetry freshness                                |
| `scene_inspect`              | Inspect scene metadata                 | `scnFileInfo`, exact `.scn` filename                                   | Last-inspected metadata, not a progress clock                |

## Inputs and semantics

Media fields are searchable dropdowns with custom entries. Use exact case-sensitive ASCII filenames, at most 63 characters, including `.scn` or `.pl`, with no path. List positions are never persisted. Hidden files are omitted from normal choices and known hidden names reject locally. Missing files return errors; no substitute is selected. A failed refresh retains the old list with its age.

Fade choices are Snap, 500, 1000 and 2000 milliseconds, plus custom integer milliseconds. These are action settings, not controller defaults. Continuous playback matches the operator workflow. Restart and item navigation operate on playback; recorded navigation skips built-in playlist entries, not files in directory order. There is no ambiguous Stop action: choose Live, Blank or Freeze explicitly.

Intensity selects pixels, Aux 1..8 as planning choices, or pixels plus all configured auxiliary outputs. An auxiliary target must be a configured DMX output at execution. There is no per-pixel-port master control. Percentages map to `round(percent * 255 / 100)`. Set priority choices map to `Set`, `HiSet` or `LoSet`. Override/release retain the factor. Relative changes are serialized read/modify/write, not atomic across external clients.

Custom colour recall uses the RGB picker and saved W/X values. The controller's configured RGB/RGBW/RGBWX type determines sent channels. At 16-bit resolution RGB picker channels scale by 257; W/X accept 0..65535. Unused saved W/X values remain available for future preparation but are not sent or required for matching feedback. W/X ordering is not assumed to mean warm/cool. Static colour replaces playback; it does not recolour incoming data or scene content.

All twelve palette slot numbers can be prepared offline. Recall requires a readable configured slot; an unreadable slot fails without changing settings or substituting another colour. No dashboard fade or palette editor is exposed. Colour scaling, recording, authoring, triggers, test/identify, file/settings writes, network changes and firmware/recovery are outside the module.

## Supporting reads and limits

| Read            | Use                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------ |
| GET `/ver`      | Validate identity, operator enabled state and supported API range                          |
| `constantRead`  | MAC verification and output/power capabilities                                             |
| `configRead`    | Read-only pixel type, output routing/modes, intensity sources and optional palette context |
| `statusRead`    | Operational mode, parameters, playlist state, storage and programmed intensity             |
| `fileList`      | Scene/playlist choices and visible-media presets                                           |
| `scnFileInfo`   | Explicitly inspected scene information                                                     |
| `statisticRead` | Optional data rates, diagnostics, temperature and power statistics                         |

Requests POST JSON to the negotiated `/<api>/` endpoint. The client checks HTTP status, JSON envelope, API error and response ID/type independently. There are no write retries. Settings context is read only and never exposes user/credential objects. Optional reads can be unavailable by role, model or firmware without enabling administrator fallback.

Reference: Advatek Lighting, _PixLite Mk3 API v1.9_, V20260617 (17 June 2026), authentication/read endpoints and operator playback/control/intensity sections. Specifications are not bundled; contact [Advatek](https://www.advateklighting.com/contact-us) for API documentation. See [compatibility and test limits](LOCAL-TESTING.md).

Colour-mix Prepare, channel adjustment and Live Mix enable/disable are local operations. Recall and coalesced live changes use the same `modePlayback` / `Color` request as static recall, with channel count taken from `pix.colorType`. Live changes refresh reported status and check cancellation again after identity verification, before transmission. No controller settings are written.
