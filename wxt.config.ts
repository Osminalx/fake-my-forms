import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  // WSL2: zip operations fail on /mnt/d/ paths due to NTFS fs.open() constraints.
  // Output to the Linux filesystem, then copy the zip back to the project directory.
  outDir: process.env.WXT_OUT_DIR ?? ".output",
  manifest: {
    permissions: ["storage", "tabs"],
    browser_specific_settings: {
      gecko: {
        id: "fake-my-forms@extension.local",
      },
    },
  },
});
