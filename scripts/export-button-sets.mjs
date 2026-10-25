import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { artwork } from "../dist/companion/artwork.generated.js";
import {
  labelledArtwork,
  presetLabels,
} from "../dist/companion/labelled-artwork.generated.js";

// Export and verify embedded PNG bytes without fonts or remote resources.
const root = new URL("../", import.meta.url);
const output = new URL(
  process.argv.includes("--save")
    ? "assets/button-images/"
    : ".local/button-exports/",
  root,
);
await mkdir(output, { recursive: true });
const states = ["idle", "active", "stale", "fault"];
const manifest = [];
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const xml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
for (const theme of ["dark", "light"]) {
  const directory = new URL(`${theme}/`, output);
  await mkdir(directory, { recursive: true });
  for (const [kind, collection] of [
    ["buttons", labelledArtwork],
    ["icons", artwork],
  ]) {
    for (const state of states)
      await mkdir(new URL(`${kind}/${state}/`, directory), { recursive: true });
    for (const [id, themes] of Object.entries(collection)) {
      for (const state of states) {
        const relative = `${kind}/${state}/${id.replaceAll(" ", "_")}.png`;
        const original = Buffer.from(themes[theme][state], "base64");
        await writeFile(new URL(relative, directory), original);
        const saved = await readFile(new URL(relative, directory));
        if (!saved.equals(original))
          throw new Error(`Export differs from embedded artwork: ${relative}`);
        const metadata = await sharp(saved).metadata();
        if (
          metadata.format !== "png" ||
          metadata.width !== 72 ||
          metadata.height !== 72 ||
          !metadata.hasAlpha
        )
          throw new Error(`Invalid PNG: ${relative}`);
        const { data, info } = await sharp(saved)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        if (data[3] !== 0) throw new Error(`Opaque canvas corner: ${relative}`);
        let ink = 0,
          labelInk = 0;
        for (let y = 4; y < 68; y++)
          for (let x = 8; x < 64; x++) {
            if (data[(y * info.width + x) * 4 + 3] > 64) {
              ink++;
              if (y >= 40) labelInk++;
            }
          }
        if (ink < 40 || (kind === "buttons" && labelInk < 25))
          throw new Error(`Empty or missing label: ${relative}`);
        manifest.push({
          theme,
          kind,
          id,
          state,
          file: relative,
          sha256: sha256(saved),
          width: 72,
          height: 72,
          alpha: true,
          ...(kind === "buttons" ? { label: presetLabels[id].label } : {}),
        });
      }
    }
  }
  const records = manifest.filter((entry) => entry.theme === theme);
  await writeFile(
    new URL("manifest.json", directory),
    JSON.stringify(
      { schema: 1, theme, nativeCanvas: [72, 72], files: records },
      null,
      2,
    ) + "\n",
  );
  await copyFile(
    new URL("companion/ARTWORK-LICENSES.txt", root),
    new URL("ARTWORK-LICENSES.txt", directory),
  );
  await writeFile(
    new URL("README.txt", directory),
    `Advatek PixLite Mk3 SHOWTime, ${theme} keys\n\nbuttons/: ${Object.keys(labelledArtwork).length} fixed-label controls, each with idle/active/stale/fault PNGs.\nicons/: ${Object.keys(artwork).length} icon roles without fixed captions, each with the same four states.\nEvery PNG is 72 x 72 with transparency and matches the module's embedded bytes.\nFixed labels use Forma DJR Display. No font software is included.\n\nThese are image assets. Import the module's presets to obtain actions and feedback.\nCopying an image alone does not configure a working button.\nThe active sample does not imply that every control has an active feedback.\nDynamic filenames and values use Companion's native text renderer.\n\nSee manifest.json for each filename, role, state and SHA-256.\n`,
  );
  // One sheet per state makes every caption visible without a huge single image.
  for (const state of states) {
    const height =
      100 + Math.ceil(Object.keys(labelledArtwork).length / 6) * 132;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}"><rect width="1000" height="${height}" fill="#181819"/><text x="38" y="40" font-family="Forma DJR Display,sans-serif" font-size="25" font-weight="bold" fill="white">SHOWTime / ${theme} / ${state}</text><text x="38" y="68" font-family="Forma DJR Display,sans-serif" font-size="14" fill="#B8B7B9">All ${Object.keys(labelledArtwork).length} fixed controls. Actual exported 72 px PNGs shown at native size.</text>`;
    Object.entries(labelledArtwork).forEach(([id, themes], index) => {
      const x = 45 + (index % 6) * 163,
        y = 98 + Math.floor(index / 6) * 132;
      const label = presetLabels[id].label.replaceAll("\n", " ");
      svg += `<rect x="${x}" y="${y}" width="72" height="72" rx="6" fill="${theme === "dark" ? "#353436" : "#FFFFFF"}"/><image x="${x}" y="${y}" width="72" height="72" href="data:image/png;base64,${themes[theme][state]}"/><text x="${x + 36}" y="${y + 96}" text-anchor="middle" font-family="Forma DJR Display,sans-serif" font-size="12" fill="#B8B7B9">${xml(label)}</text>`;
    });
    svg += "</svg>";
    await writeFile(
      new URL(`contact-${state}.png`, directory),
      await sharp(Buffer.from(svg)).png().toBuffer(),
    );
  }
}
const report = {
  modulePngsVerified: manifest.length,
  perTheme: {
    fixedButtons: Object.keys(labelledArtwork).length,
    iconRoles: Object.keys(artwork).length,
    states: states.length,
    pngFiles: manifest.length / 2,
  },
  checks: [
    "saved bytes match module",
    "SHA-256",
    "PNG decode and dimensions",
    "alpha and nonempty icon/label regions",
  ],
};
await writeFile(
  new URL("verification.json", output),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
