import { normalize } from "./model/normalize.js";
import { applyOps } from "./model/ops.js";
import { commentLines, lastModelRevision, outline, summary, toMarkdown, userChangesSince } from "./model/outline.js";
import type { Doc, Op, Stored } from "./model/schema.js";
import { isDocId, newDocId, type Store } from "./store/store.js";

/**
 * What the tools do, kept apart from the MCP wiring so it can be tested
 * with a store in memory.
 */

const LOG_LIMIT = 50;

export interface Shown {
  [key: string]: unknown;
  docId: string;
  revision: number;
  doc: Doc;
  comments: Stored["comments"];
}

const shown = (stored: Stored): Shown => ({
  docId: stored.docId,
  revision: stored.revision,
  doc: stored.doc,
  comments: stored.comments,
});

/** A tool result: text for the model, data for the view. */
export interface Result {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const result = (text: string, stored: Stored): Result => ({
  content: [{ type: "text", text }],
  structuredContent: shown(stored),
});

const fail = (text: string): Result => ({ content: [{ type: "text", text }], isError: true });

function record(stored: Stored, by: "user" | "model", changes: string[], comments: Array<{ node: string; text: string }> = []): Stored {
  const at = new Date().toISOString();
  const revision = stored.revision + 1;
  return {
    ...stored,
    revision,
    updatedAt: at,
    comments: [...stored.comments, ...comments.map((comment) => ({ ...comment, by, at }))].slice(-100),
    log: [...stored.log, { revision, by, changes, at }].slice(-LOG_LIMIT),
  };
}

export function createService(store: Store) {
  const missing = (docId: unknown) =>
    fail(`No diagram with docId "${String(docId)}". Call visualize with the full diagram to make one.`);

  return {
    /** Create a diagram, replace one, or show an existing one again. */
    async visualize(input: Record<string, unknown>): Promise<Result> {
      const docId = input.docId;
      const hasContent = Array.isArray(input.nodes) && input.nodes.length > 0;
      if (!hasContent) {
        if (!isDocId(docId)) return fail("Send the nodes of a new diagram, or the docId of one to show again.");
        const stored = await store.get(docId);
        if (!stored) return missing(docId);
        return result(`Showing ${summary(stored)}\n${outline(stored.doc, { maxChars: 6000 })}`, stored);
      }
      const doc = normalize(input);
      if (!doc) return fail("No node had both an id and a label. Give every node a short id and a label.");
      const at = new Date().toISOString();
      const existing = isDocId(docId) ? await store.get(docId) : undefined;
      const base: Stored = existing
        ? { ...existing, doc }
        : { docId: newDocId(), revision: 0, doc, comments: [], log: [], createdAt: at, updatedAt: at };
      const stored = record(base, "model", [existing ? "replaced the diagram" : "created the diagram"]);
      await store.put(stored);
      return result(
        `Showing ${summary(stored)}\nThe user can edit it, comment on nodes and ask about a node. To change it, call edit_diagram with this docId.\n${outline(doc, { maxChars: 6000 })}`,
        stored,
      );
    },

    /** Apply the model's changes to a diagram the user already has on screen. */
    async edit(input: { docId: string; ops: Op[] }): Promise<Result> {
      const stored = await store.get(input.docId);
      if (!stored) return missing(input.docId);
      const sinceModel = lastModelRevision(stored);
      const userChanges = userChangesSince(stored, sinceModel);
      const applied = applyOps(stored.doc, input.ops);
      const next = applied.changes.length ? record({ ...stored, doc: applied.doc }, "model", applied.changes, applied.comments) : stored;
      if (next !== stored) await store.put(next);
      const lines = [
        applied.changes.length ? `Updated ${summary(next)}` : `Nothing changed in ${summary(next)}`,
        ...applied.changes.map((line) => `- ${line}`),
        ...(applied.errors.length ? ["Not applied:", ...applied.errors.map((line) => `- ${line}`)] : []),
        ...(userChanges.length ? ["The user also changed, before this edit:", ...userChanges.map((line) => `- ${line}`)] : []),
        "The open diagram updates itself. If the user cannot see it any more, call visualize with only this docId.",
      ];
      return result(lines.join("\n"), next);
    },

    /** The diagram as text, for the model and for clients that cannot draw it. */
    async read(input: { docId?: string; sinceRevision?: number }): Promise<Result> {
      const stored = input.docId ? await store.get(input.docId) : await store.latest();
      if (!stored) return input.docId ? missing(input.docId) : fail("There is no diagram yet. Call visualize to make one.");
      const since = input.sinceRevision ?? lastModelRevision(stored);
      const changes = userChangesSince(stored, since);
      const comments = commentLines(stored.comments, stored.doc);
      const lines = [
        summary(stored),
        outline(stored.doc),
        ...(changes.length ? [`Changed by the user since revision ${since}:`, ...changes.map((line) => `- ${line}`)] : []),
        ...(comments.length ? ["Comments from the user:", ...comments.map((line) => `- ${line}`)] : []),
      ];
      return result(lines.join("\n"), stored);
    },

    /** The view asks for the diagram, or for nothing when it is already up to date. */
    async load(input: { docId: string; sinceRevision?: number }): Promise<Result> {
      const stored = await store.get(input.docId);
      if (!stored) return missing(input.docId);
      if (input.sinceRevision !== undefined && stored.revision <= input.sinceRevision) {
        return { content: [{ type: "text", text: "Up to date." }], structuredContent: { unchanged: true, revision: stored.revision } };
      }
      return result(`Revision ${stored.revision}.`, stored);
    },

    /** The view saves what the user did on the canvas. */
    async save(input: { docId: string; ops: Op[] }): Promise<Result> {
      const stored = await store.get(input.docId);
      if (!stored) return missing(input.docId);
      const applied = applyOps(stored.doc, input.ops);
      if (!applied.changes.length) return result(`Revision ${stored.revision}.`, stored);
      const next = record({ ...stored, doc: applied.doc }, "user", applied.changes, applied.comments);
      await store.put(next);
      return result(`Saved revision ${next.revision}.`, next);
    },

    /** Write the diagram to a file, for hosts that cannot download from the view. */
    async export(input: { docId: string; format: "svg" | "png" | "json" | "md"; data?: string }): Promise<Result> {
      const stored = await store.get(input.docId);
      if (!stored) return missing(input.docId);
      const base = `${stored.doc.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "diagram"}-${stored.docId}`;
      let data: string | Uint8Array;
      if (input.format === "json") data = JSON.stringify(stored.doc, null, 2);
      else if (input.format === "md") data = toMarkdown(stored.doc);
      else if (!input.data) return fail(`The view has to send the ${input.format} data.`);
      else if (input.format === "png") data = Buffer.from(input.data.replace(/^data:image\/png;base64,/, ""), "base64");
      else data = input.data;
      const path = await store.writeExport(`${base}.${input.format}`, data);
      return { content: [{ type: "text", text: `Saved to ${path}` }], structuredContent: { path } };
    },
  };
}

export type Service = ReturnType<typeof createService>;
