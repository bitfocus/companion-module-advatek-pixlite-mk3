# Contributing

Use Node 26 and the pinned Yarn version. Install with `yarn install --immutable`, then run `yarn lint`, `yarn lint:format`, `yarn typecheck`, `yarn check:module`, `yarn workspace:check` and `yarn package`. Checks run locally. Do not add, enable or trigger hosted GitHub automation for this project.

Operator instructions belong in [companion/HELP.md](companion/HELP.md). Keep architecture, protocol details and artwork maintenance in their [contributor references](docs/README.md). Describe current behaviour and tested limits without duplicating development history.

Keep action, option, feedback and preset IDs stable. The module ID is `advatek-pixlite-mk3`. This initial submission has no legacy IDs or upgrade scripts. Future changes to persisted data require a migration and a saved-configuration test in Companion; retain published upgrade scripts in order.

Preserve operator-only access, independent controller instances, bounded queues and explicit stale or unknown state. Never replay commands after reconnect. Keep credentials out of logs, examples and exports. Automated test suites, fixtures, mock servers, browser profiles and audit tools are maintained locally and must not be committed. The [developer guide](docs/DEVELOPMENT.md) explains these invariants.

Run `yarn workspace:build` after changing the preset catalogue or module version. Run `yarn workspace:check` before packaging to reject stale workspace data. `yarn build` cleans and compiles the module; `yarn build:main` compiles without cleaning.

For artwork changes, verify both themes at 72 pixels and run the documented [artwork checks](assets/README.md). Font regeneration requires a separately licensed font; normal builds, exports and tests use the committed artwork and require no font installation.

Before distribution, review the exact diff, build an archive from a clean checkout, inspect its contents and test that archive in Companion. Record supported model, firmware, platform and measurement scope in the [test matrix](docs/LOCAL-TESTING.md). Simulator and API readback results do not establish physical output behaviour. A source contribution, release tag and Developer Portal submission are separate steps.
