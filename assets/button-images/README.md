# Saved button images

[Dark](dark/) and [light](light/) each contain 456 transparent 72 x 72 PNGs: 78 captioned controls and 36 icon roles, with idle, active, stale and fault states. Each folder includes contact sheets and a SHA-256 manifest.

These are the exact images embedded in the module. Use Companion's presets for working actions and feedback; importing an image alone only changes a button's appearance. Dynamic scene names and values use Companion text.

Regenerate from the repository root with `yarn artwork:export --save`. The export checks each image against the module. See [artwork rights and sources](../README.md) before reusing assets.
