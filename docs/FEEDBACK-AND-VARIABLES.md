# Feedback and variables

Feedback uses reported controller state, not the fact that a button was pressed. Pending, Accepted, Rejected and Unknown delivery describe the last action's lifecycle. Matching state does not prove that action caused it or that physical light output is correct.

`button_action_failed` identifies the control that issued the last rejected or uncertain command. It is local to that connection and clears when a later command is accepted. `pause_state_unavailable` indicates that the fresh playback status contains no file pause state; the toggle then retains its combined symbol with an availability badge. `playback_running` requires an explicitly reported false pause state.

`pix_programmed_display` and the available `aux_N_programmed_display` values format reported levels as whole percentages for status keys. The pixel display reads `Unavailable` when no fresh value is present. Numeric percentage/factor variables retain their existing units and blank-unavailable semantics.

## Freshness

Operational state expires after 3.5 seconds, telemetry after 6.5 seconds and media after 65 seconds. State-driven boolean feedback is false when operational state is stale, with a separate stale override on supplied presets. Missing numeric variables are empty strings, not valid zero readings. Companion publishes variables under each connection's namespace.

## Feedback inventory

| Feedback ID                                                 | Meaning / input                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `connection_ready`                                          | Authorised connection with fresh status                                   |
| `state_stale`                                               | Disconnected or expired operational state                                 |
| `capability_unavailable`                                    | Selected availability flag is not true                                    |
| `mode_is`                                                   | Match the reported mode, including externally started modes               |
| `playback_operation_is`                                     | File, Blank, Freeze or Color                                              |
| `scene_selected`, `playlist_selected`                       | Exact top-level file selected, without mode error                         |
| `playlist_item_is`                                          | Current item filename or reported item number                             |
| `playback_paused`, `playback_running`                       | Applicable playback state                                                 |
| `mode_error`                                                | Reported mode error, distinct from command rejection                      |
| `static_colour_matches`                                     | RGB picker plus W/X in device resolution; unused channels ignored         |
| `output_policy_is`                                          | Read-only output routing policy                                           |
| `programmed_intensity_compare`                              | Numeric programmed factor/percentage comparison                           |
| `intensity_priority_is`                                     | Selected group's programmed Hi/Lo priority                                |
| `live_intensity_available`                                  | Fresh reported live-intensity availability                                |
| `intensity_authority_is`                                    | Derived Programmed/Live authority when inputs are available               |
| `media_available`                                           | Exact visible file in a fresh media list                                  |
| `media_cache_stale`                                         | Missing, disconnected or expired media list                               |
| `scene_valid`                                               | Valid flag from the last explicit scene inspection                        |
| `sd_present`, `sd_state_is`                                 | Reported SD presence/filesystem                                           |
| `sd_space_below`                                            | Storage numeric comparison, defaulting to free percent at/below threshold |
| `data_frame_rate_compare`                                   | Selected data-rate measurement                                            |
| `diagnostic_error`                                          | Diagnostic error count since startup is positive                          |
| `last_action_rejected`, `last_action_unknown`               | Last action delivery diagnostic                                           |
| `temperature_compare`, `current_compare`, `voltage_compare` | Selected fresh measurement and threshold                                  |
| `power_estimate_compare`, `metric_compare`                  | Estimated watts or another numeric variable                               |
| `power_output_state_is`, `power_output_active`              | Detailed power state or legacy active-power flag                          |
| `button_media_name`                                         | Value feedback for this button's configured media caption                 |
| `button_media_selected`                                     | Match the file selected in this button's media action                     |

Numeric feedback offers `gte` (at least), `lte` (at most) and `eq` (within tolerance), with a measurement dropdown/custom variable ID. Thresholds use the selected variable's units. Unavailable data does not satisfy a comparison. No factory thermal/current alarm threshold is invented by the module.

For automatic media names, add `button_media_name` as a local variable named `media_name` and use `$(local:media_name)` as the button text, or place a supplied media preset. Different media actions on one control display `Multiple media`. These labels update offline without executing a command.

## Variable inventory

Use Companion's Variables panel for the actual values available on the selected device. Dynamic groups appear as their context becomes available. Retargeting clears values absent on the new target.

