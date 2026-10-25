# Runtime architecture

`src/main.ts` owns one HTTP client, ADAR scanner and media-label registry per Companion connection. Reconfiguration destroys the previous client and cancels scans. Credentials, requests, state, media, timers and subscriptions are instance-local.

## HTTP and command lifecycle

`src/pixlite/client.ts` validates the device identity and API range through `/ver`, authenticates only as `oper`, checks any configured expected MAC through authenticated constants, then loads status and optional context. Requests use a fixed read/operator allowlist. There is no generic request action or settings-write path.

Responses must have HTTP 200, valid JSON objects, a matching response type/request ID and no API error. Error replies are correlated before their error is interpreted. Polling reads and action requests share one transport queue per connection, so only one HTTP exchange runs at a time. Each active request has a 3 second absolute deadline and a 2 MB response limit. Errors redact the password, its authentication hash and credential-bearing URLs. HTTPS uses certificate validation, with an optional supplied CA.

TLS errors use fixed diagnostics without peer-supplied certificate details. Standard HTTPS retains Node's hostname/IP, purpose and CA checks. The explicit Advatek profile requires an expected MAC and validates the observed certificate shape against the pinned Advatek root with PKI.js and Node WebCrypto. Its private TLS socket is not handed to HTTP until verification succeeds. Each request has a separate agent; cancellation closes pending and active sockets. There is no automatic HTTP fallback. See [HTTPS](HTTPS.md) for the verification contract and root provenance.

Actions are serialized per connection, with at most 32 submitted commands including the in-flight command. A monotonic ten-second deadline rejects expired presses before transmission, including after identity verification. Offline/stale submissions reject immediately. Status failures invalidate waiting commands before the transport queue advances; the command session and freshness are checked again at dispatch. For a configured expected MAC, an authenticated identity read and the mutation share one queue slot. Failed identity verification rejects without sending the mutation. Commands are not replayed after recovery. An accepted command is followed by a status refresh unless its session has been superseded. HTTP server errors during a mutation leave its delivery unknown. Explicit client errors remain rejected. An acknowledgement is separate from matching reported state and physical output.

Action callbacks acknowledge submission without waiting for network delivery. The client handles asynchronous failures through command feedback and a sanitized warning log. Relative intensity reads the current programmed factor before applying a bounded step. This is serialized within one instance, not an atomic increment across other API clients. No cross-controller queue, clock or rollback is provided.

## Polling and optional reads

The next status poll starts 1 second after the previous cycle finishes. Initial jitter is 0..249 ms; reconnect delay is 4 seconds. Telemetry is requested when at least 2 seconds old; media/context when at least 30 seconds old. These are application defaults, not timing guarantees.

Optional permission/unsupported-path errors suppress that read until reconnect. Other failures can retry during polling. A failed media refresh retains the last list and timestamp. The state view uses freshness thresholds of 3.5 seconds for status, 6.5 seconds for telemetry and 65 seconds for media. Missing or non-finite numeric values are empty strings, not zero. Port-variable generation requires an integer count within the supported 1..16 range.

`src/state/view.ts` derives fresh values without mutating the controller snapshot. Each reconnect clears device-derived caches and timestamps; readiness returns only after initialization and a new status read. A per-instance 500 ms publication timer expires variables and existing feedback even while a network request is pending. It makes no controller requests and is cleared on reconfiguration and destruction. Power state, active-power flags and estimated watts remain distinct. A watt estimate requires fresh same-output current and supported voltage.

## Companion definitions

`src/actions.ts`, `src/feedbacks.ts` and `src/presets.ts` define actions, feedback and themed presets. `src/config.ts` owns connection fields; `src/connection.ts` resolves the selected protocol and automatic port before creating a client. Port `0` is stored as automatic, then resolves to HTTP 80 or HTTPS 4443. The selected Connection choice takes precedence over legacy `secure` and `tlsProfile` fields. `src/upgrades.ts` preserves effective endpoints and certificate policies when migrating saved connections.

Persisted media IDs are exact filenames, not list positions. W/X, auxiliary planning targets and all twelve palette slots remain configurable offline; execution validates the connected device. Rebuilding definitions preserves saved option IDs.

`src/companion/media-labels.ts` watches resolved action filenames, isolated by connection and control ID. A local `media_name` value feedback supplies a caption without executing an action. Active feedback uses the same selection. Captions omit the extension and shorten only their display text. Multiple distinct media actions show `Multiple media`. Custom user styling is not rewritten.

The command queue retains the originating control ID with its last delivery result. Supplied keys use that ID for rejection/unknown-delivery feedback, so a failure on one palette key does not mark every palette key. Reconnect retains that outcome; reconfiguration creates a new client. The Pause/Resume preset uses boolean feedback to select its artwork from reported file pause state. Missing pause state does not count as running file playback.

## Discovery

`src/discovery/adar.ts` creates an ephemeral UDP socket for each explicit scan. It joins the response multicast group on the selected IPv4 interface, sends bounded multicast/broadcast rounds and caps results at 50. Filtering runs before results reach the UI. Cancellation closes the socket and rejects old scan generations.

`src/discovery/page.ts` serves a page without external assets or device credentials. Mutation routes require a per-instance nonce and current scan membership. Selection updates only that Companion connection's target. Companion is responsible for access control to its own web interface.

## References

Implementation protocol reference: Advatek Lighting, _PixLite Mk3 API v1.9_, V20260617 (17 June 2026), and _Advatek Discovery and Recovery Protocol V1.0_ (22 October 2021). Protocol specifications are not bundled. Obtain documentation through [Advatek](https://www.advateklighting.com/contact-us).

Host contracts: official [Companion module API](https://github.com/bitfocus/companion-module-base) 2.1.3 and module tools 3.1.1. See the lockfile for exact dependencies and [testing](LOCAL-TESTING.md) for evidence limits.

`ColourMixer` owns per-connection preparation and defaults Live Mix off. It retains at most one executing live write plus the latest local edit. Epoch guards invalidate unsent colours after stop/reset, and the client checks them after status refresh and pinned identity verification. Other mode-changing module actions stop Live Mix before they enter the write queue. No staged action replays automatically after reconnect.
