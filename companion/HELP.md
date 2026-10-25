# Advatek PixLite Mk3

Requires controller firmware v3.15.0 or later with API v1.9 enabled.

Play existing scenes and playlists, adjust intensity and recall colours from your Companion surface. Feedback follows the controller's reported state.

The controller must already be commissioned in Advatek software, with content loaded and its operator account enabled. This module signs in as `oper`. Recording, authoring, trigger creation, file management and device settings stay in Advatek software.

New to Companion? Its [connection guide](https://github.com/bitfocus/companion/blob/main/docs/user-guide/3_config/connections.md) explains connections, help and variables.

## Connect

1. Install the module from Companion's **Modules** page. For a supplied test package, use **Import module package** and select its `.tgz`.
2. Add **Advatek PixLite Mk3** in **Connections**. Give it a useful label, such as `Lobby`.
3. Enter the **Controller address** and **Operator password**, then choose **Connection**: HTTP, HTTPS, or HTTPS (custom certificate). Use the host only, without a URL scheme or path. Normal ports are automatic: HTTP `80`, HTTPS `4443`.
4. Save and wait for the connection to become ready.

Or choose **Find controllers**, select the controller-facing IPv4 interface and **Scan network**. Match the name and MAC, then choose **Use controller**. Discovery fills the address and MAC. Its HTTPS defaults select the Advatek certificate and normal HTTPS port; the password is preserved. Reopen connection settings after selection.

For ordinary local control, keep Companion and the controller on the same IPv4 subnet. Discovery visibility does not prove that HTTP can reach the address. Routed installations need a suitable route and firewall rules. ADAR uses UDP port `49151` and does not change network settings.

**HTTPS** verifies the controller's Advatek certificate against its pinned root and exact **Device MAC** before API traffic. Discovery supplies the MAC. **HTTPS (custom certificate)** uses standard hostname/IP, purpose and trust verification. Under **Advanced**, use **CA certificate** for a custom issuer or **Port override** for a non-standard port. `0` keeps automatic port selection. Saved custom ports and certificate policies are preserved during upgrades.

**Device MAC** can also pin an HTTP or custom-certificate connection to a particular controller. **Device statistics** adds supported telemetry; playback status always refreshes automatically. See the [HTTPS guide](https://github.com/bitfocus/companion-module-advatek-pixlite-mk3/blob/main/docs/HTTPS.md) for certificate details.

Supported identities are A4-S Mk3, E4-S Mk3, E16-S Mk3 and T8-S Mk3. Available features depend on the device and firmware. A4-S and E16-S have concurrent playback/control bench coverage, including operator-observed pixel and auxiliary output. Other models, physical surfaces and broader electrical measurements remain unqualified.

## Place your controls

Open **Buttons > Presets**, select the connection and choose **SHOWTime operator (dark keys)** or **SHOWTime operator (light keys)**. Both offer the same controls. Start with Live, Blank, the Pause/Resume toggle, intensity arrows and your main scenes. The bundled example workspace also provides a Direct operator layout, with increase, the reported programmed level and decrease in one vertical column.

Linked presets receive module preset updates. To customise one, choose **Edit**, then **Convert** to make an editable button, or place a copied preset. The scene, playlist and metadata templates start without a filename: convert or copy the template, then select its media in the action. Check the connection used by its actions and feedback.

Choose scenes and playlists from the searchable device list, or enter an exact filename such as `House Open.scn` or `Evening.pl`. These are example names. Include the extension and select **Use "filename"** in the dropdown to save a manual entry. Typing alone does not select it. Missing files produce an error rather than selecting a replacement; hidden files are omitted.

Media lists and preset names omit file extensions. Scenes and playlists have separate lists; mixed feedback lists identify each type. Media presets label themselves from their configured action, including offline. Button captions may shorten a long name; the action keeps the full filename. A button containing different media selections shows **Multiple media**. To display the name currently playing, use a separate status key with `$(Lobby:active_file_name)`.

## Playback and playlists

- **Scene / Playlist: Play continuously** starts the selected content.
- **Pause**, **Resume** and **Toggle pause** control existing playback. The toggle key shows Pause while file playback runs and Resume while paused. PixLite does not report a pause state for every playback operation; a clock on the combined key indicates that this state is unavailable. **Restart current item** restarts its current item.
- **Next / Previous playlist item** includes built-in playlist entries. **Next / Previous recorded playlist item** skips non-recorded entries.
- **Live data**, **Blank outputs** and **Freeze output frame** select the required operating mode. There is no general Stop action; choose the desired output behaviour.
- **Read: Scene metadata** inspects a scene without starting it. Its result is the last explicit inspection, not a playback progress display.

Start a playlist before navigating it. **Next scene** moves within that playlist, not through the controller's scene directory. Use the action's **Transition fade** where offered; custom values are milliseconds.

## White channels

The main Controls group includes **White W 100%** for an RGBW controller and **White W 100%** plus **White X 100%** for RGBCCT (RGBWX). A dedicated colour group repeats the applicable controls beside the RGB recalls. Placed W/X keys show a clock and dashed outline when that channel is unavailable. This follows the controller's commissioned pixel type; Companion does not change that setting.

Both white-channel starters remain available when offline or when the colour type is unknown. While connected, other channel templates are kept in **Other white channels (offline preparation)** so saved keys and future setup remain available. Convert a colour preset to edit RGB, W and X independently. **White RGB** uses RGB only, with W/X at zero. W/X follow the controller's channel mapping, without assuming warm/cool order or providing a Kelvin conversion. An unsupported white-only recall is rejected without changing output.

## Intensity

Set a programmed percentage or adjust it with increase/decrease actions. Select **Pixel outputs**, a particular **Auxiliary output**, or **Pixels and configured auxiliary outputs**. Pixel intensity is a group master, not a separate dimmer for every pixel port. Aux intensity requires a configured DMX output.

Choose priority deliberately:

- **Retain priority** changes the level without changing its priority.
- **Override live intensity** gives the programmed level priority over incoming live intensity.
- **Defer to live intensity** lets an available, configured live intensity source take authority.

**Release override** keeps the programmed level and returns its priority to low. It does not recall 100%. A stored level can change without affecting output when its group or playback policy is not in use. Check intensity authority and the commissioned routing if the output does not follow it.

New Set level actions default to 100%. Connecting or migrating the module never recalls that level automatically: displayed values follow the controller.

## Colours

Use **Colour: Set static playback colour** with the RGB picker and any applicable W/X values. The controller's commissioned pixel type determines RGB, RGBW or RGBWX (RGBCCT); unavailable channels are labelled and are not sent. Their fields stay editable for offline preparation. Follow the installation's W/X assignment rather than assuming warm/cool order.

For a named custom recall, copy a colour key and update its action, matching colour feedback and any fixed swatch together. Editing the action alone does not recolour a fixed image. Static colour replaces playback; it does not tint a recorded scene or live input. Record scenes with the intended colours already included.

**Recall readable dashboard palette slot** uses the selected commissioned palette position. An unreadable or unconfigured slot is rejected. Palette editing stays outside Companion.

## Colour mixer

The **Colour mixer (prepare / live)** group has Recall, Live Mix, Load output, editable Prepare colour, and channel keys. Each dial key displays its prepared percentage: turn to adjust by 1%, or press to set that channel to zero. Separate +1% and -1% keys work on ordinary button surfaces. W/X follow the commissioned pixel type and remain available for offline preparation.

Preparation changes only the local mix. **Recall mix** applies it as Static Colour. **Load output** copies the reported Static Colour without changing output. Edit a Prepare colour action to save a custom RGB/W/X starting mix; follow it with Recall when required.

**Live Mix** starts off. Enabling it loads the current Static Colour and lets subsequent channel edits affect output. Switching operating mode, changing connection settings, losing the connection or receiving a live-mix command error turns it off. Rapid edits are combined into the latest mix; disabling it cancels unsent changes. A command already sent can still finish. Live Mix applies to Static Colour, with intensity controlled separately.

Prepared values are session state. A module restart or connection-setting change resets them to RGB white with W/X at zero and Live Mix off. Saved action options remain intact. Use the `mix_*` variables and colour-mix feedback to show prepared levels, pending output and errors.

## Feedback and monitoring

On supplied keys, an orange outline shows a matching condition in fresh reported state. A dashed outline and clock indicate stale or unavailable state. A red warning indicates a reported mode error or a failed command from that button. Check `last_action_delivery` and `last_api_error_message` for the reason; the next accepted command clears the last-command warning. A colour swatch identifies its recall command even offline.

Status refresh is automatic. The refresh actions are for an immediate check, not a requirement for routine monitoring. A button press submits the command; `last_action_delivery` reports the controller's response. API acceptance does not establish physical light output. An HTTP server error during a command means delivery is unknown. Check the controller state before repeating that command.

Use the connection's **Variables** panel for available values. For a connection labelled `Lobby`, useful button text includes `$(Lobby:active_playlist_name)`, `$(Lobby:playlist_item_name)` and `$(Lobby:temperature_c)`. Display names omit extensions; existing filename variables such as `active_file` retain them for expressions and action bindings. Add matching-state or numeric comparison feedback as needed.

Unavailable readings are blank, not zero. Pair measurements with availability and freshness feedback. Temperature, current, voltage and detailed power/fuse states depend on hardware and permissions. Inactive output alone does not establish a fuse fault; watts are estimates where supported, not measured total input power. Choose warning thresholds with the commissioning engineer.

## Offline preparation and several controllers

Save actions with a blank connection address or an offline target. Exact filenames, colours, intensity targets and palette positions remain editable. Choices marked **verify on connection** need checking against the real unit; Aux planning choices do not imply that every model has those ports.

Offline or stale presses fail. Commands that wait more than ten seconds before transmission expire and must be pressed again. Waiting commands are cancelled after connection loss or uncertain delivery and are never replayed automatically. Reconnect, inspect state and deliberately issue the required command again.

Use one connection per controller. Several actions on one button send independent requests, so check each unit's feedback. Controllers do not synchronise playback. For ready-made layouts and offline preparation, see the bundled [example workspace](EXAMPLE.md); import it into a spare profile.

## Migrate an earlier preview

Earlier previews used module ID `advatek-pixlite`; this module uses `advatek-pixlite-mk3`. Migration from beta.18 was tested in Companion 5.1.1. Export a configuration backup and keep the old module installed until the migrated controls have been checked.

In Companion 5.1.1, the offered legacy upgrade can fail with **Unknown version**. For each existing connection, open **Change module version > Advanced Options**, select the new **Advatek PixLite Mk3** module, choose its installed version and save. The old preview appears as **Advatek PixLite Mk3 SHOWTime**. This specific module change was tested with linked presets, copied buttons, expressions and saved connection settings; it is not a general conversion between unrelated modules.

Migration preserves page positions and copied styles. Linked presets receive the new feedback and artwork. It does not rearrange an existing show into the Direct operator layout or send output commands on connection.

## Troubleshooting

- **Not ready:** check the address, port, HTTPS choice, enabled operator account and password. If MAC verification fails, confirm the intended unit and rescan.
- **Scene missing:** check the exact filename, extension and visible storage content. Use **Refresh: Scenes and playlists** after commissioning changes.
- **Level or colour has no output effect:** check the group, intensity authority and commissioned output policy. Device configuration stays outside Companion.
- **Monitoring or palette unavailable:** the role, model or firmware may not expose the read. Do not substitute administrator credentials.
- **Unknown delivery:** inspect current controller state before repeating a command; a timeout can leave its outcome uncertain.

For a module problem, include versions, action/options and a redacted log excerpt in the [issue tracker](https://github.com/bitfocus/companion-module-advatek-pixlite-mk3/issues). Remove credentials and installation-specific details before sharing configuration exports.
