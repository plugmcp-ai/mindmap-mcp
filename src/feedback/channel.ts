import { outline } from "../model/outline.js";
import { STRUCTURE_LABELS, type Doc, type MapNode } from "../model/schema.js";

/**
 * The canvas to chat layer. Everything the user does on the canvas reaches the
 * model through the text built here, in one of two ways:
 *
 * - quietly, as model context that rides along with the user's next message
 *   (edits, the selected node), or
 * - as a chat message the user chose to send (a node action, a question,
 *   a batch of comments).
 *
 * The text always names the docId and tells the model to answer with
 * edit_diagram, so the diagram changes in place.
 */

export interface Situation {
  docId: string;
  revision: number;
  doc: Doc;
  /** Change lines since the model last wrote the diagram. */
  changes: string[];
  selected?: MapNode;
}

/** Enough of the current state for the model to act, in a size that is safe to send often. */
export function contextText(now: Situation): string {
  const { doc, docId, revision, changes, selected } = now;
  const lines = [
    `${STRUCTURE_LABELS[doc.structure]} "${doc.title}" (docId ${docId}, revision ${revision}).`,
    ...(changes.length
      ? ["The user changed it on the canvas since you last wrote it:", ...changes.slice(-20).map((line) => `- ${line}`)]
      : ["The user has not changed it since you last wrote it."]),
    ...(selected ? [`Selected node: ${selected.id} "${selected.label}".`] : []),
    "Current outline:",
    outline(doc, { maxChars: 1500, focus: selected?.id }),
    `To change the diagram call edit_diagram with docId "${docId}". Do not call visualize again for a change.`,
  ];
  return lines.join("\n");
}

export const ACTIONS = [
  { id: "explain", label: "Explain", ask: "explain this in two or three sentences. Put the explanation in the node's note." },
  { id: "expand", label: "Expand", ask: "add 3 to 5 child nodes that take this idea further." },
  { id: "breakdown", label: "Break down", ask: "break this down into its parts or steps, as child nodes." },
  { id: "challenge", label: "Challenge", ask: "what is weak, risky or missing here? Add the points as child nodes with status risk." },
  { id: "tasks", label: "To tasks", ask: "turn this into concrete tasks, as child nodes with status todo." },
] as const;

export type ActionId = (typeof ACTIONS)[number]["id"];

const about = (node: MapNode, now: Situation) => `About "${node.label}" (node ${node.id}) in the diagram "${now.doc.title}" (docId ${now.docId})`;

const answer = (now: Situation) => `Answer by calling edit_diagram on docId "${now.docId}" so the diagram updates in place, then reply in one or two sentences.`;

/** Changes ride inside the message when the host cannot take quiet context. */
const carried = (now: Situation, include: boolean) =>
  include && now.changes.length ? `\nI also changed the diagram: ${now.changes.slice(-12).join("; ")}.` : "";

export function actionMessage(action: ActionId, node: MapNode, now: Situation, withChanges: boolean): string {
  const ask = ACTIONS.find((item) => item.id === action)!.ask;
  return `${about(node, now)}: ${ask}${carried(now, withChanges)}\n${answer(now)}`;
}

export function askMessage(question: string, node: MapNode, now: Situation, withChanges: boolean): string {
  return `${about(node, now)}: ${question.trim()}${carried(now, withChanges)}\n${answer(now)}`;
}

export function commentsMessage(comments: Array<{ node: MapNode; text: string }>, now: Situation, withChanges: boolean): string {
  const lines = comments.map(({ node, text }) => `- on "${node.label}" (node ${node.id}): ${text}`);
  const count = comments.length === 1 ? "a comment" : `${comments.length} comments`;
  return `I left ${count} on the diagram "${now.doc.title}" (docId ${now.docId}):\n${lines.join("\n")}${carried(now, withChanges)}\nPlease act on them. ${answer(now)}`;
}

export function changesMessage(now: Situation): string {
  return `I edited the diagram "${now.doc.title}" (docId ${now.docId}): ${now.changes.slice(-20).join("; ")}.\nTake my changes into account. If something else should change because of them, call edit_diagram on docId "${now.docId}".`;
}
