# HTTPS certificates

PixLite Mk3 normally serves HTTPS on port **4443**. Choose the connection type in Companion; discovery fills the controller address and expected MAC. Its optional HTTPS defaults also select port 4443 and the Advatek profile; the operator password is preserved.

## Advatek device certificate

Choose **HTTPS** and supply the exact **Device MAC**, or select the controller through discovery. The normal port is automatic. The module validates the device's MAC-named certificate against its pinned Advatek root before releasing the TLS socket to HTTP. No API request or operator credential is sent before that gate passes.

The observed firmware 3.15.0 leaf has a MAC common name, no subject alternative name, Any Extended Key Usage and no basic Key Usage. This profile accepts only that shape. It checks signatures, dates, issuer authority, path lengths, names, policies, critical extensions and key strength using PKI.js with Node WebCrypto. TLS is at least 1.2, renegotiation is disabled, and each connection is verified independently. There is no HTTP fallback or certificate learning on first connection. Offline chain validation does not establish current revocation status.

## Standard certificate

Choose **HTTPS (custom certificate)** for Node's ordinary hostname/IP, purpose and trust checks. Supply **CA certificate** under **Advanced** when the installation requires a private issuer. Migrated HTTPS connections without a saved certificate policy retain standard verification through this choice. Adding a CA does not fix a purpose or hostname mismatch.

## Root provenance

The public root was extracted from Advatek Lighting's signed [Assistant 3 installer, version 1.1.4](https://assistant.advateklighting.com/releases/Advatek%20Assistant%203%20Setup%201.1.4.exe). The installer was not executed for extraction.

- Installer SHA-256: `3243262fe031d65121f09fd459aaf27b9d515f4e52be4192879885c339f14752`.
- Signer: Advatek Lighting; Authenticode thumbprint `F738505AE2B73D697BAEF3DC805C266AB35E863C`.
- Root DER SHA-256: `221b86c50a93c056979c28e7822fd30c58c01e48b7a34b5f8c4ab78d58510344`.

The module pins that root; it does not download replacements. A different certificate profile or root needs separate review and qualification. See [compatibility and testing](LOCAL-TESTING.md) for completed checks and limits.
