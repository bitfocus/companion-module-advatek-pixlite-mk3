# SHOWTime example workspace

Use these layouts as a starting point for commissioned PixLite Mk3 controllers in Companion 5.1.1. The layouts include dark and light presets, playback, intensity, RGB and white-channel recalls, monitoring and offline preparation.

1. Install the matching Advatek PixLite Mk3 module in Companion.
2. Import `SHOWTime.companionconfig` from this folder through **Import / Export**. Use a spare profile or export your current setup first: a full import can replace existing connections and buttons. The module package also contains the same layout as `EXAMPLE.companionconfig`.
3. Open the `Example_A`, `Example_B` and `Example_C` connections. Enter the address and operator password, then choose HTTP or HTTPS for each controller you want to use. Normal ports are automatic; Advanced provides overrides. Addresses and credentials are deliberately blank; unused connections can stay offline.
4. Choose a Direct page for everyday operation or a catalogue page for more controls. Select **Press** in the Buttons toolbar to operate the keys.
5. Copy or convert a scene/playlist template to an editable button, then select its content in the action. You can enter an exact filename, including `.scn` or `.pl`, before connecting. Choose **Use** in the dropdown to save a manual filename.

If linked buttons appear blank after import, restart Companion once and let the connections finish loading before checking their images or exporting the workspace.

**White channels:** the Direct pages put White RGB, White W and White X together. White RGB uses the RGB channels only. W is available for RGBW and RGBCCT; X requires RGBCCT (RGBWX). Preset groups follow the connected controller's pixel type. A clock and dashed outline mark a channel as unavailable; no warm/cool order is assumed. Unsupported white-only recalls reject without changing output. Both W/X actions can be prepared offline.

The `Example_Offline` connection demonstrates editable scene, playlist, colour, Aux intensity and palette actions. Saving actions offline does not queue them for later playback. Monitoring updates automatically when a configured controller connects.

No controller address, password, startup trigger or automatic discovery action is included. The workspace does not create content or change controller settings. Each connection controls one device; controllers do not synchronise playback. See the module help for connection details, intensity priority and feature limits.

The **mix dark** and **mix light** pages put channel increases above the dial keys and decreases below them. Dial keys display prepared levels; turning adjusts by 1% and pressing sets the channel to zero. Prepare stays local until Recall. Live Mix loads the reported Static Colour before enabling immediate dial changes and turns off on mode or connection changes. The controller remains commissioned outside Companion.
