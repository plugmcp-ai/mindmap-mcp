// Builds the demo harness: the real app in a page that stands in for a chat client.
// Output: demo/out/index.html, opened by the gallery and recording scripts.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "demo", "out");
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, "demo", "harness", "main.tsx")],
  bundle: true,
  format: "iife",
  jsx: "automatic",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: join(out, "harness.js"),
  logLevel: "warning",
});

writeFileSync(
  join(out, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mind Map demo harness</title>
<style>
html,body{margin:0}
body{font-family:Geist,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1.5}
.chat{min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) 340px;grid-template-rows:auto 1fr}
.chat header{grid-column:1/3;padding:10px 20px;font-size:12px;opacity:.6;border-bottom:1px solid rgba(128,128,128,.25)}
.chat main{padding:20px 24px;display:flex;flex-direction:column;gap:14px;max-width:820px;width:100%;margin:0 auto;box-sizing:border-box}
.chat aside{border-left:1px solid rgba(128,128,128,.25);padding:16px;font-size:12px;overflow:auto;max-height:calc(100vh - 42px);box-sizing:border-box}
.chat aside pre{white-space:pre-wrap;font:11.5px/1.5 ui-monospace,Consolas,monospace;opacity:.85;margin:8px 0 0}
.bubble{padding:10px 14px;border-radius:14px;max-width:80%;white-space:pre-wrap}
.bubble-user{align-self:flex-end;background:rgba(0,153,255,.14)}
.bubble-ai{align-self:flex-start;background:rgba(128,128,128,.14)}
.card{border:1px solid rgba(128,128,128,.3);border-radius:14px;overflow:hidden}
.card-full{position:fixed;inset:0;z-index:10;border-radius:0;border:0}
.chat-dark .card-full{background:#161616}
.chat-light .card-full{background:#fff}
</style>
</head>
<body>
<div id="root"></div>
<script src="./harness.js"></script>
</body>
</html>
`,
);
console.log(`Built ${join(out, "index.html")}`);
