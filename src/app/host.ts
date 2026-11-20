/**
 * What the app needs from the chat client. views/visualize.tsx fills this from
 * the MCP Apps connection. The gallery and the demo fill it with a fake, so the
 * same app runs without a chat client.
 */
export interface Host {
  theme: "light" | "dark";
  displayMode: "inline" | "fullscreen" | "pip";
  /** True when the client can show the view full screen. */
  canFullscreen: boolean;
  requestDisplayMode: (mode: "inline" | "fullscreen") => Promise<unknown>;
  /** Call a tool on the server. */
  callTool: (name: string, args: Record<string, unknown>) => Promise<{ output: Record<string, unknown> | undefined; text: string; isError: boolean }>;
  /** Put a message into the chat as the user. */
  sendMessage: (text: string) => Promise<void>;
  /** Tell the model something quietly. False when the client cannot. */
  updateModelContext: (text: string, data?: Record<string, unknown>) => Promise<boolean>;
  /** Hand the user a file. False when the client cannot. */
  download?: (file: { name: string; mimeType: string; text?: string; base64?: string }) => Promise<boolean>;
}
