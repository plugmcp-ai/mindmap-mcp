// Records the demo videos by driving the real app in the demo harness.
// It checks the steps as it goes, so it doubles as an end-to-end test.
//
//   node demo/record.mjs                  the main demo: docs/demo.mp4 and docs/demo.gif (needs ffmpeg)
//   node demo/record.mjs --scene edit     a short clip: click a node, ask the AI, watch it edit
//   node demo/record.mjs --scene styles   a short clip: the same content in other structures and styles
//   node demo/record.mjs --scene all      all three
//   node demo/record.mjs --out <folder>   where the short clips go (default demo/out/clips)
//   node demo/record.mjs --check          run every step fast, with no video
//
// Run `node scripts/harness.mjs` first.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const check = args.includes("--check");
const wanted = flag("--scene") ?? (check ? "all" : "hero");
const clips = resolve(flag("--out") ?? join(root, "demo", "out", "clips"));
const size = { width: 1280, height: 800 };
const BACKLOG = 5; // index of the ticket backlog in FIXTURES, src/fixtures.ts

const browser = await chromium.launch();
const problems = [];

/** One recording: a fresh page, the steps, and the video file it made. */
async function record(name, steps) {
  const videoDir = join(root, "demo", "out", "video", name);
  rmSync(videoDir, { recursive: true, force: true });
  mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, ...(check ? {} : { recordVideo: { dir: videoDir, size } }) });
  const page = await context.newPage();
  page.on("pageerror", (error) => problems.push(`${name}: ${error}`));
  page.on("console", (message) => message.type() === "error" && problems.push(`${name}: ${message.text()}`));
  await page.goto(`${pathToFileURL(join(root, "demo", "out", "index.html")).href}?view=chat`);

  // A recording has no mouse pointer and no sound: draw a pointer, and say what is happening in a caption.
  await page.addStyleTag({
    content:
      "#cursor{position:fixed;z-index:999;width:20px;height:20px;margin:-4px 0 0 -4px;border-radius:50%;background:rgba(0,153,255,.35);border:2px solid #0099FF;pointer-events:none;left:-40px;top:-40px}" +
      "#caption{position:fixed;z-index:998;left:50%;bottom:26px;transform:translateX(-50%);max-width:80%;padding:12px 22px;border-radius:14px;background:rgba(20,20,20,.92);color:#fff;font:600 20px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .35s;box-shadow:0 8px 30px rgba(0,0,0,.35)}" +
      "#caption.on{opacity:1}",
  });
  await page.evaluate(() => {
    const dot = document.createElement("div");
    dot.id = "cursor";
    const caption = document.createElement("div");
    caption.id = "caption";
    document.body.append(dot, caption);
    addEventListener("mousemove", (event) => {
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
    });
  });

  const tools = {
    page,
    pause: (ms) => page.waitForTimeout(check ? Math.min(ms, 50) : ms),
    expect(ok, what) {
      if (!ok) throw new Error(`${name}: check failed: ${what}`);
      console.log(`ok  ${name}: ${what}`);
    },
    nodeCount: () => page.locator("[data-node]").count(),
    async caption(text) {
      await page.evaluate((value) => {
        const element = document.getElementById("caption");
        element.textContent = value;
        element.classList.toggle("on", Boolean(value));
      }, text);
      await tools.pause(text ? 900 : 300);
    },
    async moveTo(locator) {
      const box = await locator.boundingBox();
      if (!box) throw new Error(`${name}: nothing to point at.`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: check ? 1 : 28 });
    },
    async click(locator, wait = 700) {
      await tools.moveTo(locator);
      await tools.pause(350);
      await locator.click();
      await tools.pause(wait);
    },
    async pick(menu, value, wait = 2200) {
      await tools.click(page.locator(`[data-testid=${menu}] > button`), 600);
      await tools.click(page.locator(`[data-testid=${menu}] [data-value=${value}]`), wait);
    },
    type: (text) => page.keyboard.type(text, { delay: check ? 0 : 85 }),
    /** The user pastes a list of tickets, and the diagram grows as the model writes it. */
    async ask(streamStep = 190) {
      await page.evaluate(() =>
        window.demo.prompt("I can't keep 14 tickets in my head. Show them as a mind map:\nSSO fails on Safari\nDouble charge on retry\nDashboard loads in 9s\n... 11 more"),
      );
      await tools.pause(1500);
      await page.evaluate(() => window.demo.card());
      await page.evaluate(([index, step]) => window.demo.stream(index, step), [BACKLOG, check ? 5 : streamStep]);
      await page.waitForSelector("[data-node=d2]");
      await tools.pause(900);
      tools.expect((await tools.nodeCount()) === 20, "the streamed diagram shows all 20 nodes");
      await page.evaluate(() => window.demo.reply("Here are your 14 tickets, grouped by area. Click any of them to dig in."));
      await tools.pause(1800);
    },
  };

  await steps(tools);
  await tools.pause(1200);
  await context.close();
  if (check) return undefined;
  return join(videoDir, readdirSync(videoDir).find((file) => file.endsWith(".webm")));
}

