import { createServer } from "plugmcp";
import { z } from "zod";
import { Edge, Lane, Node, Op, Structure, Theme } from "./src/model/schema.js";
import { createService } from "./src/service.js";
import { FileStore } from "./src/store/file.js";

const service = createService(new FileStore());

const DocId = z.string().regex(/^[a-z0-9]{6,16}$/).describe("The docId a visualize result gave you");

const server = createServer({
  name: "mindmap",
  title: "Mind Map MCP",
  version: "0.1.0",
  description: "Show ideas as mind maps and flowcharts in the chat. The user can restyle, edit and comment, and you are told.",
  websiteUrl: "https://github.com/plugmcp-ai/mindmap-mcp",
  instructions: [
    "Mind Map shows ideas to the user as a diagram in the chat. Its tools exist to help the user see what you mean.",
    "When your answer would be a long list, plan, breakdown, process or comparison, call visualize so the user can see it, then add at most two sentences of text. Do not repeat the diagram as text.",
    "The user can edit the diagram, comment on a node and ask about a node. You are told what they did. Answer by calling edit_diagram on the same docId, so the diagram changes in place.",
    "You send structure and labels only. Never send positions, sizes or colors: the user picks the look.",
  ].join(" "),
});

server.tool(
  {
    name: "visualize",
    title: "Show a diagram",
    description: [
      "Show an idea to the user as a diagram instead of a long text.",
      "Pick the structure from what the content is: exploring a topic -> mindmap; a hierarchy or parts of a whole -> org or logic; steps and decisions -> flowchart; causes of a problem -> fishbone; events in order -> timeline; who does what -> swimlanes (give lanes, and a lane on each node); a long list to read top to bottom -> outline.",
      "Rules: labels of 1-5 words; 3-7 children per node; at most 3 levels and about 30 nodes at first; put detail in note.",
      "Give every node a short id. For a tree set parent on every node but the root. For a flowchart leave parent out and join the nodes with edges; label the edges out of a decision.",
      "The first node is the root or the start. Send no positions and no colors.",
      "To show a diagram again, pass only its docId. To change one that is on screen, use edit_diagram, not this tool.",
    ].join(" "),
    input: z.object({
      title: z.string().max(80).optional().describe("Short title of the diagram"),
      structure: Structure.optional().describe("How to draw it. Pick from what the content is; the user can switch later."),
      theme: Theme.optional().describe("Leave out unless the user asked for a look. host follows the chat client."),
      animate: z.boolean().optional().describe("Leave out unless the user asked. Default: on."),
      lanes: z.array(Lane).optional().describe("Swimlanes only"),
      nodes: z.array(Node).optional().describe("Every idea or step, root or start first. Needed for a new diagram."),
      edges: z.array(Edge).optional().describe("Flow between flowchart nodes, or cross links between tree nodes"),
      docId: DocId.optional().describe("Alone: show that diagram again. With nodes: replace it."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    view: { displayModes: ["inline", "fullscreen"], prefersBorder: true },
  },
  (input) => service.visualize(input),
);

server.tool(
  {
    name: "edit_diagram",
    title: "Change a diagram",
    description: [
      "Change a diagram that is already on screen. Use it after the user edits, comments on or asks about a node, and for any refinement. Do not call visualize again for that.",
      "Ops apply in order and address nodes by id. A new node's id can be used by later ops in the same call.",
      "The open diagram updates itself.",
    ].join(" "),
    input: z.object({ docId: DocId, ops: z.array(Op).min(1).max(100) }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  (input) => service.edit(input),
);

server.tool(
  {
    name: "get_diagram",
    title: "Read a diagram",
    description:
      "Read a diagram as an indented outline with node ids, the user's comments, and what the user changed on the canvas. Use it before editing when you are unsure of the current state, or when the client cannot show the diagram. Without docId it reads the most recent one.",
    input: z.object({ docId: DocId.optional(), sinceRevision: z.number().int().min(0).optional() }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  (input) => service.read(input),
);

// The three tools below are for the view only. The model never sees them.

server.tool(
  {
    name: "load_state",
    description: "The view reads the diagram, or learns it is up to date.",
    input: z.object({ docId: DocId, sinceRevision: z.number().int().min(0).optional() }),
    annotations: { readOnlyHint: true, openWorldHint: false },
    visibility: ["app"],
  },
  (input) => service.load(input),
);

server.tool(
  {
    name: "save_state",
    description: "The view saves what the user changed on the canvas.",
    input: z.object({ docId: DocId, ops: z.array(Op).min(1).max(200) }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    visibility: ["app"],
  },
  (input) => service.save(input),
);

server.tool(
  {
    name: "export",
    description: "The view writes the diagram to a file on this machine.",
    input: z.object({
      docId: DocId,
      format: z.enum(["svg", "png", "json", "md"]),
      data: z.string().max(8_000_000).optional().describe("SVG text or a PNG data URL, drawn by the view"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    visibility: ["app"],
  },
  (input) => service.export(input),
);

export default server;
