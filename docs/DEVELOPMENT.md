# Contributor guide

Use Node 26 and `yarn install --immutable`. Keep code typed and protocol handling independent of Companion. Run checks locally; do not add, enable or trigger GitHub Actions.

```sh
yarn lint
yarn check:module
yarn artwork:check
yarn artwork:export
yarn package
```

The package includes a generated [example workspace](../companion/EXAMPLE.md).
Run `yarn workspace:build` after changing the preset catalogue, example instructions or module version. `yarn workspace:check` verifies the repository and packaged copies.
All tests, fixtures, simulators, browser profiles and audit tools stay outside the repository.

## Discovery interface

Edit `ui/discovery/index.html`, `main.ts` and `style.css`. `scripts/build-discovery-page.mjs` uses Vite at build time to inline minified JavaScript, CSS and base64 SVGs into `src/discovery/page.generated.ts`. The module serves that string through Companion's HTTP handler. No Vite server, external assets or frontend framework runs with the module. The build rejects extra chunks or assets so the page cannot silently acquire another hosting requirement.

`src/discovery/page.ts` inserts the per-instance nonce and encoded return link. Device names are added as text, selections require the current scan generation, and discovery never changes controller settings. `src/pixlite/version.ts` compares firmware versions; the client independently requires API v1.9. Keep comments focused on these boundaries and leave generated files to the build.

Artwork regeneration/checking requires the separately licensed Forma DJR Display Regular font, supplied through `ADVATEK_FONT_REGULAR`. The module build, runtime and PNG export do not require the font. See [artwork](../assets/README.md).

## Structure

| Directory           | Responsibility                                                    |
| ------------------- | ----------------------------------------------------------------- |
| `src/pixlite`       | Typed model, HTTP transport, operator authentication and commands |
| `src/discovery`     | ADAR packet validation, bounded scanner and host-served page      |
| `src/state`         | Reported values, freshness and availability                       |
| `src/companion`     | Generated artwork, media captions and internal re-exports         |
| `assets`, `scripts` | Editable sources and reproducible artwork/export tools            |

Actions, feedback, presets, connection fields and upgrade scripts are split into named top-level files under `src/`, following the module template. `tsconfig.build.json` controls emitted output; `tsconfig.json` supplies editor/type-check settings. `yarn dev` watches sources. `lint` uses Bitfocus shared ESLint rules as well as TypeScript and formatting. `build` also checks the generated workspace; use `workspace:build` to regenerate it after a version or preset change.

## Invariants

- Authenticate only as `oper`. Never add administrator fallback, settings/file writes, recording, authoring, trigger creation, recovery or a raw-request action.
- Keep public model validation ahead of displayed identity. Reject invalid envelopes, HTTP/API failures and stale or mismatched responses.
- Keep credentials out of logs, exported examples and discovery HTML. Use Companion secrets. Validate HTTPS certificates.
- Distinguish command acknowledgement, reported matching state and physical output. Missing telemetry must not become a valid zero.
- Keep queues, requests, caches, discovery sockets and subscriptions instance-local. Cancel old targets and uncertain pending commands.
- Persist exact filenames and stable option/preset IDs. Preserve offline/custom values through definition refreshes. Add upgrade scripts for persisted schema changes.
- Update the operator guide, API/feedback map and changelog when behavior changes. Describe implemented behavior and explicit limits, not proposals as supported features.

## Review and qualification

Test meaningful failures: malformed/API-error responses, operator refusal, uncertain write delivery, cancellation, stale caches and retargeting. Exercise at least three independent simulator clients. Check action/preset option consistency and dark/light feedback parity.

Review every icon at 72 px in both themes, with stale/error badges and real media captions. A label is required where the icon alone cannot express a port, slot, percentage or channel. Confirm exact exported bytes and retain attribution.

Build an archive and inspect its members before import. Keep local profiles, private API source documents, device addresses, screenshots containing secrets, font software and build outputs out of Git. Physical qualification must identify the host, model, firmware/API and measurement scope. See [testing](LOCAL-TESTING.md).
