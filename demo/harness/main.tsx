import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/app/App.js";
import type { Host } from "../../src/app/host.js";
import type { Loaded } from "../../src/app/useDiagram.js";
import { FIXTURES, launchPlan } from "../../src/fixtures.js";
import type { Doc, Op, Structure, Theme } from "../../src/model/schema.js";
import { createService, type Shown } from "../../src/service.js";
import { MemoryStore } from "../../src/store/store.js";

/**
 * A stand-in for a chat client, so the app can be looked at, tested and
 * recorded without one. It runs the real app and the real tool logic against a
 * store in memory. Only the "AI" is fake: its replies are scripted below.
 *
 * Address options:
 *   ?fixture=0..4      which sample diagram
 *   &structure=...     override its structure
 *   &theme=...         override its theme
 *   &mode=light|dark   chat color scheme
 *   &view=card|full|chat   just the card, the full-screen view, or the fake chat
 *   &still=1           no animation, for screenshots
 */

const params = new URLSearchParams(location.search);
const service = createService(new MemoryStore());

/** What the pretend AI adds when asked about a node. */
const SCRIPT: Record<string, Array<{ label: string; status?: "todo" | "risk" | "idea" }>> = {
  "expand:price": [{ label: "Team plan" }, { label: "Education discount" }, { label: "Lifetime deal", status: "idea" }],
  "breakdown:chan3": [{ label: "Write the script" }, { label: "Record the screen" }, { label: "Cut to 40 seconds" }],
  "tasks:time1": [
    { label: "Invite 20 testers", status: "todo" },
    { label: "Collect feedback", status: "todo" },
    { label: "Fix top 5 issues", status: "todo" },
  ],
  "breakdown:f1": [
    { label: "Profile the slow query", status: "todo" },
    { label: "Cache the widgets", status: "todo" },
    { label: "Load charts last", status: "todo" },
  ],
  "challenge:msg": [
    { label: "Too many messages", status: "risk" },
    { label: "No proof yet", status: "risk" },
  ],
};

/** What the pretend AI does when asked its own question about a node, or sent a comment on one. */
const ANSWERS: Record<string, { ops: Op[]; say: string }> = {
  "ask:pay": {
    ops: [
      { op: "update_node", id: "p1", status: "doing", note: "Fix first. Customers are charged twice, so every day it stays open costs money and trust." },
      { op: "update_node", id: "p2", note: "Second. Annoying, but nobody loses money." },
    ],
    say: "Double charge on retry first: it costs customers money. I marked it as doing and added the reason to its note.",
  },
  "comment:m3": {
    ops: [
      { op: "add_node", id: "later", parent: "root", label: "Later" },
      { op: "move_node", id: "m3", parent: "later" },
    ],
    say: 'Done. I moved "Dark mode gaps" to a new "Later" branch.',
  },
};

function scriptedReply(text: string, doc: Doc): { ops: Op[]; say: string } | undefined {
  const nodeId = /\(node ([A-Za-z0-9_-]+)\)/.exec(text)?.[1];
  const node = doc.nodes.find((item) => item.id === nodeId);
  if (!node) return undefined;
  const action = /^I left /.test(text)
    ? "comment"
    : /add 3 to 5 child/.test(text)
      ? "expand"
      : /break this down/.test(text)
        ? "breakdown"
        : /concrete tasks/.test(text)
          ? "tasks"
          : /weak, risky/.test(text)
            ? "challenge"
            : /explain this/.test(text)
              ? "explain"
              : "ask";
  const answer = ANSWERS[`${action}:${node.id}`];
  if (answer) return answer;
  if (action === "explain" || action === "ask" || action === "comment") {
    return {
      ops: [{ op: "update_node", id: node.id, note: `${node.label}: the short version is that this matters because the rest of the plan depends on it.` }],
      say: `I added a note to "${node.label}".`,
    };
  }
  const items = SCRIPT[`${action}:${node.id}`] ?? [{ label: `${node.label}: first part` }, { label: `${node.label}: second part` }, { label: `${node.label}: third part` }];
  return {
    ops: items.map((item, index) => ({ op: "add_node" as const, id: `${node.id}_x${index + 1}`, parent: node.id, label: item.label, ...(item.status ? { status: item.status } : {}) })),
    say: `I added ${items.length} nodes under "${node.label}".`,
  };
}

interface Bubble {
  from: "user" | "ai" | "card";
  text?: string;
}

