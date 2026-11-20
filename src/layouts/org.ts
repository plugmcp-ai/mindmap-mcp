import { treeOf } from "../model/tree.js";
import { bandTree } from "./lib/band-tree.js";
import { crossLinks, treeLinks } from "./lib/links.js";
import type { Layout } from "./types.js";

/** The root on top and each level on its own row below it. */
export const org: Layout = {
  id: "org",
  label: "Org chart",
  description: "The root on top, each level on a row below. Best for hierarchies and who reports to whom.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size }) {
    const tree = treeOf(doc);
    return {
      boxes: bandTree(tree, size, { direction: "down", gapMain: 44, gapCross: 16, align: true }),
      links: [...treeLinks(tree, doc, { shape: "elbow", fromSide: "bottom", toSide: "top" }), ...crossLinks(tree)],
    };
  },
};
