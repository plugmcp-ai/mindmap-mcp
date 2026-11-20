import { KINDS, STATUSES, STRUCTURES, THEMES, type Doc, type MapEdge, type MapLane, type MapNode } from "./schema.js";

const ID = /^[A-Za-z0-9_-]{1,32}$/;
const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined);
const pick = <T extends string>(value: unknown, list: readonly T[]) => (list.includes(value as T) ? (value as T) : undefined);

/**
 * Turn loose input into a document that is safe to draw. It is used on the
 * model's input, which may be cut short while it streams, so it never throws:
 * a node without an id or a label is dropped, a second use of an id is dropped,
 * and links to missing nodes are removed.
 */
export function normalize(input: unknown): Doc | undefined {
  const raw = (input ?? {}) as Record<string, unknown>;
  const nodes: MapNode[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(raw.nodes) ? raw.nodes : []) {
    if (nodes.length >= 300) break;
    const node = (item ?? {}) as Record<string, unknown>;
    const id = typeof node.id === "string" && ID.test(node.id) ? node.id : undefined;
    const label = text(node.label, 80);
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const note = text(node.note, 500);
    const status = pick(node.status, STATUSES);
    const kind = pick(node.kind, KINDS);
    nodes.push({
      id,
      label,
      ...(typeof node.parent === "string" && ID.test(node.parent) && node.parent !== id ? { parent: node.parent } : {}),
      ...(note ? { note } : {}),
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
      ...(typeof node.lane === "string" && ID.test(node.lane) ? { lane: node.lane } : {}),
      ...(node.collapsed === true ? { collapsed: true } : {}),
    });
  }
  if (!nodes.length) return undefined;
  for (const node of nodes) if (node.parent && !seen.has(node.parent)) delete node.parent;

  const edges: MapEdge[] = [];
  for (const item of Array.isArray(raw.edges) ? raw.edges : []) {
    const edge = (item ?? {}) as Record<string, unknown>;
    if (typeof edge.from !== "string" || typeof edge.to !== "string") continue;
    if (!seen.has(edge.from) || !seen.has(edge.to) || edge.from === edge.to) continue;
    const label = text(edge.label, 40);
    edges.push({ from: edge.from, to: edge.to, ...(label ? { label } : {}) });
    if (edges.length >= 400) break;
  }

  const lanes: MapLane[] = [];
  for (const item of Array.isArray(raw.lanes) ? raw.lanes : []) {
    const lane = (item ?? {}) as Record<string, unknown>;
    const label = text(lane.label, 40);
    if (typeof lane.id === "string" && ID.test(lane.id) && label && !lanes.some((known) => known.id === lane.id)) {
      lanes.push({ id: lane.id, label });
    }
  }

  const structure = pick(raw.structure, STRUCTURES) ?? (edges.length && nodes.every((node) => !node.parent) ? "flowchart" : "mindmap");
  const theme = pick(raw.theme, THEMES);
  return {
    title: text(raw.title, 80) ?? nodes[0]!.label,
    structure,
    ...(theme ? { theme } : {}),
    ...(typeof raw.animate === "boolean" ? { animate: raw.animate } : {}),
    ...(lanes.length ? { lanes } : {}),
    nodes,
    ...(edges.length ? { edges } : {}),
  };
}

/**
 * The same, for input that is still streaming. The host closes the open JSON
 * for us, so the last node may hold half a label: leave it out until the next
 * one starts, when it is known to be whole.
 */
export function normalizePartial(input: unknown): Doc | undefined {
  const raw = (input ?? {}) as Record<string, unknown>;
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const edges = Array.isArray(raw.edges) ? raw.edges : [];
  return normalize({
    ...raw,
    nodes: edges.length ? nodes : nodes.slice(0, -1),
    edges: edges.slice(0, -1),
  });
}
