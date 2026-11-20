// Bundles the server and everything it needs into dist/cli.js, so `npx plugmcp-mindmap`
// starts at once and installs no other package. Run after `plugmcp build`, which makes
// dist/views/visualize.html.
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const view = join(root, "dist", "views", "visualize.html");
if (!existsSync(view)) {
  console.error("dist/views/visualize.html is missing. Run `plugmcp build` first.");
  process.exit(1);
}

await build({
  entryPoints: [join(root, "src", "cli.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: join(root, "dist", "cli.js"),
  // Some packages inside still call require().
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
  logLevel: "warning",
});

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
console.log(`dist/cli.js ${kb(statSync(join(root, "dist", "cli.js")).size)}`);
console.log(`dist/views/visualize.html ${kb(statSync(view).size)}, ${kb(gzipSync(readFileSync(view)).length)} gzipped`);