| Variables / family                                                                                                                                               | Source and meaning                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `connection_state`, `connection_ready`                                                                                                                           | Ready, Stale or Disconnected; fresh operational state                         |
| `device_name`, `device_model`, `firmware_version`, `api_version`                                                                                                 | Validated device identity/API                                                 |
| `device_ip`, `device_mac`, `connection_source`                                                                                                                   | Configured host, permitted constant MAC and expected-MAC verification state   |
| `status_available`, `status_stale`, `status_age_s`                                                                                                               | Whether status was read, current freshness and age                            |
| `media_available`, `media_stale`, `media_age_s`                                                                                                                  | Whether a list was read, current freshness and age                            |
| `telemetry_available`, `telemetry_stale`, `telemetry_age_s`                                                                                                      | Current telemetry availability/freshness/age                                  |
| `last_action`, `last_action_delivery`                                                                                                                            | Last action name and delivery lifecycle                                       |
| `last_api_error_message`, `last_api_error_code`, `last_http_status`                                                                                              | Sanitised diagnostic fields; not per-action causal correlation                |
| `mode`, `playback_operation`                                                                                                                                     | Current mode and playback operation                                           |
| `active_file`, `active_scene`, `active_playlist`                                                                                                                 | Exact top-level filenames, including extensions, for bindings and expressions |
| `active_file_name`, `active_scene_name`, `active_playlist_name`, `playlist_item_name`, `metadata_scene_display_name`                                             | Display names without extensions; use these for button text                   |
| `playback_continuous`, `playback_paused`, `pause_state_available`, `playback_running`, `playback_elapsed_s`                                                      | Applicable playback fields                                                    |
| `playlist_item_index`, `playlist_item_operation`, `playlist_item_file`                                                                                           | Reported current playlist item                                                |
| `mode_error_code`, `mode_error_message`                                                                                                                          | Operational mode error                                                        |
| `static_colour_r/g/b/w/x`, `playlist_item_colour_r/g/b/w/x`                                                                                                      | Reported channels in device resolution, where applicable                      |
| `scene_count`, `playlist_count`                                                                                                                                  | Visible files in a fresh media list                                           |
| `metadata_scene_name`, `selected_scene_valid`, `selected_scene_duration_s`, `selected_scene_universes`, `selected_scene_pixel_ports`, `selected_scene_aux_ports` | Last explicit inspection, cleared on retarget; not automatically refreshed    |
| `pixel_colour_type`, `pixel_playback_policy`                                                                                                                     | Read-only configured pixel context                                            |
| `pix_*`, `aux_N_*`                                                                                                                                               | See intensity/data families below; N is one-based                             |
| `sd_present`, `sd_filesystem`, `sd_speed_class`, `sd_used_bytes`, `sd_available_bytes`, `sd_free_percent`                                                        | Reported storage and derived free percentage                                  |
| `temperature_c`, `temperature_min_c`, `temperature_max_c`, `thermal_available`, `cpu_percent`                                                                    | Optional thermal/CPU statistics                                               |
| `diagnostic_error_count`, `diagnostic_last_error`                                                                                                                | Reported diagnostics                                                          |
| `bank_N_voltage_v`                                                                                                                                               | Input-bank voltage, converted from millivolts                                 |
| `port_N_current_a`, `port_N_voltage_v`, `port_N_power_state`, `port_N_power_active`, `port_N_estimated_w`                                                        | Physical powered-output monitoring                                            |
| `output_current_total_a`, `estimated_output_w_total`                                                                                                             | Complete supported-output sum, otherwise unavailable                          |
| `power_current_available`, `power_voltage_available`, `power_state_available`, `power_estimate_available`                                                        | Separate capability/data flags                                                |

For `pix` and `aux_N`, intensity suffixes are `programmed_factor`, `programmed_percent`, `live_factor`, `live_percent`, `programmed_priority`, `intensity_authority`, `effective_factor`, `effective_percent`, `live_intensity_available` and `intensity_available`. Aux groups also expose `port_mode`, `output_configured`, `playback_policy`, `input_fps` and `output_fps`. Pixel data adds `pix_input_fps`, `pix_output_fps`, `pix_overruns`, `pix_dropped_frames` and `pix_partial_frames`.

Factors are 0..255; percentages are derived. Effective intensity needs configured live-source context and availability where relevant. An Aux stored factor remains readable when its port is disabled/input, but effective factor is unavailable unless configured as DMX output. This is not a physical output measurement.

Detailed power states `Good`, `Inactv` and `OvrCur` are distinct. The legacy active-power flag alone does not prove fuse continuity or overcurrent. Current is amperes, voltage is volts, and watts are estimates from fresh same-output voltage/current. No measured total input-power value is claimed. Unsupported per-output voltage leaves estimated watts unavailable.

Reference: Advatek Lighting, _PixLite Mk3 API v1.9_, V20260617 (17 June 2026), status/statistics/configuration sections. See [actions](HTTP-API-MAP.md), [architecture](ARCHITECTURE.md) and [testing](LOCAL-TESTING.md).

`white_w_available` and `white_x_available` follow the connected controller's commissioned colour type and fresh status. W requires RGBW or RGBCCT (RGBWX); X requires RGBCCT. White-channel presets use these flags to mark an unavailable channel.

Colour preparation exposes `mix_red_percent`, `mix_green_percent`, `mix_blue_percent`, `mix_white_percent` and `mix_extra_percent`, with corresponding `_display` strings. `mix_hex`, `mix_mode`, `mix_live_enabled`, `mix_pending`, `mix_matches_output` and `mix_error` describe the local mix and its relationship to reported output. Colour-mix feedback covers Live Mix, pending commands, output matching, errors and channel availability; the channel-value feedback supplies dial captions. Local mix values remain usable offline.
