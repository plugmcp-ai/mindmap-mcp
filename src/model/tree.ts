import type { Doc, MapEdge, MapNode } from "./schema.js";

export interface Tree {
  root: MapNode;
  /** Children of each node id, in document order. */
  children: Map<string, MapNode[]>;
  /** Depth of each node id. The root is 0. */
  depth: Map<string, number>;
  /** Top-level branch each node belongs to: index among the root's children. -1 for the root. */
  branch: Map<string, number>;
  /** Edges that are not part of the tree, drawn as cross links. */
  links: MapEdge[];
}

/**
 * Read any document as a tree. Parent links come first. Nodes without a parent
 * are reached through edges where possible, and hang off the root otherwise,
 * so a flowchart can still be shown as a mind map.
 */
export function treeOf(doc: Doc): Tree {
  const nodes = doc.nodes;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parentOf = new Map<string, string>();
  const root = nodes.find((node) => !node.parent || !byId.has(node.parent)) ?? nodes[0]!;

  for (const node of nodes) {
    if (node.id !== root.id && node.parent && byId.has(node.parent) && node.parent !== node.id) parentOf.set(node.id, node.parent);
  }
  // Break parent cycles: a node that cannot reach the root loses its parent.
  for (const node of nodes) {
    const seen = new Set<string>([node.id]);
    let at = parentOf.get(node.id);
    while (at && at !== root.id) {
      if (seen.has(at)) {
        parentOf.delete(node.id);
        break;
      }
      seen.add(at);
      at = parentOf.get(at);
    }
  }

  const used = new Set<string>();
  const edges = doc.edges ?? [];
  const reached = new Set<string>([root.id]);
  const markReached = () => {
    let grew = true;
    while (grew) {
      grew = false;
      for (const [child, parent] of parentOf) {
        if (!reached.has(child) && reached.has(parent)) {
          reached.add(child);
          grew = true;
        }
      }
    }
  };
  markReached();
  // Walk edges outward from what is already in the tree.
  let grew = true;
  while (grew) {
    grew = false;
    for (const [index, edge] of edges.entries()) {
      if (!byId.has(edge.from) || !byId.has(edge.to) || edge.to === root.id) continue;
      if (reached.has(edge.from) && !reached.has(edge.to) && !parentOf.has(edge.to)) {
        parentOf.set(edge.to, edge.from);
        used.add(String(index));
        markReached();
        grew = true;
      }
    }
  }
  for (const node of nodes) {
    if (!reached.has(node.id)) {
      if (!parentOf.has(node.id)) parentOf.set(node.id, root.id);
      markReached();
    }
  }

  const children = new Map<string, MapNode[]>(nodes.map((node) => [node.id, []]));
  for (const node of nodes) {
    const parent = parentOf.get(node.id);
    if (parent) children.get(parent)?.push(node);
  }

  const depth = new Map<string, number>();
  const branch = new Map<string, number>();
  const walk = (node: MapNode, level: number, top: number) => {
    depth.set(node.id, level);
    branch.set(node.id, top);
    (children.get(node.id) ?? []).forEach((child, index) => walk(child, level + 1, level === 0 ? index : top));
  };
  walk(root, 0, -1);

  const links = edges.filter(
    (edge, index) =>
      !used.has(String(index)) &&
      byId.has(edge.from) &&
      byId.has(edge.to) &&
      parentOf.get(edge.to) !== edge.from &&
      parentOf.get(edge.from) !== edge.to,
  );
  return { root, children, depth, branch, links };
}

/** Read any document as a graph: explicit edges plus every parent link. */
export function graphOf(doc: Doc): { nodes: MapNode[]; edges: MapEdge[] } {
  const ids = new Set(doc.nodes.map((node) => node.id));
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: MapEdge) => {
    const key = `${edge.from}>${edge.to}`;
    if (edge.from === edge.to || seen.has(key) || !ids.has(edge.from) || !ids.has(edge.to)) return;
    seen.add(key);
    edges.push(edge);
  };
  for (const edge of doc.edges ?? []) add(edge);
  for (const node of doc.nodes) if (node.parent) add({ from: node.parent, to: node.id });
  return { nodes: doc.nodes, edges };
}

/** Ids of a node and everything under it. */
export function subtree(doc: Doc, id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of doc.nodes) {
      if (node.parent && out.has(node.parent) && !out.has(node.id)) {
        out.add(node.id);
        grew = true;
      }
    }
  }
  return out;
}
