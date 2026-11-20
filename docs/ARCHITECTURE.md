# Architecture

## The idea

The model describes **what the ideas are and how they connect**. It never says where anything goes or what color it is. A layout turns that description into positions, a theme turns it into colors, and the canvas draws the result. Because the three are separate, one document can be shown as any structure in any style, and switching costs no request to the model.

```
model input ──> document ──> layout ──> boxes and links ──> canvas (SVG)
 (nodes,         (stored      (pure       (positions)           ^
  parents,        as JSON)     function)                       theme (tokens)
  edges)
```

## The document

`src/model/schema.ts`. A diagram is a flat list of nodes. Each node has an `id`, a `label`, and optionally a `parent`, a `note`, a `status`, a flowchart `kind` and a swimlane `lane`. Optional `edges` join nodes for flow and cross links.

The list is flat, with parent ids, instead of nested children, for three reasons:

- **Streaming.** While the model writes the input, each finished list item is a whole node, so the view can draw it at once.
- **Editing.** Patch operations and the document address nodes the same way, by id.
- **One shape for trees and graphs.** A mind map and a flowchart are the same kind of document.

`src/model/tree.ts` reads any document as a tree (`treeOf`) or as a graph (`graphOf`), which is what lets a flowchart be shown as a mind map and the other way round.

## The tools

`server.ts` wires the tools. `src/service.ts` holds what they do, apart from MCP, so it is tested with a store in memory.

| Tool | Seen by | Purpose |
|---|---|---|
| `visualize` | model | Create a diagram, replace one, or show one again from its `docId`. Has the view. |
| `edit_diagram` | model | Apply patch operations to a diagram by `docId`. |
| `get_diagram` | model | The diagram as an outline, with the user's comments and changes. |
| `load_state` | view | Read the diagram, or learn it is up to date. |
| `save_state` | view | Save what the user changed. |
| `export` | view | Write a file when the client cannot download from the view. |

Every result has two parts: short **text** for the model (a summary and an indented outline with node ids) and **data** for the view (`docId`, `revision`, `doc`). The text is also what a client that cannot draw the view shows, so the tools stay useful there.

There is no separate "read the format" tool. The format is small, so the description of `visualize` teaches it, and the server instructions repeat the short version.

## Storage

`src/store/`. The `Store` interface has four methods. `FileStore` keeps one JSON file per diagram in `~/.plugmcp/mindmap/`, written to a temporary file and renamed so a crash never leaves half a diagram. A `docId` goes into a file name, so only ids of the form the server makes are accepted.

Each file holds the document, a revision number, comments, and a short log of changes marked `user` or `model`. The log is how the model learns what the user did on the canvas since the model last wrote the diagram.

To host the server for many users, implement `Store` on a database and pass it to `createService`.

## The view

`views/visualize.tsx` only connects the app to the chat client through `useTool` from `plugmcp/view`. Everything else is in `src/`, behind the small `Host` interface in `src/app/host.ts`. The demo harness fills that interface with a fake, which is how the app is tested and recorded without a chat client.

- `src/layouts/` holds one pure function per structure. See `types.ts` for the contract. A layout returns boxes and links. A link names two boxes, a shape and the sides it joins, never a path.
- `src/canvas/paths.ts` turns a link and the current position of its two boxes into an SVG path. Because paths are worked out from positions on every frame, moving between two layouts only needs the boxes to be moved: `src/canvas/useTween.ts` does that, and the lines follow.
- `src/themes/` holds one set of tokens per style.
- `src/canvas/Canvas.tsx` draws one `<svg>` and handles pan, zoom, selection, rename, drag and the keyboard.
- `src/app/` is the toolbar, the node panel, export, and `useDiagram`, which keeps the diagram on screen in step with the server.

The view is built into one HTML file with everything inline. It needs no content security policy exceptions and loads nothing from outside.

## From the canvas to the chat

`src/feedback/channel.ts` builds every word the model is told about what the user did. There are two ways it gets there.

1. **Quietly.** After an edit, and when the selection changes, the view sends the model a short context: the changes since the model last wrote the diagram, the selected node, and an outline. It replaces the previous context and the model reads it with the user's next message. Nothing appears in the chat.
2. **As a message.** A node action, a question or a batch of comments is sent into the chat as the user. It names the node and the `docId` and asks the model to answer with `edit_diagram`.

Every user change is also saved at once through `save_state`. That makes the server's log the source of truth that does not depend on the client: whatever a client supports, `edit_diagram` and `get_diagram` report the user's changes to the model.

When the model calls `edit_diagram`, the open view finds out by polling `load_state`: every two seconds for ninety seconds after any activity, then every ten seconds, and not at all while the page is hidden. It then moves the diagram to its new shape.

Fallbacks, decided by what the client reports at run time:

| The client cannot | What happens |
|---|---|
| take quiet context | A "Send my edits" button appears, and node actions carry the changes inside their message. |
| take messages from a view | The prompt is shown for the user to copy into the chat. |
| send a message without the user (VS Code) | The message waits in the message box; the view says to press Enter. |
| show a view at all | The tool result is an outline, and `get_diagram` reads the rest. |
| keep an earlier view alive | The model is told to call `visualize` with the `docId` to show the diagram again. |
| download from a view | `export` writes the file to the diagrams folder and shows the path. |

## Tests

- `src/**/*.test.ts`: the model, the patch operations, the service, storage, and every layout against every sample diagram.
- `.plugmcp/tests.json`: saved tool calls, run with `pnpm test:tools`.
- `scripts/smoke.mjs`: starts the built server over stdio the way a client does.
- `demo/record.mjs --check`: the whole loop in a real browser, in the demo harness.

## What is not built

- Sign-in and per-user storage, needed before the HTTP mode is safe to expose.
- Cross links drawn by hand on the canvas, images in nodes, and several people editing at once.
- Import from Mermaid or Markdown.
- Touch gestures beyond tap and drag: there is no pinch to zoom yet.
