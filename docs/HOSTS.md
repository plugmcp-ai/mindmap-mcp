# Clients

What works where. This page separates what has been **tested** from what is only **expected** from a client's documentation, because the two are easy to confuse.

## Tested

| What | How | Result |
|---|---|---|
| The server over stdio | `pnpm smoke` starts the built server and talks MCP to it | Answers `initialize`, lists six tools, three of them for the view only, serves the view as one file, makes and edits a diagram |
| The view in a browser | `pnpm test:e2e` drives the real app in the demo harness, a stand-in chat | Streams in, switches structure and style, tells the model about an edit, updates when the model edits |
| The view inside PlugMCP Studio, a real MCP Apps host | `pnpm dev`, then the `visualize` tool on the Tools page, driven by a browser script | Draws the diagram, goes full screen and back without reloading, and a rename and a change of structure arrive as model context |

The demo harness is not a chat client. It fills the same small interface the real view uses (`src/app/host.ts`) with a fake, and its "AI" replies are scripted. It proves the app and the tool logic, not any client's behaviour.

## Not tested on a real client yet

Nothing below has been run on the real client. It is what each client's documentation says, and it decides the fallbacks in the code.

| Client | Shows the view | Full screen | Quiet context | Message from the view | Notes |
|---|---|---|---|---|---|
| Claude Desktop | Expected | Expected | Expected | Expected | The view must start within 15 seconds. A tool result over about 150,000 characters is not shown. |
| Cursor | Expected | Unknown | Unknown | Expected | |
| VS Code (Copilot) | Expected | No | Shown as an attachment | Fills the message box, does not send | |
| ChatGPT | Expected, remote servers only | Expected | Unknown | Expected | Needs a hosted server. |
| claude.ai on the web | Expected, remote servers only | Expected | Expected | Expected | Needs a hosted server. |
| Claude Code | No | No | No | No | Text only: the outline in the tool result is what the user sees. |

## The question that matters most

When the model calls `edit_diagram`, the diagram that is already in the chat should change in place. That needs the client to keep the earlier view running and let it call `load_state` after the turn has ended. **Whether each client does that is not known yet.**

If a client does not, nothing breaks: the result of `edit_diagram` tells the model to call `visualize` with the `docId`, which draws the diagram again below.

## How to test a client

1. Add the server (see the README) and ask: "Show the plan for a product launch as a mind map."
2. Does the diagram appear? Does it grow while the model writes?
3. Switch the structure and the style. Go full screen and back.
4. Rename a node. Then ask in the chat: "What did I just change?" The model should know.
5. Select a node and press Expand. The model should add nodes to the same diagram.
6. Scroll up to an older diagram and edit it. Does it still save?

Please report what you find in an issue, with the client's name and version, so this page can move rows from "expected" to "tested".
