import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project sites from /<repo>/.
// `base` makes asset URLs resolve correctly there while staying "/" in dev.
// Override with VITE_BASE when the repo name differs or when hosting elsewhere.
const base = process.env.VITE_BASE ?? "/brain-canvas/";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? base : "/",
}));
