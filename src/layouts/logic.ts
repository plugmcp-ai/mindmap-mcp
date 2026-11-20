import { treeOf } from "../model/tree.js";
import { bandTree } from "./lib/band-tree.js";
import { crossLinks, treeLinks } from "./lib/links.js";
import type { Layout } from "./types.js";

/** Everything grows to the right in neat columns, one per level. */
export const logic: Layout = {
  id: "logic",
  label: "Logic chart",
  description: "Grows to the right in columns, one per level. Best for breaking a whole into parts.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size }) {
    const tree = treeOf(doc);
    return {
      boxes: bandTree(tree, size, { direction: "right", gapMain: 48, gapCross: 12, align: true }),
      links: [...treeLinks(tree, doc, { shape: "taper", fromSide: "right", toSide: "left" }), ...crossLinks(tree)],
    };
  },
};
