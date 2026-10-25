# Button artwork exports

The [saved dark and light sets](../assets/button-images/README.md) contain the exact transparent 72 x 72 PNGs embedded in the module. Each theme has 78 captioned controls and 36 icon roles in four states, with contact sheets and per-file SHA-256 manifests.

Run yarn artwork:export --save to refresh the checked-in sets. Without --save, exports go to the ignored .local/button-exports/ folder. Exporting saved artwork needs no font installation. Regenerating captions requires the licensed font described in [artwork sources](../assets/README.md).

Export checks decode images, verify dimensions and transparency, and detect empty icon or caption regions. These software checks do not qualify physical surface legibility.

Import module presets to obtain actions and feedback; a PNG alone only changes appearance.
