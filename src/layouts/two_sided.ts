import type { MapNode } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { bandTree, weight } from "./lib/band-tree.js";
import { crossLinks, treeLinks } from "./lib/links.js";
import type { Layout } from "./types.js";

/** Branches to the left and right of the idea, balanced so both sides are about as tall. */
export const twoSided: Layout = {
  id: "two_sided",
  label: "Two sided",
  description: "Branches to the left and right of the idea. Wide and short, so it fits a chat card well.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size }) {
    const tree = treeOf(doc);
    const top = tree.children.get(tree.root.id) ?? [];
    const GAP = 14;
    // Fill the right side until it holds half the total height, then the left.
    const total = top.reduce((sum, node) => sum + weight(tree, node, size, GAP), 0);
    const right: MapNode[] = [];
    const left: MapNode[] = [];
    let used = 0;
    for (const node of top) {
      const w = weight(tree, node, size, GAP);
      if (right.length === 0 || used + w / 2 <= total / 2) {
        right.push(node);
        used += w;
      } else {
        left.push(node);
      }
    }
    const options = { gapMain: 56, gapCross: GAP } as const;
    const rightBoxes = bandTree(tree, size, { ...options, direction: "right", rootChildren: right });
    // The left side reads top to bottom in the same order it was written.
    const leftBoxes = bandTree(tree, size, { ...options, direction: "left", rootChildren: left });
    const onLeft = new Set(leftBoxes.slice(1).map((box) => box.id));
    return {
      boxes: [...rightBoxes, ...leftBoxes.slice(1)],
      links: [
        ...treeLinks(tree, doc, {
          shape: "taper",
          fromSide: (child) => (onLeft.has(child) ? "left" : "right"),
          toSide: (child) => (onLeft.has(child) ? "right" : "left"),
        }),
        ...crossLinks(tree),
      ],
    };
  },
};
