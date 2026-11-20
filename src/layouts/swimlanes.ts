import type { MapLane } from "../model/schema.js";
import { graphOf, treeOf } from "../model/tree.js";
import type { Band, Box, Layout, Link } from "./types.js";

/**
 * A flow split into rows, one per person or team. Steps run left to right in
 * the order the arrows give them. A document without lanes still works: each
 * top-level branch becomes a lane.
 */
export const swimlanes: Layout = {
  id: "swimlanes",
  label: "Swimlanes",
  description: "A process in rows, one per person or team. Best for showing who does what, and the handoffs.",
  reads: "graph",
  nodes: "shape",
  layout({ doc, size }) {
    const { nodes, edges } = graphOf(doc);
    const tree = treeOf(doc);
    const top = tree.children.get(tree.root.id) ?? [];

    let lanes: MapLane[] = doc.lanes ?? [];
    const laneOf = new Map<string, string>();
    if (lanes.length) {
      const known = new Set(lanes.map((lane) => lane.id));
      for (const node of nodes) if (node.lane && known.has(node.lane)) laneOf.set(node.id, node.lane);
      if (nodes.some((node) => !laneOf.has(node.id))) {
        lanes = [...lanes, { id: "~other", label: "Other" }];
        for (const node of nodes) if (!laneOf.has(node.id)) laneOf.set(node.id, "~other");
      }
    } else {
      lanes = top.length ? top.map((node) => ({ id: node.id, label: node.label })) : [{ id: tree.root.id, label: tree.root.label }];
      for (const node of nodes) {
        const branch = tree.branch.get(node.id) ?? -1;
        laneOf.set(node.id, (branch >= 0 ? top[branch]?.id : undefined) ?? lanes[0]!.id);
      }
    }

    // Find the arrows that loop back to an earlier step, so they do not count for the order.
    const out = new Map<string, number[]>(nodes.map((node) => [node.id, []]));
    edges.forEach((edge, index) => out.get(edge.from)?.push(index));
    const back = new Set<number>();
    const state = new Map<string, "open" | "done">();
    const visit = (id: string) => {
      state.set(id, "open");
      for (const index of out.get(id) ?? []) {
        const to = edges[index]!.to;
        if (state.get(to) === "open") back.add(index);
        else if (!state.has(to)) visit(to);
      }
      state.set(id, "done");
    };
    for (const node of nodes) if (!state.has(node.id)) visit(node.id);

    // A step's column is one past the latest step that leads to it.
    const rank = new Map<string, number>(nodes.map((node) => [node.id, 0]));
    for (let pass = 0; pass < nodes.length; pass += 1) {
      let moved = false;
      edges.forEach((edge, index) => {
        if (back.has(index)) return;
        const next = rank.get(edge.from)! + 1;
        if (next > rank.get(edge.to)!) {
          rank.set(edge.to, next);
          moved = true;
        }
      });
      if (!moved) break;
    }

    const GAP = 12;
    const PAD = 18;
    const LABEL = 120;
    const columns = Math.max(...rank.values(), 0) + 1;
    const columnWidth = Array.from({ length: columns }, () => 0);
    for (const node of nodes) {
      const column = rank.get(node.id)!;
      columnWidth[column] = Math.max(columnWidth[column]!, size(node).w);
    }
    const columnX: number[] = [];
    let x = LABEL + PAD;
    for (const width of columnWidth) {
      columnX.push(x);
      x += width + 56;
    }
    const right = x - 56 + PAD;

    const boxes: Box[] = [];
    const bands: Band[] = [];
    let y = 0;
    for (const lane of lanes) {
      const inLane = nodes.filter((node) => laneOf.get(node.id) === lane.id);
      // Steps that share a lane and a column stack on top of each other.
      const stackHeight = Array.from({ length: columns }, () => 0);
      for (const node of inLane) {
        const column = rank.get(node.id)!;
        stackHeight[column] = stackHeight[column]! + size(node).h + (stackHeight[column]! ? GAP : 0);
      }
      const height = Math.max(...stackHeight, 36) + PAD * 2;
      const used = Array.from({ length: columns }, () => 0);
      for (const node of inLane) {
        const column = rank.get(node.id)!;
        const s = size(node);
        const start = y + (height - stackHeight[column]!) / 2;
        boxes.push({ id: node.id, x: columnX[column]! + (columnWidth[column]! - s.w) / 2, y: start + used[column]!, ...s });
        used[column] = used[column]! + s.h + GAP;
      }
      bands.push({ id: lane.id, x: 0, y, w: right, h: height, label: lane.label });
      y += height;
    }

    const at = new Map(boxes.map((box) => [box.id, box]));
    const links: Link[] = edges
      .filter((edge) => at.has(edge.from) && at.has(edge.to))
      .map((edge) => {
        const forward = rank.get(edge.to)! > rank.get(edge.from)!;
        return {
          id: `${edge.from}>${edge.to}`,
          from: edge.from,
          to: edge.to,
          shape: forward ? ("elbow" as const) : ("curve" as const),
          fromSide: forward ? ("right" as const) : ("auto" as const),
          toSide: forward ? ("left" as const) : ("auto" as const),
          ...(edge.label ? { label: edge.label } : {}),
          arrow: true,
          ...(forward ? {} : { dashed: true }),
          branch: lanes.findIndex((lane) => lane.id === laneOf.get(edge.to)),
          depth: 2,
        };
      });
    return { boxes, links, bands };
  },
};
