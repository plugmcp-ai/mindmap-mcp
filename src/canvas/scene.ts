import { layoutFor } from "../layouts/index.js";
import { fitLabel, type Fit, type MeasureText } from "../layouts/lib/measure.js";
import type { Band, Box, Layout, Link } from "../layouts/types.js";
import type { Doc, MapNode, Structure } from "../model/schema.js";
import { treeOf, type Tree } from "../model/tree.js";

/** Everything the canvas needs to draw one diagram in one structure. */
export interface Scene {
  layout: Layout;
  /** The nodes that are drawn: the document without what is folded away. */
  doc: Doc;
  tree: Tree;
  boxes: Box[];
  links: Link[];
  bands: Band[];
  /** Wrapped label and font for each node. */
  fits: Map<string, Fit>;
  /** How many nodes are folded away under a node. */
  hidden: Map<string, number>;
  /** Nodes that have children, folded or not. */
  parents: Set<string>;
  bounds: { x: number; y: number; w: number; h: number };
}

export function buildScene(
  full: Doc,
  structure: Structure,
  options: { measure: MeasureText; compact: boolean; collapsed: ReadonlySet<string>; limit?: number },
): Scene {
  const layout = layoutFor(structure);
  const fullTree = treeOf(full);

  // Take out everything under a folded node, and count it.
  const hidden = new Map<string, number>();
  const gone = new Set<string>();
  const count = (id: string): number => {
    let total = 0;
    for (const child of fullTree.children.get(id) ?? []) {
      gone.add(child.id);
      total += 1 + count(child.id);
    }
    return total;
  };
  const walk = (node: MapNode) => {
    if (options.collapsed.has(node.id) && (fullTree.children.get(node.id) ?? []).length) {
      hidden.set(node.id, count(node.id));
      return;
    }
    for (const child of fullTree.children.get(node.id) ?? []) walk(child);
  };
  walk(fullTree.root);
  const parents = new Set<string>();
  for (const [id, children] of fullTree.children) if (children.length) parents.add(id);

  let nodes = full.nodes.filter((node) => !gone.has(node.id));
  // While a diagram is being revealed, only the first nodes are drawn yet.
  if (options.limit !== undefined && options.limit < nodes.length) {
    const first = new Set(nodes.slice(0, Math.max(options.limit, 1)).map((node) => node.id));
    nodes = nodes.filter((node) => first.has(node.id));
  }
  const kept = new Set(nodes.map((node) => node.id));
  const doc: Doc = {
    ...full,
    nodes,
    edges: full.edges?.filter((edge) => kept.has(edge.from) && kept.has(edge.to)),
  };
  const tree = treeOf(doc);

  const fits = new Map<string, Fit>();
  for (const node of doc.nodes) {
    const depth = layout.nodes === "shape" ? 2 : (tree.depth.get(node.id) ?? 0);
    const shape = layout.nodes === "shape" ? (node.kind ?? "step") : "branch";
    fits.set(node.id, fitLabel(node.label, depth, options.measure, shape));
  }
  const result = layout.layout({
    doc,
    size: (node) => {
      const fit = fits.get(node.id)!;
      return { w: fit.w, h: fit.h };
    },
    compact: options.compact,
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of [...result.boxes, ...(result.bands ?? [])]) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }
  if (!Number.isFinite(minX)) [minX, minY, maxX, maxY] = [0, 0, 1, 1];

  return {
    layout,
    doc,
    tree,
    boxes: result.boxes,
    links: result.links,
    bands: result.bands ?? [],
    fits,
    hidden,
    parents,
    bounds: { x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1) },
  };
}

/** Measure text with a canvas, in the theme's font. Falls back to a rough guess without a DOM. */
export function createMeasure(font: string): MeasureText {
  const cache = new Map<string, number>();
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = document.createElement("canvas").getContext("2d");
  } catch {
    context = null;
  }
  // A canvas cannot read CSS variables: use the fallback inside var(--x, fallback).
  const family = font.replace(/var\([^,]+,\s*(.+)\)$/, "$1");
  return (text, size, weight) => {
    const key = `${weight}|${size}|${text}`;
    const known = cache.get(key);
    if (known !== undefined) return known;
    let width = text.length * size * 0.56;
    if (context) {
      context.font = `${weight} ${size}px ${family}`;
      width = context.measureText(text).width;
    }
    cache.set(key, width);
    return width;
  };
}
