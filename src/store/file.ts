import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Stored } from "../model/schema.js";
import { isDocId, type Store } from "./store.js";

export function defaultDir(): string {
  return process.env.MINDMAP_DIR || join(homedir(), ".plugmcp", "mindmap");
}

/** One JSON file per diagram on this machine. Nothing leaves the computer. */
export class FileStore implements Store {
  constructor(private readonly dir: string = defaultDir()) {}

  private file(docId: string): string {
    if (!isDocId(docId)) throw new Error(`"${docId}" is not a diagram id.`);
    return join(this.dir, `${docId}.json`);
  }

  async get(docId: string): Promise<Stored | undefined> {
    if (!isDocId(docId)) return undefined;
    const file = this.file(docId);
    if (!existsSync(file)) return undefined;
    try {
      return JSON.parse(readFileSync(file, "utf8")) as Stored;
    } catch {
      return undefined;
    }
  }

  async put(stored: Stored): Promise<void> {
    const file = this.file(stored.docId);
    mkdirSync(this.dir, { recursive: true });
    // Write beside the file, then swap, so a crash never leaves half a diagram.
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(stored, null, 2));
    renameSync(temp, file);
  }

  async latest(): Promise<Stored | undefined> {
    if (!existsSync(this.dir)) return undefined;
    let best: { id: string; time: number } | undefined;
    for (const name of readdirSync(this.dir)) {
      const id = name.endsWith(".json") ? name.slice(0, -5) : "";
      if (!isDocId(id)) continue;
      const time = statSync(join(this.dir, name)).mtimeMs;
      if (!best || time > best.time) best = { id, time };
    }
    return best ? this.get(best.id) : undefined;
  }

  async writeExport(name: string, data: string | Uint8Array): Promise<string> {
    if (!/^[A-Za-z0-9_-]{1,80}\.(svg|png|json|md)$/.test(name)) throw new Error("That file name is not allowed.");
    const dir = join(this.dir, "exports");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, name);
    writeFileSync(file, data);
    return file;
  }
}
