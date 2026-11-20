// Records the demo video by driving the real app in the demo harness.
// It also checks the steps as it goes, so it doubles as an end-to-end test:
//   node demo/record.mjs          record, then write docs/demo.mp4 and docs/demo.gif (needs ffmpeg)
//   node demo/record.mjs --check  run the steps fast, with no video
// Run `node scripts/harness.mjs` first.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const videoDir = join(root, "demo", "out", "video");
const size = { width: 1280, height: 800 };

rmSync(videoDir, { recursive: true, force: true });
mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, ...(check ? {} : { recordVideo: { dir: videoDir, size } }) });
const page = await context.newPage();
const problems = [];
page.on("pageerror", (error) => problems.push(String(error)));
page.on("console", (message) => message.type() === "error" && problems.push(message.text()));

const pause = (ms) => page.waitForTimeout(check ? Math.min(ms, 60) : ms);
const expect = (ok, what) => {
  if (!ok) throw new Error(`Check failed: ${what}`);
  console.log(`ok  ${what}`);
};
const nodeCount = () => page.locator("[data-node]").count();

await page.goto(`${pathToFileURL(join(root, "demo", "out", "index.html")).href}?view=chat`);

// A recording has no mouse pointer of its own: draw one.
await page.addStyleTag({ content: "#cursor{position:fixed;z-index:999;width:18px;height:18px;margin:-3px 0 0 -3px;border-radius:50%;background:rgba(0,153,255,.35);border:2px solid #0099FF;pointer-events:none;left:-40px;top:-40px}" });
await page.evaluate(() => {
  const dot = document.createElement("div");
  dot.id = "cursor";
  document.body.append(dot);
  addEventListener("mousemove", (event) => {
    dot.style.left = `${event.clientX}px`;
    dot.style.top = `${event.clientY}px`;
  });
});

async function moveTo(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Nothing to point at.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: check ? 1 : 18 });
  return box;
}
async function click(locator, wait = 500) {
  await moveTo(locator);
  await pause(180);
  await locator.click();
  await pause(wait);
}
async function pick(menu, value, wait = 1500) {
  await click(page.locator(`[data-testid=${menu}] > button`), 350);
  await click(page.locator(`[data-testid=${menu}] [data-value=${value}]`), wait);
}

// 1. The user asks, and the diagram grows as the model writes it.
await pause(600);
await page.evaluate(() => window.demo.prompt("Plan the launch of our open source mind map app. Show it as a diagram."));
await pause(1100);
await page.evaluate(() => window.demo.card());
await page.evaluate((step) => window.demo.stream(0, step), check ? 5 : 150);
await page.waitForSelector("[data-node=time3]");
await pause(700);
expect((await nodeCount()) === 24, "the streamed diagram shows all 24 nodes");
await page.evaluate(() => window.demo.reply("Here is the launch plan as a mind map. Edit it, restyle it, or ask me about any part."));
await pause(1400);

// 2. Full screen, then the same idea in other structures. No call to the model.
await click(page.getByRole("button", { name: "Full screen", exact: true }), 1300);
for (const structure of ["two_sided", "logic", "org", "outline", "mindmap"]) {
  await pick("structure", structure);
  expect((await page.locator(".mm-root").getAttribute("data-structure")) === structure, `structure switched to ${structure}`);
  expect((await nodeCount()) === 24, `all nodes are still there as ${structure}`);
}

// 3. Other looks.
for (const theme of ["classic", "blueprint", "sketch", "mono", "host"]) {
  await pick("theme", theme, 1300);
  expect((await page.locator(".mm-root").getAttribute("data-theme")) === theme, `theme switched to ${theme}`);
}

// 4. Animation off: the next change jumps. Then on again.
await click(page.getByRole("button", { name: /Animation is on/ }), 600);
await pick("structure", "two_sided", 900);
await click(page.getByRole("button", { name: /Animation is off/ }), 600);
await pick("structure", "mindmap", 1500);

// 5. Back in the chat, the user renames a node. The AI is told.
await click(page.getByRole("button", { name: "Leave full screen" }), 1300);
const price = page.locator("[data-node=price]");
await moveTo(price);
await price.dblclick();
await pause(500);
await page.keyboard.type("Pricing tiers", { delay: check ? 0 : 70 });
await pause(300);
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelector("aside")?.textContent?.includes('renamed price: "Pricing" -> "Pricing tiers"'), null, { timeout: 8000 });
expect(true, "the rename reached the model context");
await pause(1800);

// 6. The user asks the AI to expand a node. The AI answers by changing the same diagram.
await click(price, 900);
expect(await page.locator("[data-testid=node-panel]").isVisible(), "the node panel opens");
await click(page.locator("[data-action=expand]"), 400);
await page.waitForSelector("[data-node=price_x3]", { timeout: 10000 });
expect((await nodeCount()) === 27, "the AI's edit added three nodes to the open diagram");
await pause(2600);

// 7. A comment, kept until the user sends it.
await click(page.locator("[data-node=risk1]"), 700);
await click(page.locator(".mm-ask input"), 200);
await page.keyboard.type("Which hosts exactly?", { delay: check ? 0 : 55 });
await click(page.getByRole("button", { name: "Comment", exact: true }), 900);
expect(await page.getByRole("button", { name: "Send your comments to the chat" }).isVisible(), "the comment waits to be sent");
await pause(2200);

await context.close();
await browser.close();

if (problems.length) {
  console.error(`Page errors:\n${[...new Set(problems)].join("\n")}`);
  process.exit(1);
}
if (check) {
  console.log("All steps passed.");
  process.exit(0);
}

const video = join(videoDir, readdirSync(videoDir).find((name) => name.endsWith(".webm")));
const docs = join(root, "docs");
const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
ffmpeg(["-i", video, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", "-an", join(docs, "demo.mp4")]);
// A short, small GIF for the README: the first part only, at a lower frame rate.
const palette = join(videoDir, "palette.png");
const filter = "setpts=PTS/1.4,fps=8,scale=760:-1:flags=lanczos";
const part = ["-t", "44", "-i", video];
ffmpeg([...part, "-vf", `${filter},palettegen=max_colors=64:stats_mode=diff`, palette]);
ffmpeg([...part, "-i", palette, "-lavfi", `${filter}[x];[x][1:v]paletteuse=dither=none:diff_mode=rectangle`, join(docs, "demo.gif")]);
console.log(`Wrote ${join(docs, "demo.mp4")} and ${join(docs, "demo.gif")}`);
