import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Copy index.html → 404.html so direct URL reloads work on static hosts. */
function spaFallbackPlugin() {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const outDir = join(process.cwd(), "dist");
      const index = join(outDir, "index.html");
      const fallback = join(outDir, "404.html");
      if (existsSync(index)) {
        copyFileSync(index, fallback);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallbackPlugin()],
});
