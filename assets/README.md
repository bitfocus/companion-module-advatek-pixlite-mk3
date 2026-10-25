# Button artwork

Both themes use the same 24-unit icon family, 72 x 72 button canvas, captions and state rules. Dark keys use charcoal `#353436` with white foreground; light keys reverse them. Orange `#F15A2C` borders indicate matching reported state. Fixed labels use Forma DJR Display Regular.

There are **78 fixed-caption designs** and **36 icon roles** in each theme, with idle, active, stale and fault variants: **912 PNGs** in total. Every implemented action has themed starter artwork. [Icon semantics](../docs/ICONS.md) explains the symbols and cases that require labels.

## State and meaning

- Idle: neutral outline. It does not prove the command is applicable.
- Active: orange outline, driven by matching reported state where meaningful. Relative arrows have no persistent active state.
- Stale: dashed outline and clock. Colour recall circles retain their configured colour.
- Fault: red outline and white warning triangle on a red badge, for a reported mode error. Semantic fault red is `#B42318`.

RGB swatches identify the recall command, not sensed light output. Palette slots use a neutral palette symbol because the slot number does not predict its colour. W/X labels describe configured channels, not an assumed warm/cool order. Fixed port, channel, slot and percentage labels are part of the control's meaning.

Scene icons use play-circle; recorded-item navigation combines that symbol with previous/next markers. Playlist uses a list. Media refresh combines a list and refresh arrow; status refresh uses a single refresh arrow. Scene and playlist captions follow each button's action filename through native Companion text. They omit the extension and shorten the display only; full filenames remain in actions.

## Sources and rights

The base SVGs are from [PrimeIcons 7.0.0](https://github.com/primefaces/primeicons/tree/7.0.0) by PrimeTek, with its [MIT notice](primeicons/LICENSE). Composed/original operator outlines live in `operator-icons/`; `scripts/compose-icons.mjs` generates them. All use the same grid and approximately 1.5-unit outline weight. The mapping is in `artwork.json`, with captions in `preset-labels.json` and action coverage in `action-artwork.json`.

Colours and typography follow Advatek External Brand Guidelines v1.2 (2025). Advatek marks remain Advatek's property. Font software is separately licensed and is not distributed. Caption regeneration requires a licensed Forma DJR Display installation.

The editable SVG sources and JSON manifests above generate the deployable images. The [saved PNG sets](button-images/README.md) include both themes and every state.

The Companion-hosted discovery page embeds `discovery-logo.svg` and the PrimeIcons search icon as base64 SVGs. `scripts/build-discovery-page.mjs` embeds these during the Vite build. The page uses locally installed fonts when available and makes no external asset requests.

## Generate and export

Set `ADVATEK_FONT_REGULAR` to a licensed `FormaDJRDisplay-Regular.otf` before `yarn artwork:generate` or `yarn artwork:check`. The expected font SHA-256 is `43fac2b4b7c872070e64ada3ba4ca33d0478aa055c8c3e6779b00ae066f98ac5`. The check rejects a different font instead of silently substituting it.

`yarn artwork:export` exports exact embedded module PNGs without needing a font installation. Both themes are separate preset sections. Linked presets follow their source; editable copies retain their configuration. Changing a copied Aux target requires changing its fixed caption too.

See [export instructions](../docs/ARTWORK-EXPORTS.md) for manifests and downloadable bundles. Monitoring/discovery icons are templates for existing feedback and variables; they do not add commands.
