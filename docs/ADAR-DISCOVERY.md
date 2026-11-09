# ADAR discovery

Open **Find controllers** in the connection settings. Choose the IPv4 interface on the Companion computer and select **Scan network**. The browser requests a scan from Companion; it does not send UDP itself.

Results show name/model, address, MAC and firmware. Select **Use controller**, then return to Companion and reopen connection settings before making further edits. Selection saves the discovered address and expected MAC. **Use HTTPS defaults** selects HTTPS with the Advatek certificate and automatic port 4443. It starts checked for a new connection with untouched defaults, and unchecked for an existing or customised connection. The operator password is always preserved. Unsaved edits in another settings tab are not part of the selection.

For a normal local connection, put the Companion host and controller in the same IPv4 subnet. ADAR visibility does not prove HTTP reachability: a discovered controller can have an address outside the host's subnet. Routed connections require a suitable route and firewall rules. This module does not change controller addresses.

The HTTP connection separately authenticates as `oper` and verifies the expected MAC through device constants, both on connection and immediately before output commands. If that check fails, the command is not sent. Discovery does not establish operator authorisation. Recovery devices and devices without a web interface cannot be selected. Entering a host manually remains available; an unpinned manual address does not have the same MAC check.

## Network behavior

The empty result reads **No PixLite devices found**. A discovered controller older than firmware v3.15.0 shows an update warning. Unknown version strings are not labelled as old; connection still requires an advertised API v1.9 endpoint. Older known firmware is rejected before operator authentication.

ADAR discovery uses the `DiscProt` signature, request `0x1201`, response `0x2102` and wire version `0x0101`. Requests go to `239.255.251.1:49151`; replies use `239.255.251.2` at the request's ephemeral source port. Limited broadcast fallback uses `255.255.255.255`. Multi-byte fields are big endian.

Each scan uses its own socket and multicast TTL 255. Multicast uses the selected interface; limited-broadcast fallback follows the operating system's routing and is not pinned to that interface. Qualification on hosts with multiple active interfaces remains outstanding. It sends at most six 500 ms rounds and exposes at most 50 eligible devices. A capped scan is marked partial. Results are deduplicated by normalised MAC. Concurrent connections may discover the same devices but retain separate targets and scan generations.

Multicast/broadcast depends on the host firewall, network adapters and routing. TTL does not create VLAN routing. A scan returning no results is not proof that no controllers exist. Try the intended interface or enter the device address manually. If DHCP changes an address, rescan and deliberately select the expected unit; no automatic reassignment is performed.

## Scope and security

Only supported identities are exposed. Header, JSON, MAC and IPv4 validation runs before display. The page contains no device password and loads no external resources. POST mutations require a per-instance nonce; selections must belong to the current scan. Protect Companion's administration interface on your network.

Only discovery messages are sent. The module cannot change network settings, recover devices or upload firmware. Selection changes Companion configuration only.

Reference: Advatek Lighting, _Advatek Discovery and Recovery Protocol V1.0_ (22 October 2021). Companion integration uses the official [module HTTP handler](https://companion.free/for-developers/module-development/connection-advanced/http-handler/). See [qualification limits](LOCAL-TESTING.md).
