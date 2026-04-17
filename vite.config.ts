import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  assetsInclude: ["**/*.mid"],
  server: {
    port: 4200,
  },
});
