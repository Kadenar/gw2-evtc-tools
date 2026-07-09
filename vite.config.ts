import path from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: repoName ? `/${repoName}/` : "/",
  server: {
    port: 5175,
    strictPort: true,
  },
});
