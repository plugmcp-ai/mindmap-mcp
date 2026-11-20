import type { MapNode } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { crossLinks, treeLinks } from "./lib/links.js";
import type { Box, Layout } from "./types.js";

/**
 * The classic mind map: the idea in the middle and branches all around it.
 * Each branch gets a slice of the circle as wide as it needs, and each level
 * sits on a ring far enough out that its nodes do not touch.
 */
export const mindmap: Layout = {
  id: "mindmap",
  label: "Mind map",
  description: "One idea in the middle, branches all around it. Best for exploring a topic.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size, compact }) {
    const tree = treeOf(doc);
    const kids = (node: MapNode) => tree.children.get(node.id) ?? [];
    const PAD = 14;

    // How much of the circle a subtree needs, in rough pixels of arc.
    const need = new Map<string, number>();
    const measure = (node: MapNode): number => {
      const s = size(node);
      const own = (s.w + s.h) / 2 + PAD;
      const inner = kids(node).reduce((sum, child) => sum + measure(child), 0);
      const total = Math.max(own, inner);
      need.set(node.id, total);
      return total;
    };
    measure(tree.root);

    // Give every node a slice of the circle.
    const slice = new Map<string, { start: number; width: number }>();
    const assign = (node: MapNode, start: number, width: number) => {
      slice.set(node.id, { start, width });
      const children = kids(node);
      const total = children.reduce((sum, child) => sum + need.get(child.id)!, 0);
      let at = start;
      for (const child of children) {
        const share = (need.get(child.id)! / total) * width;
        assign(child, at, share);
        at += share;
      }
    };
    // Start at the top left so the first branch reads like one o'clock on a map drawn by hand.
    assign(tree.root, -Math.PI / 2, Math.PI * 2);

    // Push each ring out until its nodes fit in their slices.
    const byDepth: MapNode[][] = [];
    for (const node of doc.nodes) (byDepth[tree.depth.get(node.id) ?? 0] ??= []).push(node);
    const radius: number[] = [0];
    for (let level = 1; level < byDepth.length; level += 1) {
      const nodes = byDepth[level] ?? [];
      const before = byDepth[level - 1] ?? [];
      const widest = (list: MapNode[]) => Math.max(...list.map((node) => size(node).w), 0);
      let r = radius[level - 1]! + (widest(before) + widest(nodes)) * 0.42 + 44;
      for (const node of nodes) {
        const { start, width } = slice.get(node.id)!;
        const angle = start + width / 2;
        const s = size(node);
        const across = Math.abs(Math.sin(angle)) * s.w + Math.abs(Math.cos(angle)) * s.h + PAD;
        // A slice wider than half the circle has all the room it needs.
        if (width < Math.PI) r = Math.max(r, across / width);
      }
      radius[level] = r;
    }

    const boxes: Box[] = doc.nodes.map((node) => {
      const s = size(node);
      const level = tree.depth.get(node.id) ?? 0;
      const { start, width } = slice.get(node.id)!;
      const angle = start + width / 2;
      const r = radius[level] ?? 0;
      // Screens are wider than tall: stretch the circle sideways, more so in the short inline card.
      const cx = level === 0 ? 0 : Math.cos(angle) * r * (compact ? 2 : 1.25);
      const cy = level === 0 ? 0 : Math.sin(angle) * r;
      return { id: node.id, x: cx - s.w / 2, y: cy - s.h / 2, ...s };
    });

    return {
      boxes,
      links: [...treeLinks(tree, doc, { shape: "taper", fromSide: "auto", toSide: "auto" }), ...crossLinks(tree)],
    };
  },
};