function Harness() {
  const view = params.get("view") ?? "card";
  const still = params.get("still") === "1";
  const [mode, setMode] = useState<"light" | "dark">(params.get("mode") === "dark" ? "dark" : "light");
  const [display, setDisplay] = useState<"inline" | "fullscreen">(view === "full" ? "fullscreen" : "inline");
  const [loaded, setLoaded] = useState<Loaded | undefined>();
  const [draft, setDraft] = useState<Doc | undefined>();
  const [streaming, setStreaming] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [context, setContext] = useState("");
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;

  const base = useMemo<Doc>(() => {
    const doc = FIXTURES[Number(params.get("fixture") ?? 0)] ?? launchPlan;
    return {
      ...doc,
      structure: (params.get("structure") as Structure | null) ?? doc.structure,
      theme: (params.get("theme") as Theme | null) ?? doc.theme,
      ...(still ? { animate: false } : {}),
    };
  }, [still]);

  const show = useCallback(async (doc: Doc) => {
    const result = await service.visualize({ ...doc });
    const shown = result.structuredContent as Shown;
    setLoaded({ docId: shown.docId, revision: shown.revision, doc: shown.doc });
    setDraft(undefined);
    setStreaming(false);
  }, []);

  /** Feed the diagram in node by node, the way a model writes it. */
  const stream = useCallback(
    async (doc: Doc, stepMs = 140) => {
      setLoaded(undefined);
      setStreaming(true);
      for (let count = 1; count <= doc.nodes.length; count += 1) {
        setDraft({ ...doc, nodes: doc.nodes.slice(0, count), edges: undefined });
        await new Promise((done) => setTimeout(done, stepMs));
      }
      await show(doc);
    },
    [show],
  );

  useEffect(() => {
    if (view === "chat") return;
    void show(base);
  }, [base, show, view]);

  const host = useMemo<Host>(
    () => ({
      theme: mode,
      displayMode: display,
      canFullscreen: true,
      requestDisplayMode: async (next) => setDisplay(next),
      callTool: async (name, args) => {
        const run = { load_state: service.load, save_state: service.save, export: service.export }[name] as ((input: never) => Promise<{ content: Array<{ text: string }>; structuredContent?: Record<string, unknown>; isError?: boolean }>) | undefined;
        if (!run) return { output: undefined, text: `No tool ${name}`, isError: true };
        const result = await run(args as never);
        return { output: result.structuredContent, text: result.content.map((block) => block.text).join("\n"), isError: result.isError === true };
      },
      sendMessage: async (text) => {
        setBubbles((list) => [...list, { from: "user", text }]);
        const now = loadedRef.current;
        if (!now) return;
        const current = (await service.load({ docId: now.docId })).structuredContent as Shown;
        const reply = scriptedReply(text, current.doc);
        if (!reply) return;
        await new Promise((done) => setTimeout(done, 1100));
        await service.edit({ docId: now.docId, ops: reply.ops });
        setBubbles((list) => [...list, { from: "ai", text: reply.say }]);
      },
      updateModelContext: async (text) => {
        setContext(text);
        return true;
      },
      download: async () => false,
    }),
    [mode, display],
  );

  // Keep the newest message in sight, as a chat does.
  useEffect(() => {
    // Keep the diagram in sight while the talk goes on below it.
    if (view === "chat" && bubbles.length > 2) document.querySelector(".card")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [bubbles.length, view]);

  // Hooks for the recording script.
  useEffect(() => {
    Object.assign(window, {
      demo: {
        prompt: (text: string) => setBubbles((list) => [...list, { from: "user", text }]),
        reply: (text: string) => setBubbles((list) => [...list, { from: "ai", text }]),
        card: () => setBubbles((list) => [...list, { from: "card" }]),
        stream: (index = 0, stepMs = 140) => stream(FIXTURES[index] ?? launchPlan, stepMs),
        mode: setMode,
      },
    });
  }, [stream]);

  const app = <App host={host} loaded={loaded} draft={draft} streaming={streaming} />;
  const page = mode === "dark" ? { background: "#161616", color: "#F2EFE9" } : { background: "#FFFFFF", color: "#141414" };

  if (view !== "chat") {
    return <div style={{ ...page, minHeight: "100vh", padding: display === "fullscreen" ? 0 : 16 }}>{app}</div>;
  }
  return (
    <div className={`chat chat-${mode}`} style={page}>
      <header>Demo chat. The replies are scripted, the diagram is the real app.</header>
      <main>
        {bubbles.map((bubble, index) =>
          bubble.from === "card" ? (
            <div key={index} className={display === "fullscreen" ? "card card-full" : "card"}>
              {app}
            </div>
          ) : (
            <div key={index} className={`bubble bubble-${bubble.from}`}>
              {bubble.text}
            </div>
          ),
        )}
      </main>
      {context ? (
        <aside>
          <strong>What the AI is told</strong>
          <pre>{context}</pre>
        </aside>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
