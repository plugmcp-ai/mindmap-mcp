import type { MapNode } from "../../model/schema.js";
import type { Tree } from "../../model/tree.js";
import type { Box, Size } from "../types.js";

export interface BandOptions {
  /** The way the tree grows away from its root. */
  direction: "right" | "left" | "down" | "up";
  /** Space between a parent and its children. */
  gapMain: number;
  /** Space between siblings. */
  gapCross: number;
  /** Line every level up, as in a chart. Off gives the looser mind map look. */
  align?: boolean;
  /** Children to lay out under the root. Default: all of them. */
  rootChildren?: MapNode[];
}

/**
 * A tidy tree for nodes of different sizes. Each subtree gets a band as wide as
 * it needs, and a parent sits in the middle of the band of its children, so
 * nothing overlaps. The root's top-left corner is at 0,0.
 */
export function bandTree(tree: Tree, size: (node: MapNode) => Size, options: BandOptions): Box[] {
  const { direction, gapMain, gapCross, align = false } = options;
  const horizontal = direction === "right" || direction === "left";
  const sign = direction === "right" || direction === "down" ? 1 : -1;
  // "main" runs away from the root, "cross" runs across the siblings.
  const main = (s: Size) => (horizontal ? s.w : s.h);
  const cross = (s: Size) => (horizontal ? s.h : s.w);
  const kids = (node: MapNode) => (node.id === tree.root.id && options.rootChildren ? options.rootChildren : (tree.children.get(node.id) ?? []));

  const band = new Map<string, number>();
  const measure = (node: MapNode): number => {
    const children = kids(node);
    const inner = children.reduce((sum, child) => sum + measure(child), 0) + Math.max(children.length - 1, 0) * gapCross;
    const total = Math.max(cross(size(node)), inner);
    band.set(node.id, total);
    return total;
  };
  measure(tree.root);

  // With align on, every node of a level starts at the same distance from the root.
  const levelMain: number[] = [];
  if (align) {
    const collect = (node: MapNode, level: number) => {
      levelMain[level] = Math.max(levelMain[level] ?? 0, main(size(node)));
      for (const child of kids(node)) collect(child, level + 1);
    };
    collect(tree.root, 0);
  }

  const boxes: Box[] = [];
  const place = (node: MapNode, level: number, mainStart: number, crossStart: number) => {
    const s = size(node);
    const total = band.get(node.id)!;
    const crossAt = crossStart + (total - cross(s)) / 2;
    // mainStart is the edge nearest the root. Growing left or up, the box sits before it.
    const mainAt = sign === 1 ? mainStart : mainStart - main(s);
    boxes.push(horizontal ? { id: node.id, x: mainAt, y: crossAt, ...s } : { id: node.id, x: crossAt, y: mainAt, ...s });
    const children = kids(node);
    const span = align ? levelMain[level]! : main(s);
    const childStart = mainStart + sign * (span + gapMain);
    const inner = children.reduce((sum, child) => sum + band.get(child.id)!, 0) + Math.max(children.length - 1, 0) * gapCross;
    let at = crossStart + (total - inner) / 2;
    for (const child of children) {
      place(child, level + 1, childStart, at);
      at += band.get(child.id)! + gapCross;
    }
  };
  place(tree.root, 0, sign === 1 ? 0 : main(size(tree.root)), 0);

  // Put the root's corner at 0,0.
  const root = boxes[0]!;
  const dx = root.x;
  const dy = root.y;
  for (const box of boxes) {
    box.x -= dx;
    box.y -= dy;
  }
  return boxes;
}

/** Height or width a set of root children needs, to balance the two sides of a map. */
export function weight(tree: Tree, node: MapNode, size: (node: MapNode) => Size, gap: number): number {
  const children = tree.children.get(node.id) ?? [];
  const inner = children.reduce((sum, child) => sum + weight(tree, child, size, gap), 0) + Math.max(children.length - 1, 0) * gap;
  return Math.max(size(node).h, inner);
}
