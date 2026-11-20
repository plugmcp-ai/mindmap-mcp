import type { MapNode } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { crossLinks, treeLinks } from "./lib/links.js";
import type { Box, Layout } from "./types.js";

/** One node per row, indented by level, like a file tree. */
export const outline: Layout = {
  id: "outline",
  label: "Outline",
  description: "One node per row, indented by level. Best for long lists you read from top to bottom.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size }) {
    const tree = treeOf(doc);
    const INDENT = 28;
    const GAP = 8;
    const boxes: Box[] = [];
    let y = 0;
    const place = (node: MapNode, level: number) => {
      const s = size(node);
      boxes.push({ id: node.id, x: level * INDENT, y, ...s });
      y += s.h + GAP;
      for (const child of tree.children.get(node.id) ?? []) place(child, level + 1);
    };
    place(tree.root, 0);
    return {
      boxes,
      links: [...treeLinks(tree, doc, { shape: "elbow", fromSide: "bottom", toSide: "left" }), ...crossLinks(tree)],
    };
  },
};
