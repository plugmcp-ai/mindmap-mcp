import { useMemo } from "react";
import { useTool } from "plugmcp/view";
import { App } from "../src/app/App.js";
import type { Host } from "../src/app/host.js";
import type { Loaded } from "../src/app/useDiagram.js";
import { normalize, normalizePartial } from "../src/model/normalize.js";

/**
 * The view for the visualize tool. It only connects the app to the chat client:
 * everything that draws or edits lives in src/, so the same app also runs in the
 * gallery and the demo without a chat client.
 */
export default function Visualize() {
  const tool = useTool<Partial<Loaded>, Record<string, unknown>>();
  const { app } = tool;

  const host = useMemo<Host>(
    () => ({
      theme: tool.theme,
      displayMode: tool.displayMode,
      canFullscreen: tool.availableDisplayModes.includes("fullscreen"),
      requestDisplayMode: tool.requestDisplayMode,
      callTool: tool.callTool,
      sendMessage: tool.sendMessage,
      updateModelContext: tool.updateModelContext,
      download: app?.getHostCapabilities()?.downloadFile
        ? async (file) => {
            const resource = {
              uri: `file:///${file.name}`,
              mimeType: file.mimeType,
              ...(file.base64 !== undefined ? { blob: file.base64 } : { text: file.text ?? "" }),
            };
            const result = await app.downloadFile({ contents: [{ type: "resource", resource }] });
            return result.isError !== true;
          }
        : undefined,
    }),
    [tool, app],
  );

  const output = tool.output;
  const loaded = useMemo<Loaded | undefined>(
    () => (output?.docId && output.doc && typeof output.revision === "number" ? { docId: output.docId, revision: output.revision, doc: output.doc } : undefined),
    [output],
  );
  // Until the result is in, draw what the model has written so far.
  const draft = useMemo(() => (loaded ? undefined : (normalize(tool.input) ?? normalizePartial(tool.partialInput))), [loaded, tool.input, tool.partialInput]);

  return (
    <App
      host={host}
      loaded={loaded}
      draft={draft}
      streaming={!tool.input && tool.partialInput !== undefined}
      message={tool.isError ? tool.text || "The diagram could not be made." : undefined}
    />
  );
}
