import type { MapNode } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { crossLinks } from "./lib/links.js";
import type { Box, Layout, Link } from "./types.js";

/**
 * Events along a line from left to right. The root's children are the events,
 * in order, alternating above and below the line. What hangs under an event
 * stacks away from the line.
 */
export const timeline: Layout = {
  id: "timeline",
  label: "Timeline",
  description: "Events on a line from left to right. Best for history, roadmaps and anything in order of time.",
  reads: "tree",
  nodes: "branch",
  layout({ doc, size }) {
    const tree = treeOf(doc);
    const events = tree.children.get(tree.root.id) ?? [];
    const boxes: Box[] = [];
    const links: Link[] = [];
    const STEM = 34;
    const GAP = 8;
    const INDENT = 16;

    const rootSize = size(tree.root);
    boxes.push({ id: tree.root.id, x: 0, y: -rootSize.h / 2, ...rootSize });
    let x = rootSize.w + 48;

    // Everything under an event, flattened into a list with its level.
    const under = (node: MapNode, level: number, out: Array<{ node: MapNode; level: number; parent: string }>) => {
      for (const child of tree.children.get(node.id) ?? []) {
        out.push({ node: child, level, parent: node.id });
        under(child, level + 1, out);
      }
      return out;
    };

    events.forEach((event, index) => {
      const up = index % 2 === 0;
      const s = size(event);
      const rest = under(event, 1, []);
      const width = Math.max(s.w, ...rest.map(({ node, level }) => size(node).w + level * INDENT));
      const dot = `~t-${event.id}`;
      const cx = x + s.w / 2;
      boxes.push({ id: dot, x: cx, y: 0, w: 0, h: 0, ghost: true });
      const eventY = up ? -STEM - s.h : STEM;
      boxes.push({ id: event.id, x, y: eventY, ...s });
      links.push({
        id: `${dot}>${event.id}`,
        from: dot,
        to: event.id,
        shape: "line",
        fromSide: "center",
        toSide: up ? "bottom" : "top",
        branch: index,
        depth: 1,
      });
      let y = up ? eventY - GAP : eventY + s.h + GAP;
      for (const { node, level, parent } of rest) {
        const n = size(node);
        const top = up ? y - n.h : y;
        boxes.push({ id: node.id, x: x + level * INDENT, y: top, ...n });
        y = up ? top - GAP : top + n.h + GAP;
        links.push({
          id: `${parent}>${node.id}`,
          from: parent,
          to: node.id,
          shape: "elbow",
          fromSide: up ? "top" : "bottom",
          toSide: "left",
          branch: index,
          depth: level + 1,
        });
      }
      x += width + 36;
    });

    const end = "~t-end";
    boxes.push({ id: end, x: Math.max(x - 12, rootSize.w + 60), y: 0, w: 0, h: 0, ghost: true });
    links.push({
      id: "~axis",
      from: tree.root.id,
      to: end,
      shape: "line",
      fromSide: "right",
      toSide: "center",
      arrow: true,
      heavy: true,
      branch: -1,
      depth: 0,
    });
    return { boxes, links: [...links, ...crossLinks(tree)] };
  },
};
