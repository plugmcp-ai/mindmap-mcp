// Runs the saved tool tests in .plugmcp/tests.json with `plugmcp test`,
// keeping the diagrams they make in a temporary folder instead of your own.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules", "plugmcp", "dist", "cli", "index.js");
const result = spawnSync(process.execPath, [cli, "test"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, MINDMAP_DIR: mkdtempSync(join(tmpdir(), "mindmap-tools-")) },
});
process.exit(result.status ?? 1);
