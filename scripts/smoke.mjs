// Starts the built server the way a chat client does, over stdio, and checks what it offers.
// Run after `pnpm build`.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const started = Date.now();
const child = spawn(process.execPath, [join(root, "bin", "mindmap.js")], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, MINDMAP_DIR: mkdtempSync(join(tmpdir(), "mindmap-smoke-")) },
});

let buffer = "";
const waiting = new Map();
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, end).trim();
    buffer = buffer.slice(end + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    waiting.get(message.id)?.(message);
  }
});
let nextId = 1;
const request = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`No answer to ${method}`)), 15000);
    waiting.set(id, (message) => {
      clearTimeout(timer);
      message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result);
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
const check = (ok, what) => {
  if (!ok) throw new Error(`Check failed: ${what}`);
  console.log(`ok  ${what}`);
};

try {
  const hello = await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1.0.0" } });
  check(hello.serverInfo.name === "mindmap", `the server answers initialize in ${Date.now() - started} ms`);
  check(/visualize/.test(hello.instructions ?? ""), "it sends instructions that name visualize");
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const { tools } = await request("tools/list", {});
  const names = tools.map((tool) => tool.name).sort();
  check(names.join() === "edit_diagram,export,get_diagram,load_state,save_state,visualize", `tools: ${names.join(", ")}`);
  const appOnly = tools.filter((tool) => (tool._meta?.ui?.visibility ?? []).join() === "app").map((tool) => tool.name).sort();
  check(appOnly.join() === "export,load_state,save_state", "three tools are for the view only");
  const visualize = tools.find((tool) => tool.name === "visualize");
  check(visualize._meta.ui.resourceUri === "ui://mindmap/visualize.html", "visualize links to its view");

  const view = await request("resources/read", { uri: "ui://mindmap/visualize.html" });
  const html = view.contents[0].text;
  check(view.contents[0].mimeType === "text/html;profile=mcp-app" && html.length > 100000, "the view is served as an MCP App");
  check(html.includes('"displayModes":["inline","fullscreen"]'), "the view declares inline and full screen");
  check(!/<script[^>]+src=|<link[^>]+href=/.test(html), "the view loads nothing from outside");

  const made = await request("tools/call", {
    name: "visualize",
    arguments: {
      title: "Smoke test",
      structure: "mindmap",
      nodes: [
        { id: "a", label: "Root" },
        { id: "b", label: "Child", parent: "a" },
      ],
    },
  });
  const docId = made.structuredContent.docId;
  check(/- \[a\] Root\n {2}- \[b\] Child/.test(made.content[0].text), "visualize answers with an outline");
  const edited = await request("tools/call", { name: "edit_diagram", arguments: { docId, ops: [{ op: "add_node", parent: "b", label: "Grandchild" }] } });
  check(edited.structuredContent.revision === 2 && edited.structuredContent.doc.nodes.length === 3, "edit_diagram changes it in place");
  const read = await request("tools/call", { name: "get_diagram", arguments: {} });
  check(read.structuredContent.docId === docId, "get_diagram finds the latest diagram");
  console.log("The built server works.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  child.kill();
}
