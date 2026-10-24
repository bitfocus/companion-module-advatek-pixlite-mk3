# Advatek PixLite Mk3 SHOWTime

This community integration is intended for operators controlling PixLite Mk3 units that have already been commissioned. It uses the controller's HTTP API for existing SHOWTime content and reported state, with ADAR for device discovery.

## Development status

This repository currently contains the Companion template implementation. The controller implementation is being validated separately and will be added after its hardware and browser release gate passes. The completed metadata does not constitute a released module.

## Intended operation

Use one Companion connection per controller. Playback is independent between controllers. Commissioning, recording, trigger creation and controller settings remain in Advatek PixLite software.

See the [module overview](https://github.com/bitfocus/companion-module-advatek-pixlite-mk3#readme) for the intended feature set. Report questions through the [module issue tracker](https://github.com/bitfocus/companion-module-advatek-pixlite-mk3/issues).
