import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { normalizeBasePath } from "./src/deploy/base-path";

export default defineConfig({
  base: normalizeBasePath(process.env.AGENT_ALIBI_BASE_PATH),
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
