import { discoveryHtml } from "./page.generated.js";

/** Companion serves the Vite-built page; no separate web server is required. */
export function discoveryPage(nonce: string, connectionId = ""): string {
  const attribute = nonce.replace(
    /[&"<>]/g,
    (value) =>
      ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[value]!,
  );
  return discoveryHtml
    .replace("__PIXLITE_NONCE__", () => attribute)
    .replace("__PIXLITE_CONNECTION__", () => encodeURIComponent(connectionId));
}