/** Click a node, ask the AI, watch it change the same diagram. Then rename and comment. */
async function editing(t, { full }) {
  const { page } = t;
  await t.caption("Click any node and ask the AI about it");
  await t.click(page.locator("[data-node=f1]"), 1100);
  t.expect(await page.locator("[data-testid=node-panel]").isVisible(), "the node panel opens");
  await t.click(page.locator("[data-action=breakdown]"), 500);
  await page.waitForSelector("[data-node=f1_x3]", { timeout: 10000 });
  t.expect((await t.nodeCount()) === 23, "the AI broke the ticket down into three nodes on the open diagram");
  await t.caption("The AI answers by editing the same map");
  await t.pause(2600);

  await t.caption("Or ask your own question");
  await t.click(page.locator("[data-node=pay]"), 900);
  await t.click(page.locator(".mm-ask input"), 300);
  await t.type("Which should we fix first?");
  await t.pause(500);
  await t.click(page.getByRole("button", { name: "Ask", exact: true }), 500);
  await page.waitForFunction(() => [...document.querySelectorAll(".bubble-ai")].some((bubble) => bubble.textContent.includes("Double charge on retry first")), null, { timeout: 10000 });
  t.expect(true, "the AI answered the question and marked a ticket");
  await t.pause(3200);

  if (!full) return;
  await t.caption("Edit it yourself. The AI is told what you changed.");
  const docs = page.locator("[data-node=docs]");
  await t.moveTo(docs);
  await t.pause(300);
  await docs.click();
  await docs.click();
  await t.pause(600);
  await t.type("Docs");
  await t.pause(400);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("aside")?.textContent?.includes('renamed docs: "Docs and support" -> "Docs"'), null, { timeout: 8000 });
  t.expect(true, "the rename reached the model context");
  await t.pause(2800);

  await t.caption("Leave comments and send them when you are ready");
  await t.click(page.locator("[data-node=m3]"), 900);
  await t.click(page.locator(".mm-ask input"), 300);
  await t.type("Not this quarter");
  await t.click(page.getByRole("button", { name: "Comment", exact: true }), 1200);
  await t.click(page.getByRole("button", { name: "Send your comments to the chat" }), 500);
  await page.waitForSelector("[data-node=later]", { timeout: 10000 });
  t.expect(true, "the AI acted on the comment and moved the ticket");
  await t.pause(3000);
}

