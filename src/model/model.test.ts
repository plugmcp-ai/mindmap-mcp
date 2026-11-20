import { describe, expect, it } from "vitest";
import { launchPlan, signupFlow } from "../fixtures.js";
import { normalize, normalizePartial } from "./normalize.js";
import { applyOps } from "./ops.js";
import { outline, toMarkdown } from "./outline.js";
import { Doc, Op } from "./schema.js";
import { graphOf, treeOf } from "./tree.js";

describe("schema", () => {
  it("accepts the sample diagrams", () => {
    expect(Doc.safeParse(launchPlan).success).toBe(true);
    expect(Doc.safeParse(signupFlow).success).toBe(true);
  });
  it("refuses an id that could be a path", () => {
    expect(Op.safeParse({ op: "remove_node", id: "../x" }).success).toBe(false);
  });
});

describe("normalize", () => {
  it("drops nodes without an id or a label, and repeated ids", () => {
    const doc = normalize({
      title: "T",
      structure: "mindmap",
      nodes: [{ id: "a", label: "A" }, { id: "b" }, { label: "no id" }, { id: "a", label: "again" }, { id: "c", label: "C", parent: "zz" }],
      edges: [{ from: "a", to: "missing" }, { from: "a", to: "c", label: "ok" }],
    });
    expect(doc?.nodes.map((node) => node.id)).toEqual(["a", "c"]);
    expect(doc?.nodes[1]?.parent).toBeUndefined();
    expect(doc?.edges).toEqual([{ from: "a", to: "c", label: "ok" }]);
  });
  it("returns nothing when no node is usable", () => {
    expect(normalize({ nodes: [{ id: "a" }] })).toBeUndefined();
    expect(normalize(undefined)).toBeUndefined();
  });
  it("guesses a flowchart from edges without parents", () => {
    expect(normalize({ nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [{ from: "a", to: "b" }] })?.structure).toBe("flowchart");
  });
  it("holds back the last node while the input streams", () => {
    const partial = normalizePartial({ title: "T", structure: "logic", nodes: [{ id: "a", label: "A" }, { id: "b", label: "Half a la" }] });
    expect(partial?.nodes.map((node) => node.id)).toEqual(["a"]);
  });
});

describe("treeOf", () => {
  it("reads parents, depth and branches", () => {
    const tree = treeOf(launchPlan);
    expect(tree.root.id).toBe("root");
    expect(tree.children.get("root")?.map((node) => node.id)).toEqual(["aud", "msg", "chan", "price", "risk", "time"]);
    expect(tree.depth.get("chan3")).toBe(2);
    expect(tree.branch.get("chan3")).toBe(2);
    expect(tree.links).toEqual([{ from: "chan3", to: "msg1", label: "shows" }]);
  });
  it("reads a flowchart as a tree through its edges", () => {
    const tree = treeOf(signupFlow);
    expect(tree.root.id).toBe("start");
    const reached = new Set<string>();
    const walk = (id: string) => {
      reached.add(id);
      for (const child of tree.children.get(id) ?? []) walk(child.id);
    };
    walk(tree.root.id);
    expect(reached.size).toBe(signupFlow.nodes.length);
  });
  it("survives a parent loop", () => {
    const tree = treeOf({
      title: "Loop",
      structure: "mindmap",
      nodes: [
        { id: "r", label: "R" },
        { id: "a", label: "A", parent: "b" },
        { id: "b", label: "B", parent: "a" },
      ],
    });
    expect([...tree.depth.keys()].sort()).toEqual(["a", "b", "r"]);
  });
  it("reads a tree as a graph through its parents", () => {
    expect(graphOf(launchPlan).edges.length).toBe(launchPlan.nodes.length - 1 + 1);
  });
});

describe("applyOps", () => {
  it("adds, renames, moves and removes", () => {
    const { doc, changes, errors } = applyOps(launchPlan, [
      { op: "add_node", id: "price3", parent: "price", label: "Team plan" },
      { op: "update_node", id: "price", label: "Pricing tiers" },
      { op: "move_node", id: "risk", parent: "time" },
      { op: "remove_node", id: "aud" },
      { op: "set", structure: "logic" },
    ]);
    expect(errors).toEqual([]);
    expect(changes).toEqual([
      'added price3 "Team plan" under price "Pricing"',
      'renamed price: "Pricing" -> "Pricing tiers"',
      'moved risk "Risks" under time "Timeline"',
      'removed aud "Audience" and 3 below it',
      "set structure to logic",
    ]);
    expect(doc.nodes.find((node) => node.id === "aud1")).toBeUndefined();
    expect(doc.nodes.find((node) => node.id === "risk")?.parent).toBe("time");
    expect(doc.structure).toBe("logic");
    // The new node follows its siblings.
    const ids = doc.nodes.map((node) => node.id);
    expect(ids.indexOf("price3")).toBe(ids.indexOf("price2") + 1);
    expect(Doc.safeParse(doc).success).toBe(true);
  });
  it("leaves the input untouched", () => {
    const before = JSON.stringify(launchPlan);
    applyOps(launchPlan, [{ op: "remove_node", id: "aud" }]);
    expect(JSON.stringify(launchPlan)).toBe(before);
  });
  it("reports an op it cannot apply and still applies the rest", () => {
    const { changes, errors } = applyOps(launchPlan, [
      { op: "update_node", id: "nope", label: "X" },
      { op: "move_node", id: "aud", parent: "aud1" },
      { op: "add_node", id: "aud", label: "Twice" },
      { op: "update_node", id: "msg", label: "Story" },
    ]);
    expect(errors).toHaveLength(3);
    expect(changes).toEqual(['renamed msg: "Message" -> "Story"']);
  });
  it("removes the edges of a removed node", () => {
    const { doc } = applyOps(launchPlan, [{ op: "remove_node", id: "chan3" }]);
    expect(doc.edges).toBeUndefined();
  });
  it("makes an id when none is given, and carries comments", () => {
    const { doc, comments } = applyOps(launchPlan, [
      { op: "add_node", parent: "msg", label: "Private by default" },
      { op: "comment", id: "price2", text: "is this needed?" },
    ]);
    expect(doc.nodes.find((node) => node.label === "Private by default")?.id).toMatch(/^n\d+$/);
    expect(new Set(doc.nodes.map((node) => node.id)).size).toBe(doc.nodes.length);
    expect(comments).toEqual([{ node: "price2", text: "is this needed?" }]);
  });
});

describe("outline", () => {
  it("shows ids, nesting and links", () => {
    const text = outline(launchPlan);
    expect(text).toContain("- [root] Product launch");
    expect(text).toContain("    - [chan3] Demo video (doing)");
    expect(text).toContain("chan3 -> msg1 (shows)");
  });
  it("cuts a long outline down to the top levels and the focused branch", () => {
    const text = outline(launchPlan, { maxChars: 400, focus: "price" });
    expect(text).toContain("[price1]");
    expect(text).not.toContain("[aud1]");
    expect(text).toContain("left out");
  });
  it("exports Markdown", () => {
    expect(toMarkdown(launchPlan)).toContain("# Product launch\n\n- Audience\n  - Indie developers");
  });
});

describe("compactChanges", () => {
  it("keeps the last of each view setting and every real edit", async () => {
    const { compactChanges } = await import("./outline.js");
    expect(compactChanges(["set structure to logic", 'renamed a: "A" -> "B"', "set theme to mono", "set structure to org"])).toEqual([
      'renamed a: "A" -> "B"',
      "set theme to mono",
      "set structure to org",
    ]);
  });
});
