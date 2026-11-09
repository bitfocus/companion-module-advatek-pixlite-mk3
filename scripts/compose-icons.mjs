import { readFile, writeFile, mkdir } from "node:fs/promises";
import svgpath from "svgpath";

// Preserve PrimeIcons geometry in editable SVG paths and PNG exports.
const root = new URL("../assets/", import.meta.url);
const paths = async (name, scale = 1, x = 0, y = 0) => {
  const svg = await readFile(new URL(`primeicons/${name}.svg`, root), "utf8");
  return [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
    .map((m) => svgpath(m[1]).scale(scale).translate(x, y).toString())
    .join(" ");
};
const line = (x1, y1, x2, y2, width = 1.4) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const dx = (((y2 - y1) / length) * width) / 2;
  const dy = (((x2 - x1) / length) * width) / 2;
  return `M${x1 + dx},${y1 - dy} L${x2 + dx},${y2 - dy} L${x2 - dx},${y2 + dy} L${x1 - dx},${y1 + dy} Z`;
};
const snow = Array.from({ length: 6 }, (_, i) => {
  const a = (i * Math.PI) / 3,
    x = 12 + 5 * Math.cos(a),
    y = 12 + 5 * Math.sin(a);
  return (
    line(12, 12, 12 + 9 * Math.cos(a), 12 + 9 * Math.sin(a)) +
    " " +
    [a - Math.PI / 3, a + Math.PI / 3]
      .map((b) => line(x, y, x + 3 * Math.cos(b), y + 3 * Math.sin(b), 1.2))
      .join(" ")
  );
}).join(" ");
const compositions = {
  "mix-channel":
    "M3 .75 H21 V2.25 H3 Z M8 0 H10 V3.5 H8 Z M3 6 H21 V7.5 H3 Z M15 4.5 H17 V9 H15 Z",
  "mix-recall":
    (await paths("palette", 0.62, 9, 4)) +
    " " +
    line(1, 12, 10, 12) +
    " " +
    line(6, 8, 10, 12) +
    " " +
    line(6, 16, 10, 12),
  "mix-live":
    (await paths("palette", 0.62, 0, 4)) +
    " M18.25 3 H19.75 V12 H18.25 Z M15.2 5.1 A7 7 0 1 0 22.8 5.1 L21.8 6.3 A5.5 5.5 0 1 1 16.2 6.3 Z",
  "mix-load":
    (await paths("palette", 0.62, 0, 2)) +
    " " +
    line(19, 10, 19, 21) +
    " " +
    line(15, 17, 19, 21) +
    " " +
    line(23, 17, 19, 21),
  "mix-up":
    (await paths("palette", 0.6, 0, 6)) +
    " " +
    line(19, 17, 19, 4) +
    " " +
    line(15, 8, 19, 4) +
    " " +
    line(23, 8, 19, 4),
  "mix-down":
    (await paths("palette", 0.6, 0, 0)) +
    " " +
    line(19, 7, 19, 20) +
    " " +
    line(15, 16, 19, 20) +
    " " +
    line(23, 16, 19, 20),
  "play-pause":
    (await paths("play", 0.95, -5, 0.6)) +
    " " +
    (await paths("pause", 0.95, 5.4, 0.6)),
  "brightness-lock":
    (await paths("sun", 0.64, 0, 4)) +
    " " +
    (await paths("lock", 0.4, 14.4, 7)),
  "media-refresh":
    (await paths("list", 0.65, 0, 3)) +
    " " +
    (await paths("refresh", 0.42, 13, 11)),
  "device-search":
    (await paths("sitemap", 0.65, 0, 1)) +
    " " +
    (await paths("search", 0.5, 12, 12)),
  // Original outline symbols use the family's 1.5-unit weight and 24-unit grid.
  temperature:
    "M8 4 A3 3 0 0 1 14 4 V13.5 A5 5 0 1 1 8 13.5 Z M9.5 4 V14.4 A3.5 3.5 0 1 0 12.5 14.4 V4 A1.5 1.5 0 0 0 9.5 4 Z M10.25 8 H11.75 V16 H10.25 Z M11 15.75 A2 2 0 1 1 11 19.75 A2 2 0 1 1 11 15.75 Z M16 5 H20 V6.5 H16 Z M16 9 H19 V10.5 H16 Z",
  fuse: "M6 7 H18 V17 H6 Z M7.5 8.5 V15.5 H16.5 V8.5 Z M1 11.25 H6 V12.75 H1 Z M18 11.25 H23 V12.75 H18 Z M9 10.5 H15 V13.5 H9 Z",
  "sd-card":
    "M5 2 H14 L19 7 V22 H5 Z M6.5 3.5 V20.5 H17.5 V7.6 L13.4 3.5 Z M8 5 H9.5 V9 H8 Z M11 5 H12.5 V9 H11 Z M14 7 H15.5 V9 H14 Z M8 13 H16 V14.5 H8 Z M8 17 H16 V18.5 H8 Z",
  "live-input": await paths("sign-in"),
  blackout: (await paths("circle-off")) + " " + line(5.5, 18.5, 18.5, 5.5),
  "freeze-frame": snow,
  "previous-scene":
    (await paths("step-backward", 0.44, 0, 7)) +
    " " +
    (await paths("play-circle", 0.6, 9.5, 4.8)),
  "next-scene":
    (await paths("play-circle", 0.6, 0, 4.8)) +
    " " +
    (await paths("step-forward", 0.44, 13.5, 7)),
  "brightness-up":
    (await paths("sun", 0.64, 0, 4)) +
    " " +
    (await paths("plus", 0.38, 15, 7.2)),
  "brightness-down":
    (await paths("sun", 0.64, 0, 4)) +
    " " +
    (await paths("minus", 0.38, 15, 7.2)),
  "brightness-return":
    (await paths("sun", 0.64, 0, 4)) +
    " " +
    (await paths("undo", 0.4, 14.4, 7)),
};
await mkdir(new URL("operator-icons/", root), { recursive: true });
for (const [name, d] of Object.entries(compositions)) {
  await writeFile(
    new URL(`operator-icons/${name}.svg`, root),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>\n`,
  );
}
console.log(
  `Composed ${Object.keys(compositions).length} editable operator symbols`,
);
