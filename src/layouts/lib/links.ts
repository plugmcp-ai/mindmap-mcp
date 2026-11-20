import type { Doc } from "../../model/schema.js";
import type { Tree } from "../../model/tree.js";
import type { EdgeShape, Link, Side } from "../types.js";

/** One link per parent and child in the tree. */
export function treeLinks(
  tree: Tree,
  doc: Doc,
  style: { shape: EdgeShape; fromSide: Side | ((childId: string) => Side); toSide: Side | ((childId: string) => Side); arrow?: boolean },
): Link[] {
  const links: Link[] = [];
  for (const node of doc.nodes) {
    for (const child of tree.children.get(node.id) ?? []) {
      links.push({
        id: `${node.id}>${child.id}`,
        from: node.id,
        to: child.id,
        shape: style.shape,
        fromSide: typeof style.fromSide === "function" ? style.fromSide(child.id) : style.fromSide,
        toSide: typeof style.toSide === "function" ? style.toSide(child.id) : style.toSide,
        ...(style.arrow ? { arrow: true } : {}),
        branch: tree.branch.get(child.id) ?? -1,
        depth: tree.depth.get(child.id) ?? 1,
      });
    }
  }
  return links;
}

/** Edges that are not part of the tree, drawn as dashed cross links. */
export function crossLinks(tree: Tree): Link[] {
  return tree.links.map((edge) => ({
    id: `${edge.from}~${edge.to}`,
    from: edge.from,
    to: edge.to,
    shape: "curve" as const,
    fromSide: "auto" as const,
    toSide: "auto" as const,
    ...(edge.label ? { label: edge.label } : {}),
    arrow: true,
    dashed: true,
    branch: -1,
    depth: 2,
  }));
}
