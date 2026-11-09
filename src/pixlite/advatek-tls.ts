import https from "node:https";
import tls, { type DetailedPeerCertificate } from "node:tls";
import { constants, webcrypto, X509Certificate } from "node:crypto";
import {
  BasicConstraints,
  Certificate,
  CertificateChainValidationEngine,
  CryptoEngine,
} from "pkijs";
import { ADVATEK_ROOT_PEM, ADVATEK_ROOT_SHA256 } from "./advatek-root.js";

const ANY_EKU = "2.5.29.37.0";
const SERVER_EKU = "1.3.6.1.5.5.7.3.1";
const SIGNATURES = new Set([
  "1.2.840.113549.1.1.11",
  "1.2.840.113549.1.1.12",
  "1.2.840.113549.1.1.13",
  "1.2.840.10045.4.3.2",
  "1.2.840.10045.4.3.3",
  "1.2.840.10045.4.3.4",
]);
const CRITICAL_EXTENSIONS = new Set([
  "2.5.29.15",
  "2.5.29.19",
  "2.5.29.30",
  "2.5.29.32",
  "2.5.29.33",
  "2.5.29.36",
  "2.5.29.37",
  "2.5.29.54",
]);
const crypto = new CryptoEngine({
  name: "Node WebCrypto",
  crypto: webcrypto as Crypto,
});

function fail(): Error {
  return Object.assign(
    new Error(
      "Advatek HTTPS certificate verification failed. Check Device MAC and the controller certificate.",
    ),
    { code: "ADVATEK_TLS_INVALID" },
  );
}

function certificate(value: X509Certificate): Certificate {
  const parsed = Certificate.fromBER(Uint8Array.from(value.raw).buffer);
  const extensions = parsed.extensions ?? [];
  const ids = extensions.map((extension) => extension.extnID);
  const details = value.publicKey.asymmetricKeyDetails;
  if (
    new Set(ids).size !== ids.length ||
    extensions.some(
      (extension) =>
        extension.critical &&
        (!CRITICAL_EXTENSIONS.has(extension.extnID) || !extension.parsedValue),
    ) ||
    !parsed.signatureAlgorithm.isEqual(parsed.signature) ||
    !SIGNATURES.has(parsed.signatureAlgorithm.algorithmId) ||
    (value.publicKey.asymmetricKeyType === "rsa"
      ? (details?.modulusLength ?? 0) < 2048
      : value.publicKey.asymmetricKeyType !== "ec" ||
        !["prime256v1", "secp384r1", "secp521r1"].includes(
          details?.namedCurve ?? "",
        ))
  )
    throw fail();
  return parsed;
}

async function verifyPeer(
  socket: tls.TLSSocket,
  expectedMac: string,
): Promise<void> {
  const root = new X509Certificate(ADVATEK_ROOT_PEM);
  if (
    root.fingerprint256.replaceAll(":", "") !== ADVATEK_ROOT_SHA256 ||
    !root.ca ||
    !root.verify(root.publicKey)
  )
    throw fail();
  let peer: DetailedPeerCertificate | undefined =
    socket.getPeerCertificate(true);
  const chain: X509Certificate[] = [];
  const seen = new Set<string>();
  let bytes = 0;
  while (peer?.raw) {
    if (
      !Buffer.isBuffer(peer.raw) ||
      peer.raw.length > 16384 ||
      (bytes += peer.raw.length) > 49152
    )
      throw fail();
    const cert = new X509Certificate(peer.raw);
    if (seen.has(cert.fingerprint256)) {
      if (!cert.checkIssued(cert)) throw fail();
      break;
    }
    seen.add(cert.fingerprint256);
    chain.push(cert);
    if (chain.length > 3) throw fail();
    peer = peer.issuerCertificate;
  }
  const leaf = chain[0];
  if (
    !leaf ||
    leaf.ca ||
    leaf.subjectAltName !== undefined ||
    leaf.subject.toLowerCase() !== `cn=${expectedMac}` ||
    leaf.keyUsage?.length !== 1 ||
    leaf.keyUsage[0] !== ANY_EKU ||
    chain
      .slice(1)
      .some(
        (cert) =>
          !cert.ca ||
          (cert.keyUsage !== undefined &&
            !cert.keyUsage.includes(ANY_EKU) &&
            !cert.keyUsage.includes(SERVER_EKU)),
      )
  )
    throw fail();
  const parsed = chain.map(certificate);
  // This profile accepts only the observed leaf shape; future profiles need qualification.
  if (
    parsed[0]?.extensions?.some((extension) =>
      ["2.5.29.15", "2.16.840.1.113730.1.1"].includes(extension.extnID),
    )
  )
    throw fail();
  const verifier = new CertificateChainValidationEngine({
    trustedCerts: [certificate(root)],
    certs: parsed.reverse(),
  });
  const result = await verifier.verify({}, crypto);
  if (!result.result || !result.certificatePath) throw fail();
  // PKI.js validates the path but does not enforce CA path-length constraints.
  for (const [index, cert] of result.certificatePath.entries()) {
    const constraints = cert.extensions?.find(
      (extension) => extension.extnID === "2.5.29.19",
    )?.parsedValue;
    if (
      constraints instanceof BasicConstraints &&
      constraints.pathLenConstraint !== undefined
    ) {
      const limit = constraints.pathLenConstraint;
      const subordinateCAs = result.certificatePath
        .slice(1, index)
        .filter((issuer) => !issuer.subject.isEqual(issuer.issuer)).length;
      if (
        typeof limit !== "number" ||
        !Number.isSafeInteger(limit) ||
        limit < 0 ||
        subordinateCAs > limit
      )
        throw fail();
    }
  }
}

/** HTTP receives this socket only after the pinned root, chain and MAC are verified. */
export function advatekAgent(
  host: string,
  port: number,
  expectedMac: string,
): https.Agent {
  const agent = new https.Agent({ keepAlive: false, maxCachedSessions: 0 });
  const pending = new Set<tls.TLSSocket>();
  const originalDestroy = agent.destroy.bind(agent);
  agent.destroy = () => {
    for (const socket of pending) socket.destroy();
    pending.clear();
    originalDestroy();
  };
  agent.createConnection = (_options, callback) => {
    // Node's server-purpose gate rejects the shipped Any-EKU leaf. Keep it private
    // until independent path and exact-MAC verification have completed.
    const socket = tls.connect({
      host,
      port,
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
      secureOptions: constants.SSL_OP_NO_RENEGOTIATION,
      ALPNProtocols: ["http/1.1"],
    });
    pending.add(socket);
    let finished = false;
    const deadline = setTimeout(() => finish(fail()), 3000);
    const finish = (error?: Error): void => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      pending.delete(socket);
      if (error) socket.destroy();
      callback?.(error ?? null, socket);
    };
    socket.once("error", () => finish(fail()));
    socket.once("close", () => finish(fail()));
    socket.once("secureConnect", () => {
      if (socket.alpnProtocol && socket.alpnProtocol !== "http/1.1")
        return finish(fail());
      void verifyPeer(socket, expectedMac).then(
        () => finish(socket.destroyed ? fail() : undefined),
        () => finish(fail()),
      );
    });
    // Returning the socket here would let HTTP send credentials before verification.
    return undefined;
  };
  return agent;
}
