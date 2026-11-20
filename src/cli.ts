import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveHttp, serveStdio } from "plugmcp";
import server from "../server.js";

/**
 * What `npx plugmcp-mindmap` runs. It is bundled into dist/cli.js with
 * everything it needs, so starting it installs nothing else.
 *
 *   plugmcp-mindmap                 talk MCP over stdio, for a chat client that starts it
 *   plugmcp-mindmap --http          serve MCP at http://127.0.0.1:3333/mcp
 *   plugmcp-mindmap --http --port 4000
 */

const args = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const views = {
  visualize: { html: () => readFileSync(join(here, "views", "visualize.html"), "utf8") },
};

if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "plugmcp-mindmap: mind maps and flowcharts in your AI chat.",
      "",
      "  plugmcp-mindmap                  MCP over stdio (what a chat client starts)",
      "  plugmcp-mindmap --http           MCP over HTTP at http://127.0.0.1:3333/mcp",
      "  plugmcp-mindmap --http --port N  the same on another port",
      "",
      "Diagrams are saved as JSON in ~/.plugmcp/mindmap. Set MINDMAP_DIR to keep them somewhere else.",
      "To serve other computers set MINDMAP_ALLOWED_HOSTS to the host names to accept. There is no sign-in.",
    ].join("\n"),
  );
} else if (args.includes("--http")) {
  const at = args.indexOf("--port");
  const port = at >= 0 ? Number(args[at + 1]) : undefined;
  // Only this computer may connect, unless you name other hosts. There is no sign-in:
  // anyone who can reach the address can read and change the diagrams.
  const allowedHosts = process.env.MINDMAP_ALLOWED_HOSTS?.split(",").map((host) => host.trim()).filter(Boolean);
  const running = await serveHttp(server, {
    views,
    ...(port ? { port } : {}),
    ...(allowedHosts?.length ? { allowedHosts, host: "0.0.0.0" } : {}),
  });
  console.error(`Mind Map is serving MCP at ${running.url}`);
} else {
  await serveStdio(server, { views });
}