/** The same content in other structures and styles. No call to the model. */
async function looks(t, { structures, themes }) {
  const { page } = t;
  // Close the node panel so the whole diagram shows.
  const close = page.locator("[data-testid=node-panel] button[aria-label=Close]");
  if (await close.isVisible().catch(() => false)) await t.click(close, 500);
  await t.caption("Same tickets, another structure. No new request to the AI.");
  await t.click(page.getByRole("button", { name: "Full screen", exact: true }), 1800);
  const before = await t.nodeCount();
  for (const structure of structures) {
    await t.pick("structure", structure);
    t.expect((await page.locator(".mm-root").getAttribute("data-structure")) === structure, `structure switched to ${structure}`);
    t.expect((await t.nodeCount()) === before, `all nodes are still there as ${structure}`);
  }
  await t.caption("Pick a style");
  for (const theme of themes) {
    await t.pick("theme", theme, 1900);
    t.expect((await page.locator(".mm-root").getAttribute("data-theme")) === theme, `theme switched to ${theme}`);
  }
}

const SCENES = {
  // The main demo: the problem, the edit loop, then the looks.
  async hero(t) {
    await t.pause(700);
    await t.caption("Too many tickets to read?");
    await t.ask();
    await editing(t, { full: true });
    await looks(t, { structures: ["logic", "org", "mindmap"], themes: ["classic", "blueprint", "sketch", "host"] });
    await t.caption("Open source: github.com/plugmcp-ai/mindmap-mcp");
    await t.pause(3200);
  },
  // Short: ask, click, the AI edits.
  async edit(t) {
    await t.pause(500);
    await t.caption("An MCP App where you edit the AI's answer by clicking on it");
    await t.ask(120);
    await editing(t, { full: false });
    await t.caption("Open source: github.com/plugmcp-ai/mindmap-mcp");
    await t.pause(2800);
  },
  // Short: every structure and style.
  async styles(t) {
    await t.pause(500);
    await t.caption("One list of tickets, drawn nine ways");
    await t.ask(90);
    await looks(t, { structures: ["mindmap", "logic", "org", "outline", "timeline", "fishbone", "two_sided"], themes: ["classic", "mono", "blueprint", "sketch", "contrast", "host"] });
    await t.caption("Open source: github.com/plugmcp-ai/mindmap-mcp");
    await t.pause(2800);
  },
};

const names = wanted === "all" ? Object.keys(SCENES) : [wanted];
const videos = {};
for (const name of names) {
  if (!SCENES[name]) throw new Error(`No scene "${name}". Use hero, edit, styles or all.`);
  videos[name] = await record(name, SCENES[name]);
}
await browser.close();

if (problems.length) {
  console.error(`Page errors:\n${[...new Set(problems)].join("\n")}`);
  process.exit(1);
}
if (check) {
  console.log("All steps passed.");
  process.exit(0);
}

const ffmpeg = (list) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...list], { stdio: "inherit" });
const mp4 = (from, to) => ffmpeg(["-i", from, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", "-an", to]);
/** A GIF small enough for a README or a post: part of the video, a little faster, fewer colors. */
function gif(from, to, { seconds, width = 760, fps = 8, speed = 1.5 }) {
  const palette = join(dirname(from), "palette.png");
  const filter = `setpts=PTS/${speed},fps=${fps},scale=${width}:-1:flags=lanczos`;
  const part = ["-t", String(seconds), "-i", from];
  ffmpeg([...part, "-vf", `${filter},palettegen=max_colors=64:stats_mode=diff`, palette]);
  ffmpeg([...part, "-i", palette, "-lavfi", `${filter}[x];[x][1:v]paletteuse=dither=none:diff_mode=rectangle`, to]);
}

mkdirSync(clips, { recursive: true });
for (const [name, video] of Object.entries(videos)) {
  if (name === "hero") {
    mp4(video, join(root, "docs", "demo.mp4"));
    // The README picture: the question, the diagram, and the AI editing it.
    gif(video, join(root, "docs", "demo.gif"), { seconds: 46 });
    console.log(`Wrote ${join(root, "docs", "demo.mp4")} and demo.gif`);
  } else {
    mp4(video, join(clips, `${name}.mp4`));
    gif(video, join(clips, `${name}.gif`), { seconds: 60, width: 720, speed: 1.6 });
    console.log(`Wrote ${join(clips, `${name}.mp4`)} and ${name}.gif`);
  }
}
