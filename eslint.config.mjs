import { generateEslintConfig } from "@companion-module/tools/eslint/config.mjs";

export default generateEslintConfig({
  enableTypescript: true,
  ignores: [
    "src/companion/*.generated.ts",
    "src/discovery/*.generated.ts",
    ".local/**",
    "node_modules/**",
  ],
});
