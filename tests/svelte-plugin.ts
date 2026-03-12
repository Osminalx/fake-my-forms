import { plugin } from "bun";
import { compile, compileModule } from "svelte/compiler";
import { readFileSync } from "fs";
import { resolve as resolvePath } from "path";

// Root of the svelte package
const svelteRoot = resolvePath("./node_modules/svelte");

plugin({
  name: "svelte",
  setup(build) {
    // Force svelte's browser (client) entry point — bun does not activate the
    // "browser" export condition by default, which causes Svelte to load its
    // server bundle and `mount()` to throw.
    build.onResolve({ filter: /^svelte$/ }, () => ({
      path: resolvePath(`${svelteRoot}/src/index-client.js`),
    }));

    // .svelte component files → compile with client renderer
    build.onLoad({ filter: /\.svelte$/ }, ({ path }) => {
      const source = readFileSync(path, "utf-8");
      const result = compile(source, {
        filename: path,
        generate: "client",
        dev: false,
      });
      return { contents: result.js.code, loader: "js" };
    });

    // .svelte.js / .svelte.ts module files (rune-context files used by @testing-library/svelte)
    build.onLoad({ filter: /\.svelte\.(js|ts)$/ }, ({ path }) => {
      const source = readFileSync(path, "utf-8");
      const result = compileModule(source, {
        filename: path,
        generate: "client",
        dev: false,
      });
      return { contents: result.js.code, loader: "js" };
    });
  },
});
