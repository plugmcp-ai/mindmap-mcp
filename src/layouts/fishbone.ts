import type { MapNode } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { crossLinks } from "./lib/links.js";
import type { Box, Layout, Link } from "./types.js";

/**
 * A cause and effect diagram. The root is the effect, at the head on the right.
 * Its children are the groups of causes, on bones above and below the spine,
 * and the causes of each group sit along its bone.
 */
export const fishbone: Layout = {
  id: "fishbone",
  label: "Fishbone",
  description: "The problem at the head, groups of causes on the bones. Best for finding why something happens.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size }) {
    const tree = treeOf(doc);
    const groups = tree.children.get(tree.root.id) ?? [];
    const boxes: Box[] = [];
    const links: Link[] = [];
    const STEM = 26;
    const GAP = 8;
    const INDENT = 18;
    const SLANT = 46;

    const under = (node: MapNode, level: number, out: Array<{ node: MapNode; level: number; parent: string }>) => {
      for (const child of tree.children.get(node.id) ?? []) {
        out.push({ node: child, level, parent: node.id });
        under(child, level + 1, out);
      }
      return out;
    };

    // Two groups share a column: one above the spine, one below.
    let x = 40;
    for (let index = 0; index < groups.length; index += 2) {
      let columnWidth = 0;
      for (const [offset, up] of [
        [0, true],
        [1, false],
      ] as const) {
        const group = groups[index + offset];
        if (!group) continue;
        const s = size(group);
        const rest = under(group, 1, []);
        const restHeight = rest.reduce((sum, item) => sum + size(item.node).h + GAP, 0);
        // Causes sit to the right of the bone, clear of it.
        const beside = s.w / 2 + SLANT + 14;
        const width = Math.max(s.w, ...rest.map((item) => beside + size(item.node).w + (item.level - 1) * INDENT));
        columnWidth = Math.max(columnWidth, width);
        // The group's label is at the far end of the bone, its causes between it and the spine.
        const groupY = up ? -(STEM + restHeight + s.h) : STEM + restHeight;
        boxes.push({ id: group.id, x, y: groupY, ...s });
        const joint = `~f-${group.id}`;
        const boneTop = { x: x + s.w / 2, y: up ? groupY + s.h : groupY };
        const boneEnd = { x: x + SLANT + s.w / 2, y: 0 };
        boxes.push({ id: joint, ...boneEnd, w: 0, h: 0, ghost: true });
        links.push({
          id: `${joint}>${group.id}`,
          from: joint,
          to: group.id,
          shape: "line",
          fromSide: "center",
          toSide: up ? "bottom" : "top",
          heavy: true,
          branch: index + offset,
          depth: 1,
        });
        let y = up ? groupY + s.h + GAP : groupY - GAP;
        for (const item of rest) {
          const n = size(item.node);
          const top = up ? y : y - n.h;
          boxes.push({ id: item.node.id, x: x + beside + (item.level - 1) * INDENT, y: top, ...n });
          y = up ? top + n.h + GAP : top - GAP;
          if (item.level === 1) {
            // A short rib from the bone to the cause, at the height of the cause.
            const middle = top + n.h / 2;
            const t = (middle - boneTop.y) / (boneEnd.y - boneTop.y || 1);
            const rib = `~r-${item.node.id}`;
            boxes.push({ id: rib, x: boneTop.x + (boneEnd.x - boneTop.x) * t, y: middle, w: 0, h: 0, ghost: true });
            links.push({ id: `${rib}>${item.node.id}`, from: rib, to: item.node.id, shape: "line", fromSide: "center", toSide: "left", branch: index + offset, depth: 2 });
          } else {
            links.push({
              id: `${item.parent}>${item.node.id}`,
              from: item.parent,
              to: item.node.id,
              shape: "elbow",
              fromSide: up ? "bottom" : "top",
              toSide: "left",
              branch: index + offset,
              depth: item.level + 1,
            });
          }
        }
      }
      x += columnWidth + SLANT + 28;
    }

    const head = size(tree.root);
    boxes.unshift({ id: tree.root.id, x: x + 20, y: -head.h / 2, ...head });
    boxes.push({ id: "~f-tail", x: 0, y: 0, w: 0, h: 0, ghost: true });
    links.push({
      id: "~spine",
      from: "~f-tail",
      to: tree.root.id,
      shape: "line",
      fromSide: "center",
      toSide: "left",
      arrow: true,
      heavy: true,
      branch: -1,
      depth: 0,
    });
    return { boxes, links: [...links, ...crossLinks(tree)] };
  },
};
