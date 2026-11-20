# Demo harness

A stand-in for a chat client. It runs the real app and the real tool logic against a store in memory, so the app can be looked at, tested and recorded without a chat client. Only the "AI" is fake: its replies are scripted in `harness/main.tsx`.

```sh
pnpm exec playwright install chromium   # once
pnpm test:e2e    # run the whole loop and check each step
pnpm gallery     # a screenshot of every structure in every style, into docs/gallery
pnpm demo        # record docs/demo.mp4 and docs/demo.gif (needs ffmpeg)
```

To look at it yourself, run `node scripts/harness.mjs` and open `demo/out/index.html` in a browser. Options go in the address:

| Option | Values |
|---|---|
| `view` | `card` (the inline card), `full` (full screen), `chat` (the stand-in chat) |
| `fixture` | `0` to `4`, a sample diagram from `src/fixtures.ts` |
| `structure` | any structure id, such as `fishbone` |
| `theme` | any style id, such as `blueprint` |
| `mode` | `light` or `dark` |
| `still` | `1` for no animation |

Example: `demo/out/index.html?view=full&fixture=1&theme=blueprint&mode=dark`

The video is made by `record.mjs`, which drives the page the way a person would and checks each step as it goes. To change the video, change that script and run `pnpm demo`.
