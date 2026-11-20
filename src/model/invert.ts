import { applyOps } from "./ops.js";
import type { Doc, Op } from "./schema.js";
import { subtree } from "./tree.js";

/**
 * The ops that undo `ops`, when applied to the document after them.
 * Used for undo on the canvas.
 */
export function invert(before: Doc, ops: Op[]): Op[] {
  const undo: Op[][] = [];
  let doc = before;
  for (const op of ops) {
    const back: Op[] = [];
    const find = (id: string) => doc.nodes.find((node) => node.id === id);
    // The sibling just before a node, to put it back in the same place.
    const before = (id: string) => {
      const node = find(id);
      const siblings = doc.nodes.filter((item) => item.parent === node?.parent);
      return siblings[siblings.findIndex((item) => item.id === id) - 1]?.id;
    };
    switch (op.op) {
      case "add_node":
        if (op.id) back.push({ op: "remove_node", id: op.id });
        break;
      case "update_node": {
        const node = find(op.id);
        if (!node) break;
        const old: Record<string, unknown> = {};
        for (const key of ["label", "note", "status", "kind", "lane", "collapsed"] as const) {
          if (op[key] !== undefined && node[key] !== undefined) old[key] = node[key];
        }
        if (Object.keys(old).length) back.push({ op: "update_node", id: op.id, ...old });
        break;
      }
      case "move_node": {
        const node = find(op.id);
        if (node?.parent) back.push({ op: "move_node", id: op.id, parent: node.parent, after: before(op.id) });
        break;
      }
      case "remove_node": {
        const under = subtree(doc, op.id);
        const removed = doc.nodes.filter((node) => under.has(node.id));
        removed.forEach((node, index) => {
          const { id, label, parent, ...rest } = node;
          back.push({ op: "add_node", id, label, ...(parent ? { parent } : {}), ...(index === 0 ? { after: before(id) } : {}), ...rest });
        });
        for (const edge of doc.edges ?? []) {
          if (under.has(edge.from) || under.has(edge.to)) back.push({ op: "add_edge", ...edge });
        }
        break;
      }
      case "add_edge":
        back.push({ op: "remove_edge", from: op.from, to: op.to });
        break;
      case "remove_edge": {
        const edge = doc.edges?.find((item) => item.from === op.from && item.to === op.to);
        if (edge) back.push({ op: "add_edge", ...edge });
        break;
      }
      case "set": {
        const old: Record<string, unknown> = {};
        if (op.title !== undefined) old.title = doc.title;
        if (op.structure !== undefined) old.structure = doc.structure;
        if (op.theme !== undefined) old.theme = doc.theme ?? "host";
        if (op.animate !== undefined) old.animate = doc.animate ?? true;
        back.push({ op: "set", ...old });
        break;
      }
      case "comment":
        break;
    }
    undo.unshift(back);
    doc = applyOps(doc, [op]).doc;
  }
  return undo.flat();
}
