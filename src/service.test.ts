import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { launchPlan } from "./fixtures.js";
import { createService, type Result, type Shown } from "./service.js";
import { FileStore } from "./store/file.js";
import { MemoryStore, isDocId, newDocId } from "./store/store.js";

const textOf = (result: Result) => result.content.map((block) => block.text).join("\n");

async function made() {
  const store = new MemoryStore();
  const service = createService(store);
  const first = await service.visualize({ ...launchPlan });
  const { docId } = first.structuredContent as Shown;
  return { store, service, docId, first };
}

describe("service", () => {
  it("creates a diagram and answers with an outline a text-only client can show", async () => {
    const { first, docId } = await made();
    expect(isDocId(docId)).toBe(true);
    const text = textOf(first);
    expect(text).toContain(`docId ${docId}, revision 1`);
    expect(text).toContain("- [root] Product launch");
    expect((first.structuredContent as Shown).doc.nodes).toHaveLength(launchPlan.nodes.length);
  });

  it("shows an existing diagram again from its docId alone", async () => {
    const { service, docId } = await made();
    const again = await service.visualize({ docId });
    expect((again.structuredContent as Shown).revision).toBe(1);
    expect((await service.visualize({ docId: "zzzzzzzz" })).isError).toBe(true);
    expect((await service.visualize({})).isError).toBe(true);
  });

  it("tells the model what the user changed on the canvas", async () => {
    const { service, docId } = await made();
    await service.save({
      docId,
      ops: [
        { op: "update_node", id: "price", label: "Pricing tiers" },
        { op: "comment", id: "price2", text: "is this needed?" },
      ],
    });
    const read = textOf(await service.read({ docId }));
    expect(read).toContain("Changed by the user since revision 1:");
    expect(read).toContain('renamed price: "Pricing" -> "Pricing tiers"');
    expect(read).toContain('on price2 "Hosted plan": "is this needed?"');

    const edit = await service.edit({ docId, ops: [{ op: "remove_node", id: "price2" }] });
    expect(textOf(edit)).toContain("The user also changed, before this edit:");
    expect((edit.structuredContent as Shown).revision).toBe(3);
    // Once the model has answered, the old changes are not reported again.
    expect(textOf(await service.read({ docId }))).not.toContain("Changed by the user");
  });

  it("lets the view poll for a newer revision", async () => {
    const { service, docId } = await made();
    expect((await service.load({ docId, sinceRevision: 1 })).structuredContent).toEqual({ unchanged: true, revision: 1 });
    await service.edit({ docId, ops: [{ op: "add_node", parent: "msg", label: "Private by default" }] });
    const next = (await service.load({ docId, sinceRevision: 1 })).structuredContent as Shown;
    expect(next.revision).toBe(2);
    expect(next.doc.nodes).toHaveLength(launchPlan.nodes.length + 1);
  });

  it("reports ops that fail without losing the ones that work", async () => {
    const { service, docId } = await made();
    const edit = await service.edit({
      docId,
      ops: [
        { op: "update_node", id: "ghost", label: "X" },
        { op: "update_node", id: "msg", label: "Story" },
      ],
    });
    expect(textOf(edit)).toContain("Not applied:");
    expect(textOf(edit)).toContain('renamed msg: "Message" -> "Story"');
  });

  it("exports Markdown and JSON, and needs data for images", async () => {
    const { service, store, docId } = await made();
    await service.export({ docId, format: "md" });
    expect([...store.exports.keys()][0]).toBe(`Product-launch-${docId}.md`);
    expect((await service.export({ docId, format: "svg" })).isError).toBe(true);
    await service.export({ docId, format: "svg", data: "<svg/>" });
    expect(store.exports.get(`Product-launch-${docId}.svg`)).toBe("<svg/>");
  });
});

describe("FileStore", () => {
  it("keeps one JSON file per diagram and finds the latest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mindmap-"));
    const service = createService(new FileStore(dir));
    const { docId } = (await service.visualize({ ...launchPlan })).structuredContent as Shown;
    expect(readdirSync(dir)).toEqual([`${docId}.json`]);
    expect(JSON.parse(readFileSync(join(dir, `${docId}.json`), "utf8")).doc.title).toBe("Product launch");
    expect(((await service.read({})).structuredContent as Shown).docId).toBe(docId);
  });

  it("never turns an id into a path outside its folder", async () => {
    const store = new FileStore(mkdtempSync(join(tmpdir(), "mindmap-")));
    expect(await store.get("../../etc/passwd")).toBeUndefined();
    expect(await store.get("..")).toBeUndefined();
    await expect(store.put({ docId: "../x", revision: 1, doc: launchPlan, comments: [], log: [], createdAt: "", updatedAt: "" })).rejects.toThrow();
    await expect(store.writeExport("../evil.svg", "x")).rejects.toThrow();
    expect(isDocId(newDocId())).toBe(true);
  });
});
