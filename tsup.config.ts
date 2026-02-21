import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/server/index.ts" },
    outDir: "server",
    format: ["esm"],
    target: "node20",
    platform: "node",
    splitting: false,
    sourcemap: false,
    clean: true,
    noExternal: ["toml"],
  },
  {
    entry: { plugin: "src/plugin.ts" },
    outDir: "server",
    format: ["esm"],
    target: "node20",
    platform: "node",
    splitting: false,
    sourcemap: false,
    noExternal: ["toml"],
  },
]);
