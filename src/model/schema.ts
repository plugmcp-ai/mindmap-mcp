import { z } from "zod";

/**
 * The document model. A diagram is a list of nodes that point at their parent,
 * plus optional edges for flow and cross links. There are no coordinates here:
 * a layout turns this into positions, so one document can be drawn as any structure.
 */

export const STRUCTURES = [
  "mindmap",
  "two_sided",
  "logic",
  "org",
  "outline",
  "timeline",
  "fishbone",
  "flowchart",
  "swimlanes",
] as const;

export const THEMES = ["host", "classic", "mono", "blueprint", "sketch", "contrast"] as const;

export const STATUSES = ["todo", "doing", "done", "blocked", "idea", "risk"] as const;

export const KINDS = ["step", "decision", "start", "end"] as const;

export const Id = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,32}$/, "An id is 1-32 letters, numbers, _ or -.")
  .describe("Short id, unique in the diagram, for example a, a1, launch");

export const Structure = z.enum(STRUCTURES);
export const Theme = z.enum(THEMES);

export const Node = z.object({
  id: Id,
  label: z.string().min(1).max(80).describe("1-5 words"),
  parent: Id.optional().describe("Id of the parent node. Leave out on the root, and on flowchart nodes joined by edges."),
  note: z.string().max(500).optional().describe("Detail shown when the node is opened. Put long text here, not in the label."),
  status: z.enum(STATUSES).optional(),
  kind: z.enum(KINDS).optional().describe("Flowchart shape. Default: step."),
  lane: Id.optional().describe("Swimlane id, for who does this step."),
  collapsed: z.boolean().optional().describe("Start with the children hidden."),
});

export const Edge = z.object({
  from: Id,
  to: Id,
  label: z.string().max(40).optional().describe("For example yes, no, causes, needs"),
});

export const Lane = z.object({ id: Id, label: z.string().min(1).max(40) });

/** Field order matters while the input streams: title and structure arrive before the nodes. */
export const Doc = z.object({
  title: z.string().min(1).max(80),
  structure: Structure,
  theme: Theme.optional(),
  animate: z.boolean().optional(),
  lanes: z.array(Lane).max(12).optional(),
  nodes: z.array(Node).min(1).max(300),
  edges: z.array(Edge).max(400).optional(),
});

export type Structure = z.infer<typeof Structure>;
export type Theme = z.infer<typeof Theme>;
export type MapNode = z.infer<typeof Node>;
export type MapEdge = z.infer<typeof Edge>;
export type MapLane = z.infer<typeof Lane>;
export type Doc = z.infer<typeof Doc>;

const nodeFields = {
  label: z.string().min(1).max(80).optional(),
  note: z.string().max(500).optional(),
  status: z.enum(STATUSES).optional(),
  kind: z.enum(KINDS).optional(),
  lane: Id.optional(),
  collapsed: z.boolean().optional(),
};

/** One change to a diagram. Ops address nodes by id and apply in order. */
export const Op = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_node"),
    id: Id.optional().describe("Leave out to get one made for you."),
    parent: Id.optional(),
    after: Id.optional().describe("Sibling to place the new node after. Default: last."),
    ...nodeFields,
    label: z.string().min(1).max(80),
  }),
  z.object({ op: z.literal("update_node"), id: Id, ...nodeFields }),
  z.object({ op: z.literal("move_node"), id: Id, parent: Id, after: Id.optional() }),
  z.object({ op: z.literal("remove_node"), id: Id }).describe("Removes the node, everything under it and its edges."),
  z.object({ op: z.literal("add_edge"), from: Id, to: Id, label: z.string().max(40).optional() }),
  z.object({ op: z.literal("remove_edge"), from: Id, to: Id }),
  z.object({
    op: z.literal("set"),
    title: z.string().min(1).max(80).optional(),
    structure: Structure.optional(),
    theme: Theme.optional(),
    animate: z.boolean().optional(),
  }),
  z.object({ op: z.literal("comment"), id: Id, text: z.string().min(1).max(300) }),
]);

export type Op = z.infer<typeof Op>;

export interface Comment {
  node: string;
  text: string;
  by: "user" | "model";
  at: string;
}

export interface LogEntry {
  revision: number;
  by: "user" | "model";
  changes: string[];
  at: string;
}

/** What the store keeps for one diagram. */
export interface Stored {
  docId: string;
  revision: number;
  doc: Doc;
  comments: Comment[];
  log: LogEntry[];
  createdAt: string;
  updatedAt: string;
}

export const STRUCTURE_LABELS: Record<Structure, string> = {
  mindmap: "Mind map",
  two_sided: "Two sided",
  logic: "Logic chart",
  org: "Org chart",
  outline: "Outline",
  timeline: "Timeline",
  fishbone: "Fishbone",
  flowchart: "Flowchart",
  swimlanes: "Swimlanes",
};
