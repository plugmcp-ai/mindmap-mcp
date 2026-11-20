import dagre from "@dagrejs/dagre";
import { graphOf, treeOf } from "../model/tree.js";
import type { Box, Layout, Link } from "./types.js";

/** Steps and decisions joined by arrows, in ranks from the start to the end. */
export const flowchart: Layout = {
  id: "flowchart",
  label: "Flowchart",
  description: "Steps and decisions joined by arrows. Best for a process, an algorithm or a decision.",
  reads: "graph",
  nodes: "shape",
  layout({ doc, size, compact }) {
    const { nodes, edges } = graphOf(doc);
    const tree = treeOf(doc);
    // The small inline card is short and wide, so the flow runs left to right there.
    const across = compact;
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: across ? "LR" : "TB", nodesep: 28, ranksep: 46, marginx: 0, marginy: 0 });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of nodes) {
      const s = size(node);
      graph.setNode(node.id, { width: s.w, height: s.h });
    }
    for (const edge of edges) graph.setEdge(edge.from, edge.to);
    dagre.layout(graph);

    const boxes: Box[] = nodes.map((node) => {
      const placed = graph.node(node.id) as { x: number; y: number };
      const s = size(node);
      return { id: node.id, x: placed.x - s.w / 2, y: placed.y - s.h / 2, ...s };
    });
    const at = new Map(boxes.map((box) => [box.id, box]));
    const links: Link[] = edges.map((edge) => {
      const from = at.get(edge.from)!;
      const to = at.get(edge.to)!;
      // An arrow that goes back up the flow curves around instead of cutting through.
      const forward = across ? to.x >= from.x + from.w : to.y >= from.y + from.h;
      return {
        id: `${edge.from}>${edge.to}`,
        from: edge.from,
        to: edge.to,
        shape: forward ? "elbow" : "curve",
        fromSide: forward ? (across ? "right" : "bottom") : "auto",
        toSide: forward ? (across ? "left" : "top") : "auto",
        ...(edge.label ? { label: edge.label } : {}),
        arrow: true,
        ...(forward ? {} : { dashed: true }),
        branch: tree.branch.get(edge.to) ?? -1,
        depth: 2,
      };
    });
    return { boxes, links };
  },
};
