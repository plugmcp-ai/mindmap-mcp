import type { Stored } from "../model/schema.js";

/** Where diagrams are kept. Swap this for a database to host the server for many users. */
export interface Store {
  get(docId: string): Promise<Stored | undefined>;
  put(stored: Stored): Promise<void>;
  /** The diagram that changed most recently. */
  latest(): Promise<Stored | undefined>;
  /** Write an exported file and return where it went. */
  writeExport(name: string, data: string | Uint8Array): Promise<string>;
}

const DOC_ID = /^[a-z0-9]{6,16}$/;

export function newDocId(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i += 1) id += letters[Math.floor(Math.random() * letters.length)];
  return id;
}

/** A docId goes into a file name, so only the form this server makes is accepted. */
export function isDocId(value: unknown): value is string {
  return typeof value === "string" && DOC_ID.test(value);
}

/** Keeps diagrams in memory. For tests. */
export class MemoryStore implements Store {
  readonly docs = new Map<string, Stored>();
  readonly exports = new Map<string, string | Uint8Array>();
  private last: string | undefined;

  async get(docId: string) {
    const found = this.docs.get(docId);
    return found ? (JSON.parse(JSON.stringify(found)) as Stored) : undefined;
  }
  async put(stored: Stored) {
    this.docs.set(stored.docId, JSON.parse(JSON.stringify(stored)) as Stored);
    this.last = stored.docId;
  }
  async latest() {
    return this.last ? this.get(this.last) : undefined;
  }
  async writeExport(name: string, data: string | Uint8Array) {
    this.exports.set(name, data);
    return `memory:${name}`;
  }
}
