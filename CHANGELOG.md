# Changelog

## 0.1.0-beta.34

- Show only the relevant level or step field for colour-mix adjustments.

## 0.1.0-beta.33

- Add offline colour preparation, channel adjustments, Recall and explicit Live Mix.
- Add controller-aware white-channel mixer presets and rotary actions in both themes.
- Coalesce live dial edits and cancel unsent colours when Live Mix stops or the connection changes.
- Add colour-mix feedback, variables and example pages.

## 0.1.0-beta.32

- Acknowledge action submission promptly and report controller acceptance or rejection through delivery feedback, avoiding Companion callback timeouts during queued operation.

## 0.1.0-beta.31

- Reject commands that wait more than ten seconds before transmission, including time spent verifying device identity.

## 0.1.0-beta.30

- Keep discovery controls stable during background refresh and disable expired scan selections.
- Retain discovery failure messages until the next scan.
- Stack controller details on small screens and keep controls within the viewport.

## 0.1.0-beta.29

- Match HTTPS diagnostics to the simplified Connection and Advanced fields.
- Use plain comparison labels for feedback thresholds.
- Clarify automatic port resolution and saved connection compatibility for contributors.
- Add an example-workspace note for linked images that remain blank after import.

## 0.1.0-beta.28

- Simplify connection settings with one HTTP/HTTPS choice and automatic normal ports.
- Keep port overrides and custom CA certificates under Advanced, with shorter field labels.
- Preserve existing endpoints, certificate policies, actions and secrets during configuration migration.

## 0.1.0-beta.27

- Build the self-contained discovery page with Vite and simplify its empty state.
- Show a firmware update warning only for devices older than v3.15.0, and require API v1.9 before connecting.
- Add the ADAR UDP port to connection help and retain editable, typed UI sources.

## 0.1.0-beta.26

- Embed Advatek branding and discovery icons in the Companion-hosted page.
- Fill the controller address and MAC from discovery, with optional Advatek HTTPS defaults for new connections.
- Preserve custom connection settings and operator passwords when selecting a controller.

## 0.1.0-beta.25

- Add an explicit Advatek HTTPS certificate profile with a pinned device root and exact MAC verification before HTTP is released. Retain standard verification for existing connections.
- Match the Bitfocus template's Node 26 runtime, named maintainer and issue-tracker metadata.
- Preserve specific connection configuration errors during background status publication.
- Refresh the offline example and consolidate current compatibility information.

## 0.1.0-beta.24

- Report an offline button press as rejected without queueing it or replacing an unresolved delivery warning.

## 0.1.0-beta.23

- Align package and module descriptions and declare the supported Yarn engine.
- Correct the example workspace wording in operator help and document the hardware/browser release gate.

## 0.1.0-beta.22

- Name RGBCCT white controls explicitly and mark unavailable W/X keys from the commissioned pixel type. Keep both channels editable offline.
- Add White RGB, W and X to both Direct example layouts. Start every example connection without an address or credentials.
- Keep all automated tests, fixtures, simulators and audit tools local-only; retain required build scripts.

## 0.1.0-beta.21

- Keep invalid connection fields marked as configuration errors during status publication.
- Bound reported pixel-port counts and omit non-finite monitoring values.
- Treat HTTP server errors during commands as unknown delivery and cancel waiting writes.
- Validate fonts and labels before replacing generated artwork sources.

## 0.1.0-beta.20

- Promote the configured W/X white-channel controls beside RGB presets and add a dedicated colour group. Keep both channels available for offline preparation.
- Reject unsupported white-only recalls without changing output, and stop marking them active on black output.
- Put the white-channel icons beside RGB white in the example catalogue while retaining saved preset IDs.

## 0.1.0-beta.19

- Include saved dark/light PNG sets and a standalone simulator example with setup instructions.
- Shorten maintainer comments while retaining compatibility and protocol invariants.

