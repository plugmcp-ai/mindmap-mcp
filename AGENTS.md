# Notes for AI coding agents

This is an MCP App built on the PlugMCP framework. Read `docs/ARCHITECTURE.md` and `CONTRIBUTING.md` before changing anything.

## Layout

- `server.ts`: the six tools. Their descriptions are prompts for the model that uses the server.
- `src/service.ts`: what the tools do. Tested with a store in memory.
- `src/model/`: the document, patch operations, outline text. No browser or Node code.
- `src/store/`: where diagrams are kept. `file.ts` is the only file that touches the disk.
- `src/layouts/`: one pure function per structure. `src/themes/`: one set of tokens per style.
- `src/canvas/`, `src/app/`: the view. `src/feedback/channel.ts`: what the model is told about the user's edits.
- `views/visualize.tsx`: connects the app to the chat client. Keep it thin.
- `demo/`: a stand-in chat client for tests, the gallery and the demo video.

## Rules

- The model sends structure and labels, never coordinates or colors.
- Every file at the top of `views/` is treated as a view by the framework. Shared code goes in `src/`.
- The view must stay one file that loads nothing from outside. Do not add a font, an image host or a CDN.
- `src/model/` must not import from `node:` or use the DOM.
- A layout must draw any document and give the same result every time.
- No network calls and no telemetry.
- Plain words and no emojis in the interface, the tool descriptions and the docs.
- Do not guess an MCP or MCP Apps signature. Read the types in `node_modules`.

## Check your work

```sh
pnpm typecheck && pnpm test && pnpm build && pnpm smoke && pnpm test:e2e
```

After a visible change run `pnpm gallery` and look at the pictures in `docs/gallery/`.
