# Contributing

Thank you for helping. This guide gets you from a clone to a merged change.

## Set up

You need Node 20.19 or newer and pnpm 10.

```sh
git clone https://github.com/plugmcp-ai/mindmap.git
cd mindmap
pnpm install
pnpm test
```

- `pnpm dev` opens the PlugMCP Studio. Use its Tools page to call `visualize` and see the view, and its Chat page to try it with a model on your own key.
- `pnpm gallery` draws every structure in every style into `docs/gallery/`. This is the fastest way to see what a change to a layout or theme does.
- `pnpm test:e2e` runs the whole loop in a real browser: the diagram streams in, structures and styles switch, an edit reaches the AI, and the AI's edit updates the diagram.

The first run of the gallery or the end-to-end test needs a browser: `pnpm exec playwright install chromium`.

## Add a style

A style is a set of colors and a few choices. It holds no drawing code.

1. Copy `src/themes/mono.ts` to `src/themes/<name>.ts` and change the values. Every token is explained in `src/themes/types.ts`.
2. Add the id to `THEMES` in `src/model/schema.ts`.
3. Add the theme to the list in `src/themes/index.ts`.
4. Run `pnpm gallery` and look at `docs/gallery/*-<name>.png`.

Check before you open a pull request:

- Text has a contrast of at least 4.5 to 1 against what is behind it, in both light and dark.
- Branches can be told apart without relying on color alone. If you use several colors, pick ones that people with color blindness can separate. `OKABE_ITO` in `src/themes/types.ts` is a safe set.
- No fonts or images are loaded from outside. The view must stay one file.

## Add a structure

A structure is one pure function. It gets the document and the size of every node, and returns where the boxes go and which lines join them. It draws nothing and knows nothing about animation.

1. Copy `src/layouts/logic.ts` (the shortest tree layout) or `src/layouts/flowchart.ts` (a graph layout) to `src/layouts/<name>.ts`. The contract is in `src/layouts/types.ts`.
2. Add the id to `STRUCTURES` and a label to `STRUCTURE_LABELS` in `src/model/schema.ts`.
3. Add the layout to the list in `src/layouts/index.ts`.
4. Run `pnpm test`. `src/layouts/layouts.test.ts` runs every layout against every sample diagram and fails if boxes overlap, a node is missing, a line points at nothing, or the result changes between two runs.
5. Run `pnpm gallery`, add your structure to `STRUCTURES` in `scripts/gallery.mjs` with the sample that suits it, and look at the pictures.

Rules for a layout:

- It must draw **any** document, not only the kind it is meant for. A user can switch to it at any time. `treeOf` in `src/model/tree.ts` reads any document as a tree, and `graphOf` reads any document as a graph.
- The same input must always give the same output. No randomness, no clock.
- Use `compact` to prefer a wide, short result in the inline chat card.

## Change the model, the tools or the canvas

- `src/model/` is the document, the patch operations and the outline text. It has no browser or Node code, so it runs everywhere.
- `server.ts` and `src/service.ts` are the tools. Tool descriptions are prompts: they are how the AI learns when and how to draw. Change them with care and say why in the pull request.
- `src/canvas/` draws. `src/app/` is the toolbar, the node panel and the sync with the server. `src/feedback/channel.ts` is every word the AI is told about what the user did.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first.

## Ground rules

- **The model never sends coordinates or colors.** Structure and labels only.
- **Nothing leaves the computer.** No telemetry, no network calls from the server, nothing loaded from outside by the view.
- **Plain words** in the interface, the tool descriptions and the docs. No emojis.
- **Follow the MCP and MCP Apps specifications.** Do not guess a signature: read the types.
- **Keep it small.** A new option needs a clear case that the existing ones cannot cover. A new dependency in the view needs a good reason: it is shipped to every chat.

## Before you open a pull request

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
pnpm test:e2e
```

If your change is visible, run `pnpm gallery` and commit the pictures that changed.

## Good first issues

Issues labelled `good first issue` have enough detail to start without asking. New styles and new structures are always welcome: open an issue with the "New style" or "New structure" form first, so we can agree on the idea before you build it.
