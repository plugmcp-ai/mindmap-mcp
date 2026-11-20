import type { Doc, MapNode, Op } from "./schema.js";
import { subtree } from "./tree.js";

export interface Applied {
  doc: Doc;
  /** One plain line per change that was made, for the model and the journal. */
  changes: string[];
  /** One line per op that could not be applied. The others still apply. */
  errors: string[];
  /** Comments carried by `comment` ops. */
  comments: Array<{ node: string; text: string }>;
}

const quote = (text: string) => `"${text}"`;

function freshId(doc: Doc): string {
  const taken = new Set(doc.nodes.map((node) => node.id));
  for (let n = doc.nodes.length + 1; ; n += 1) {
    if (!taken.has(`n${n}`)) return `n${n}`;
  }
}

/** Put `node` right after sibling `after`, or after its last sibling when `after` is not given. */
function place(nodes: MapNode[], node: MapNode, after: string | undefined): MapNode[] {
  const rest = nodes.filter((item) => item.id !== node.id);
  let index = -1;
  if (after) index = rest.findIndex((item) => item.id === after);
  if (index < 0) {
    for (let i = rest.length - 1; i >= 0; i -= 1) {
      if (rest[i]!.parent === node.parent && node.parent !== undefined) {
        index = i;
        break;
      }
    }
  }
  if (index < 0) return [...rest, node];
  // Keep the sibling's own subtree together: skip past its descendants.
  const anchor = rest[index]!;
  if (after) {
    const under = new Set<string>([anchor.id]);
    let end = index;
    for (let i = index + 1; i < rest.length; i += 1) {
      const parent = rest[i]!.parent;
      if (parent && under.has(parent)) {
        under.add(rest[i]!.id);
        end = i;
      }
    }
    index = end;
  }
  return [...rest.slice(0, index + 1), node, ...rest.slice(index + 1)];
}

/** Apply ops in order. An op that fails is reported and skipped; it never throws. */
export function applyOps(input: Doc, ops: Op[]): Applied {
  let doc: Doc = { ...input, nodes: [...input.nodes], edges: input.edges ? [...input.edges] : undefined };
  const changes: string[] = [];
  const errors: string[] = [];
  const comments: Applied["comments"] = [];
  const find = (id: string) => doc.nodes.find((node) => node.id === id);
  const name = (node: MapNode) => `${node.id} ${quote(node.label)}`;

  for (const op of ops) {
    switch (op.op) {
      case "add_node": {
        const { op: _op, after, id: wanted, ...fields } = op;
        if (wanted && find(wanted)) {
          errors.push(`add_node: id ${wanted} is already used.`);
          break;
        }
        if (fields.parent && !find(fields.parent)) {
          errors.push(`add_node: parent ${fields.parent} does not exist.`);
          break;
        }
        if (doc.nodes.length >= 300) {
          errors.push("add_node: the diagram is full at 300 nodes.");
          break;
        }
        const node: MapNode = { id: wanted ?? freshId(doc), ...fields };
        doc.nodes = place(doc.nodes, node, after);
        const parent = node.parent ? find(node.parent) : undefined;
        changes.push(`added ${name(node)}${parent ? ` under ${name(parent)}` : ""}`);
        break;
      }
      case "update_node": {
        const node = find(op.id);
        if (!node) {
          errors.push(`update_node: node ${op.id} does not exist.`);
          break;
        }
        const { op: _op, id: _id, ...fields } = op;
        const next: MapNode = { ...node };
        const parts: string[] = [];
        for (const [key, value] of Object.entries(fields)) {
          if (value === undefined || (node as Record<string, unknown>)[key] === value) continue;
          (next as Record<string, unknown>)[key] = value;
          if (key === "label") parts.push(`renamed ${node.id}: ${quote(node.label)} -> ${quote(String(value))}`);
          else if (key === "collapsed") parts.push(`${value ? "collapsed" : "expanded"} ${name(node)}`);
          else if (key === "note") parts.push(`changed the note on ${name(node)}`);
          else parts.push(`set ${key} of ${name(node)} to ${String(value)}`);
        }
        if (!parts.length) break;
        doc.nodes = doc.nodes.map((item) => (item.id === node.id ? next : item));
        changes.push(...parts);
        break;
      }
      case "move_node": {
        const node = find(op.id);
        const parent = find(op.parent);
        if (!node || !parent) {
          errors.push(`move_node: node ${!node ? op.id : op.parent} does not exist.`);
          break;
        }
        if (subtree(doc, node.id).has(parent.id)) {
          errors.push(`move_node: ${node.id} cannot move under itself.`);
          break;
        }
        const moved: MapNode = { ...node, parent: parent.id };
        // Move the whole subtree so it stays together in document order.
        const under = subtree(doc, node.id);
        const block = doc.nodes.filter((item) => under.has(item.id) && item.id !== node.id);
        const rest = doc.nodes.filter((item) => !under.has(item.id));
        const placed = place(rest, moved, op.after);
        const at = placed.findIndex((item) => item.id === moved.id);
        doc.nodes = [...placed.slice(0, at + 1), ...block, ...placed.slice(at + 1)];
        changes.push(`moved ${name(node)} under ${name(parent)}`);
        break;
      }
      case "remove_node": {
        const node = find(op.id);
        if (!node) {
          errors.push(`remove_node: node ${op.id} does not exist.`);
          break;
        }
        const under = subtree(doc, node.id);
        if (under.size === doc.nodes.length) {
          errors.push("remove_node: the last node cannot be removed.");
          break;
        }
        doc.nodes = doc.nodes.filter((item) => !under.has(item.id));
        doc.edges = doc.edges?.filter((edge) => !under.has(edge.from) && !under.has(edge.to));
        const below = under.size - 1;
        changes.push(`removed ${name(node)}${below ? ` and ${below} below it` : ""}`);
        break;
      }
      case "add_edge": {
        if (!find(op.from) || !find(op.to)) {
          errors.push(`add_edge: node ${!find(op.from) ? op.from : op.to} does not exist.`);
          break;
        }
        const edges = (doc.edges ?? []).filter((edge) => !(edge.from === op.from && edge.to === op.to));
        doc.edges = [...edges, { from: op.from, to: op.to, ...(op.label ? { label: op.label } : {}) }];
        changes.push(`linked ${op.from} -> ${op.to}${op.label ? ` (${op.label})` : ""}`);
        break;
      }
      case "remove_edge": {
        const before = doc.edges?.length ?? 0;
        doc.edges = doc.edges?.filter((edge) => !(edge.from === op.from && edge.to === op.to));
        if ((doc.edges?.length ?? 0) === before) errors.push(`remove_edge: no link ${op.from} -> ${op.to}.`);
        else changes.push(`unlinked ${op.from} -> ${op.to}`);
        break;
      }
      case "set": {
        const { op: _op, ...fields } = op;
        for (const [key, value] of Object.entries(fields)) {
          if (value === undefined || (doc as Record<string, unknown>)[key] === value) continue;
          doc = { ...doc, [key]: value };
          changes.push(`set ${key} to ${String(value)}`);
        }
        break;
      }
      case "comment": {
        const node = find(op.id);
        if (!node) {
          errors.push(`comment: node ${op.id} does not exist.`);
          break;
        }
        comments.push({ node: node.id, text: op.text });
        changes.push(`comment on ${name(node)}: ${quote(op.text)}`);
        break;
      }
    }
  }
  if (doc.edges && !doc.edges.length) doc = { ...doc, edges: undefined };
  return { doc, changes, errors, comments };
}
