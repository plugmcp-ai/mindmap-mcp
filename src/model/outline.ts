import { STRUCTURE_LABELS, type Comment, type Doc, type Stored } from "./schema.js";
import { treeOf } from "./tree.js";

/**
 * The diagram as indented text with node ids. This is what the model reads,
 * and what a client that cannot draw the view shows the user.
 */
export function outline(doc: Doc, options: { maxChars?: number; focus?: string } = {}): string {
  const tree = treeOf(doc);
  const lines: string[] = [];
  const walk = (id: string, level: number) => {
    const node = doc.nodes.find((item) => item.id === id);
    if (!node) return;
    const extras = [node.kind && node.kind !== "step" ? node.kind : "", node.status ?? "", node.lane ? `lane ${node.lane}` : ""].filter(Boolean);
    const note = node.note ? ` - ${node.note.replace(/\s+/g, " ").slice(0, 120)}` : "";
    lines.push(`${"  ".repeat(level)}- [${node.id}] ${node.label}${extras.length ? ` (${extras.join(", ")})` : ""}${note}`);
    for (const child of tree.children.get(id) ?? []) walk(child.id, level + 1);
  };
  walk(tree.root.id, 0);
  const links = (doc.edges ?? []).map((edge) => `  ${edge.from} -> ${edge.to}${edge.label ? ` (${edge.label})` : ""}`);
  let text = lines.join("\n") + (links.length ? `\nLinks:\n${links.join("\n")}` : "");
  const max = options.maxChars;
  if (max && text.length > max) {
    // Too long: keep the top two levels, and the focused branch in full.
    const keep = new Set<string>();
    if (options.focus) {
      const under = [options.focus];
      while (under.length) {
        const id = under.pop()!;
        keep.add(id);
        for (const child of tree.children.get(id) ?? []) under.push(child.id);
      }
    }
    const short = lines.filter((line) => {
      const level = (line.length - line.trimStart().length) / 2;
      const id = /\[([^\]]+)\]/.exec(line)?.[1] ?? "";
      return level <= 1 || keep.has(id);
    });
    text = `${short.join("\n")}\n(${doc.nodes.length - short.length} deeper nodes left out. Call get_diagram for all of them.)`;
    if (text.length > max) text = `${text.slice(0, max)}\n(cut short)`;
  }
  return text;
}

export function summary(stored: Stored): string {
  const { doc, docId, revision } = stored;
  return `"${doc.title}" as ${STRUCTURE_LABELS[doc.structure].toLowerCase()}, ${doc.nodes.length} nodes. docId ${docId}, revision ${revision}.`;
}

/**
 * Keep only the last "set structure to ..." and the like. Trying five looks is
 * one fact for the model: what the user is looking at now.
 */
export function compactChanges(lines: string[]): string[] {
  const last = new Map<string, number>();
  lines.forEach((line, index) => {
    const setting = /^set (\w+) to /.exec(line)?.[1];
    if (setting) last.set(setting, index);
  });
  return lines.filter((line, index) => {
    const setting = /^set (\w+) to /.exec(line)?.[1];
    return !setting || last.get(setting) === index;
  });
}

/** Changes the user made on the canvas after the model last wrote the diagram. */
export function userChangesSince(stored: Stored, revision: number): string[] {
  return compactChanges(stored.log.filter((entry) => entry.by === "user" && entry.revision > revision).flatMap((entry) => entry.changes));
}

/** The last revision the model wrote. */
export function lastModelRevision(stored: Stored): number {
  for (let i = stored.log.length - 1; i >= 0; i -= 1) {
    if (stored.log[i]!.by === "model") return stored.log[i]!.revision;
  }
  return 0;
}

export function commentLines(comments: Comment[], doc: Doc): string[] {
  return comments
    .filter((comment) => comment.by === "user")
    .map((comment) => {
      const node = doc.nodes.find((item) => item.id === comment.node);
      return `on ${comment.node}${node ? ` "${node.label}"` : ""}: "${comment.text}"`;
    });
}

/** The diagram as a Markdown outline, for export. */
export function toMarkdown(doc: Doc): string {
  const tree = treeOf(doc);
  const lines = [`# ${doc.title}`, ""];
  const walk = (id: string, level: number) => {
    const node = doc.nodes.find((item) => item.id === id);
    if (!node) return;
    if (level >= 0) lines.push(`${"  ".repeat(level)}- ${node.label}${node.note ? `: ${node.note.replace(/\s+/g, " ")}` : ""}`);
    for (const child of tree.children.get(id) ?? []) walk(child.id, level + 1);
  };
  walk(tree.root.id, tree.root.label === doc.title ? -1 : 0);
  return `${lines.join("\n")}\n`;
}
