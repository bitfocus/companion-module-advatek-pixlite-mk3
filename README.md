# companion-module-advatek-pixlite-mk3

This community integration uses the controller's HTTP API to operate existing PixLite Mk3 SHOWTime content and report device state. It is intended for operators using a system that has already been configured.

## Features

- Discover controllers on the local network using Advatek's UDP discovery protocol (ADAR).
- Select existing scenes and playlists, pause or resume playback, restart an item and move through a playlist.
- Switch to live data, freeze the current frame or blank outputs.
- Set or adjust pixel intensity and supported auxiliary output intensity.
- Recall static RGB, RGBW and RGBCCT colours, with white-channel controls matched to the controller configuration.
- Monitor playback, connection state and statistics, including power telemetry on the Advatek A4-S, through variables and button feedback.
- Prepare commands offline, use dark or light button presets, and customise buttons with the included image library.

Use one Companion connection per controller. Multiple connections can run on the same network; controller playback remains independent. Keep Companion and the controllers on the same subnet for local communication. ADAR discovery can cross subnets where multicast routing is configured.

Commissioning, recording, trigger creation and controller settings remain in Advatek PixLite software.

**Status:** source contribution in preparation for Bitfocus review.

[MIT licence](LICENSE)
