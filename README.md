# companion-module-advatek-pixlite-mk3

Control a commissioned PixLite Mk3 from [Bitfocus Companion](https://companion.free/), the control software used to build operator panels for live production and installations.

The module discovers controllers with ADAR, plays existing SHOWTime scenes and playlists, controls playback and intensity, recalls static colours and monitors reported state. Use one connection per controller. Playback across controllers is independent.

Start with the [operator help](companion/HELP.md) for connection settings, presets and troubleshooting. Commissioning, recording, content editing and controller settings remain in Advatek software. See [compatibility and testing](docs/LOCAL-TESTING.md) for the tested scope.

## Develop and test

Use Node 26 and the pinned Yarn version:

```sh
corepack enable
yarn install --immutable
yarn lint
yarn check:module
yarn package
```

Import the resulting `.tgz` through **Modules > Import module package** for local testing. Packaging does not publish the module. The [working example](examples/showtime-demo/README.md) provides Direct operator layouts, both artwork themes and offline preparation for up to three controllers. Controller addresses and credentials start blank. Import it into a disposable Companion profile.

[Contributing](CONTRIBUTING.md) explains the local checks and compatibility rules. The [documentation index](docs/README.md) links to architecture and API mappings. [Saved button images](assets/button-images/README.md) include both themes and every state. Report reproducible problems in the [module issue tracker](https://github.com/bitfocus/companion-module-advatek-pixlite-mk3/issues), with versions and redacted logs.

Source code is [MIT licensed](LICENSE). Third-party artwork retains its notices. Advatek marks and licensed font software retain their separate rights; font software is not distributed.
