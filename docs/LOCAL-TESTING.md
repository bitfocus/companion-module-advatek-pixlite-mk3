# Compatibility and testing

Updated **25 October 2026** for **0.1.0-beta.34**.

| Area                  | Verified scope                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local checks          | Node 26.12.1, Yarn 4.18.1, module API 2.1.3 and tools 3.1.1 on Windows. Lint, module checking, packaging and 140 offline regression tests passed. Test tools and raw evidence stay outside the repository.                                                                                                                     |
| Paired hardware       | A4-S and E16-S, firmware 3.15.0 and API 1.9, together in Companion 5.1.1. Beta.34 verified staged colour recall, W/X controls, Live Mix, Load Output, rotary events, unsupported-channel rejection and independent control against the live product dashboards.                                                                |
| Commands and feedback | Playback, RGB/W/X recalls, pixel and auxiliary intensity, priority, fades, live input, reconnect and independent control were exercised. The operator confirmed the connected pixel and auxiliary loads. A 14-press beta.32 burst produced no Companion callback timeouts; expired commands were rejected before transmission. |
| Saved configurations  | Beta.34 retained four connections, 32 pages, 704 controls and 564 resolved linked presets across restart, with no unexpected differences. Earlier-preview migration and white-channel expression preservation were also exercised.                                                                                             |
| Discovery and HTTPS   | Actual ADAR selection populated each controller's address and MAC. Advatek HTTPS on port 4443 verified both identities. Wrong MAC, password and certificate-profile cases rejected safely. Saved custom connection fields and secrets survived discovery and migration.                                                        |
| Browser layout        | Edge and Chrome at widths from 320 to 1920 pixels, plus Chrome at 240 pixels. Discovery addresses and MACs stay on one line; narrow layouts had no page-wide horizontal overflow. Empty states, firmware warnings, expired selections and keyboard focus were checked.                                                         |
| Artwork and example   | Both themes include 912 transparent 72 x 72 PNGs. Saved images match the embedded bytes. The example starts with blank addresses and credentials and contains no simulator.                                                                                                                                                    |

Complete configuration and media comparisons apply to the beta.32 run. Beta.34 compared fresh and restored visible dashboard state, including colours, operating modes, intensity and displayed media. Both dashboards matched their starting state after disconnection. Test addresses were cleared and the isolated test processes stopped.

## Reproduce a release check

Run the checks in [Contributing](../CONTRIBUTING.md), then import the exact packaged archive and [example workspace](../examples/showtime-demo/README.md) into a disposable Companion profile. Record the source revision and archive hash. Compare saved options and bindings before and after migration and restart, including copied buttons, expressions and linked presets.

Test controllers together, compare Companion feedback with their own web interfaces, observe the connected loads and preserve the original configuration, output state and media. Retest affected behaviour after fixes. An offline pass does not establish hardware behaviour.

See the [HTTPS guide](HTTPS.md) for certificate choices and [operator help](../companion/HELP.md#migrate-an-earlier-preview) for the explicit migration route from earlier previews.

## Scope

Hardware observations apply to the identified builds and controller configurations. The local suite also checks colour-mix cancellation, coalescing and per-instance isolation. Each release records its exact archive and hardware results separately. Keep test tools and private bench evidence outside the module contribution.

Controllers do not synchronise playback. Telemetry is controller-reported or estimated data, without independent optical or electrical measurement claims.