- Use the canonical `advatek-pixlite-mk3` identity, with `advatek-pixlite` retained for saved-configuration migration. Preserve existing action, feedback, option and preset IDs and upgrade scripts.
- Adopt pinned Yarn and check workspace freshness from the build command used by Bitfocus packaging.
- Show Pause or Resume on the toggle key from reported file playback state. Stop treating playback without a pause state as running file playback.
- Show command rejection or uncertain delivery on the initiating preset button.
- Add Direct operator workspace pages in both themes, with a vertical intensity column and a reported level display.
- Update public help and contributor references and remove completed development-planning records from the source tree.

## 0.1.0-beta.18

- Report fixed, redacted TLS diagnostics for trust, identity, validity and purpose errors without weakening verification.
- Add trusted and rejected certificate fixtures and document the observed firmware 3.15.0 HTTPS compatibility limitation.

## 0.1.0-beta.17

- Cancel waiting commands before a failed or invalid status response releases the HTTP queue. Recheck connection freshness and the command session at dispatch.
- Verify a pinned device's MAC immediately before each output command. Identity failures reject without sending the command and cancel queued commands.
- Clear device capabilities, telemetry, media and inspected metadata on reconnect. Publish Ready only after initialization and a fresh status read.
- Refresh published variables and feedback every 500 ms, independently of network progress, so stale state expires on the control surface.

## 0.1.0-beta.16

- Hide scene and playlist extensions in selection lists and preset names. Keep exact filenames in saved bindings and API requests, with scene/playlist context in mixed lists.
- Add extension-free display variables for playback, playlist items and inspected scenes. Use display names in bundled monitoring buttons while preserving existing filename variables.

## 0.1.0-beta.15

- Match static-colour feedback against the commissioned RGB/RGBW/RGBWX channels, including firmware replies padded with unused channel values.
- Explain the same-subnet setup for local control and distinguish discovery visibility from HTTP reachability.
- Serialize HTTP reads and commands on each connection, following the API's request sequencing guidance.
- Check response type and request ID before interpreting API errors. Mismatched write replies remain unknown delivery.
- Reject malformed API version ranges and ADAR responses with missing or non-boolean recovery/web-interface flags.
- Add specification-based regression tests for transport ordering, response correlation, version negotiation and ADAR packets/sequencing.

## 0.1.0-beta.14

- Bundle a reproducible Companion validation workspace with three loopback connections, both artwork themes, automatic monitoring and editable offline examples. Reject stale workspace files during packaging.
- Align source layout with the Bitfocus TypeScript module template: separate actions, feedback, presets, connection fields, schema and upgrades. Preserve persisted IDs and the module entrypoint.
- Add split build/type-check configuration, shared Bitfocus ESLint checks and the official module checker command.
- Document in-app help, developer documentation, local module locations and the future Developer Portal submission route. Keep all preparation local.

## 0.1.0-beta.13

- Reject offline/stale command submissions immediately, cap each connection's command queue at 32 and cancel pending commands after connection loss or uncertain delivery.
- Describe expected MAC verification accurately for manual as well as discovered targets.
- Match only transmitted colour channels in static-colour feedback and respect the selected storage comparison operator.
- Make discovery-page polling sequential, preserve selection confirmation and explain the saved connection settings retained on selection.
- Consolidate current setup, API, feedback, compatibility and artwork documentation. Remove obsolete workshop instructions, internal links and superseded artwork masters from the release tree.

## 0.1.0-beta.11

- Keep RGB recall swatches coloured in both themes and all states, including offline/stale. Preserve clock/dashed and mode-error badges.

## 0.1.0-beta.10

- Add automatic scene/playlist captions driven by the configured action filename, with matching feedback using the same selection.
- Use play-circle for scenes/recorded navigation and a list/refresh composition for media refresh.
- Expand themed presets for auxiliary/all-output intensity, priority, W/X, palette slots and media/metadata templates.
- Preserve complete offline action choices and saved RGB/W/X values; use controller-selected colour channels at execution.
- Add A4-S API/readback and Companion 5.1.1 bench coverage, without claiming electrical/optical qualification.

## 0.1.0-beta.1

Initial operator-only HTTP client, media/transport/mode/intensity/static-colour actions, feedback, variables, optional telemetry and bounded ADAR discovery. One independent target per Companion connection, with local simulator/failure tests.
