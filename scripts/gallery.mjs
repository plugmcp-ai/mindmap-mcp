// Takes a screenshot of every structure in every theme, from the demo harness.
// Output: docs/gallery/<structure>-<theme>.png and docs/gallery/README.md.
// Run it after `node scripts/harness.mjs`. Pass names to take only some: `node scripts/gallery.mjs mindmap classic`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page0 = pathToFileURL(join(root, "demo", "out", "index.html")).href;
const out = join(root, "docs", "gallery");
mkdirSync(out, { recursive: true });

// The sample that suits each structure best. The numbers are indexes into FIXTURES in src/fixtures.ts.
const STRUCTURES = {
  mindmap: 0,
  two_sided: 0,
  logic: 0,
  org: 0,
  outline: 0,
  timeline: 4,
  fishbone: 3,
  flowchart: 1,
  swimlanes: 2,
};
const THEMES = ["host", "classic", "mono", "blueprint", "sketch", "contrast"];
const only = process.argv.slice(2);
const wanted = (name) => !only.length || only.includes(name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
const problems = [];
page.on("pageerror", (error) => problems.push(String(error)));
page.on("console", (message) => message.type() === "error" && problems.push(message.text()));

let count = 0;
for (const [structure, fixture] of Object.entries(STRUCTURES)) {
  for (const theme of THEMES) {
    if (!wanted(structure) && !wanted(theme)) continue;
    await page.goto(`${page0}?view=full&still=1&fixture=${fixture}&structure=${structure}&theme=${theme}`);
    await page.waitForSelector("[data-node]");
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(out, `${structure}-${theme}.png`) });
    count += 1;
  }
}
await browser.close();

if (!only.length) {
  const rows = Object.keys(STRUCTURES).map((structure) => `| ${structure} | ${THEMES.map((theme) => `![${structure}, ${theme}](${structure}-${theme}.png)`).join(" | ")} |`);
  writeFileSync(
    join(out, "README.md"),
    `# Gallery\n\nEvery structure in every theme. These pictures are made by \`pnpm gallery\`; do not edit them by hand.\n\n| | ${THEMES.join(" | ")} |\n|---|${THEMES.map(() => "---").join("|")}|\n${rows.join("\n")}\n`,
  );
}
console.log(`${count} screenshots in ${out}`);
if (problems.length) {
  console.error(`Page errors:\n${[...new Set(problems)].join("\n")}`);
  process.exit(1);
}
