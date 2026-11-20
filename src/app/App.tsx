import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Canvas, statusLabel, type CanvasHandle } from "../canvas/Canvas.js";
import { ACTIONS, actionMessage, askMessage, changesMessage, commentsMessage, type ActionId } from "../feedback/channel.js";
import { LAYOUTS } from "../layouts/index.js";
import type { Doc, Structure, Theme } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { THEMES, themeFor } from "../themes/index.js";
import { exportDiagram, type ExportFormat } from "./export.js";
import type { Host } from "./host.js";
import { STYLES } from "./styles.js";
import { Icon, IconButton, Menu, Toast } from "./ui.js";
import { useDiagram, type Loaded } from "./useDiagram.js";

interface Props {
  host: Host;
  /** The saved diagram, once the tool result is in. */
  loaded: Loaded | undefined;
  /** The diagram while the model is still writing it. Shown read-only. */
  draft: Doc | undefined;
  /** True while the draft is still growing. */
  streaming: boolean;
  /** Shown when there is nothing to draw. */
  message?: string;
}

const EXPORTS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: "png", label: "Picture", hint: "PNG" },
  { id: "svg", label: "Vector drawing", hint: "SVG" },
  { id: "md", label: "Outline", hint: "Markdown" },
  { id: "json", label: "Data", hint: "JSON" },
];

/** The whole view: toolbar, canvas, and the panel for the selected node. */
export function App({ host, loaded, draft, streaming, message }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const diagram = useDiagram(host, loaded, selected);
  const doc = diagram.doc ?? draft;
  const editable = Boolean(loaded && diagram.doc);
  const canvas = useRef<CanvasHandle>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const compact = host.displayMode !== "fullscreen";

  // The first diagram decides whether nodes appear one by one: only when it arrived whole.
  const reveal = useRef<boolean | null>(null);
  if (reveal.current === null && doc) reveal.current = !streaming;

  // Folding is a way of looking, not a change to the idea, so it stays in the view.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    if (!doc || streaming) return;
    const key = loaded?.docId ?? "draft";
    if (seeded.current === key) return;
    seeded.current = key;
    const tree = treeOf(doc);
    const start = new Set(doc.nodes.filter((node) => node.collapsed).map((node) => node.id));
    // A big diagram opens with its deep levels folded, so the first look is not a wall of nodes.
    if (doc.nodes.length > 40) {
      for (const node of doc.nodes) if ((tree.depth.get(node.id) ?? 0) >= 2 && (tree.children.get(node.id) ?? []).length) start.add(node.id);
    }
    setCollapsed(start);
  }, [doc, streaming, loaded?.docId]);
  const toggle = useCallback((id: string) => {
    setCollapsed((now) => {
      const next = new Set(now);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (diagram.saveFailed) setToast("Could not save. Your changes are kept here until the chat reloads.");
  }, [diagram.saveFailed]);

  const structure: Structure = doc?.structure ?? "mindmap";
  const themeId: Theme = doc?.theme ?? "host";
  const animate = doc?.animate ?? true;
  const tokens = useMemo(() => themeFor(themeId).tokens(host.theme), [themeId, host.theme]);
  const node = doc?.nodes.find((item) => item.id === selected);
  useEffect(() => {
    if (selected && doc && !node) setSelected(null);
  }, [selected, doc, node]);

  const say = async (text: string, sentComments = false) => {
    try {
      await host.sendMessage(text);
      diagram.expectReply(sentComments);
      setToast("Sent to the chat. If it is waiting in the message box, press Enter.");
    } catch {
      // A client that takes no messages from a view: let the user copy the prompt.
      setManual(text);
    }
  };
  const act = (action: ActionId) => {
    const now = diagram.situation();
    if (node && now) void say(actionMessage(action, node, now, !diagram.contextOk));
  };
  const ask = () => {
    const now = diagram.situation();
    if (!node || !now || !question.trim()) return;
    void say(askMessage(question, node, now, !diagram.contextOk));
    setQuestion("");
  };
  const comment = () => {
    if (!node || !question.trim()) return;
    diagram.apply([{ op: "comment", id: node.id, text: question.trim() }]);
    setQuestion("");
    setToast("Comment added. Send your comments to the chat when you are ready.");
  };
  const sendComments = () => {
    const now = diagram.situation();
    if (!now) return;
    const list = diagram.pendingComments.flatMap((item) => {
      const target = now.doc.nodes.find((entry) => entry.id === item.node);
      return target ? [{ node: target, text: item.text }] : [];
    });
    if (list.length) void say(commentsMessage(list, now, !diagram.contextOk), true);
  };
  const sendChanges = () => {
    const now = diagram.situation();
    if (now?.changes.length) void say(changesMessage(now));
  };

  const doExport = async (format: ExportFormat) => {
    if (!doc) return;
    try {
      const background = tokens.background === "transparent" ? (host.theme === "dark" ? "#141414" : "#FFFFFF") : tokens.background;
      setToast(await exportDiagram(format, { host, doc, docId: loaded?.docId, snapshot: () => canvas.current?.snapshot() ?? null, background, font: tokens.font }));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The export failed.");
    }
  };

  const chrome = {
    "--mm-bg": tokens.background === "transparent" ? tokens.surface : tokens.background,
    "--mm-surface": tokens.surface,
    "--mm-text": tokens.text,
    "--mm-muted": tokens.muted,
    "--mm-line": tokens.line,
    "--mm-accent": tokens.accent,
    fontFamily: tokens.font,
    height: compact ? "auto" : "100vh",
  } as CSSProperties;

  return (
    <div className={`mm-root${compact ? " mm-compact" : ""}`} style={chrome} data-theme={themeId} data-structure={structure}>
      <style>{STYLES}</style>
      {doc ? (
        <>
          <div className="mm-bar" role="toolbar" aria-label="Diagram">
            <Menu
              testId="structure"
              icon="structure"
              label="Structure"
              showValue
              value={structure}
              items={LAYOUTS.map((layout) => ({ id: layout.id, label: layout.label, hint: compact ? undefined : layout.description }))}
              onPick={(id) => (editable ? diagram.apply([{ op: "set", structure: id }]) : undefined)}
            />
            <Menu
              testId="theme"
              icon="theme"
              label="Style"
              showValue={!compact}
              value={themeId}
              items={THEMES.map((theme) => ({ id: theme.id, label: theme.label, hint: compact ? undefined : theme.description }))}
              onPick={(id) => (editable ? diagram.apply([{ op: "set", theme: id }]) : undefined)}
            />
            <IconButton
              icon="motion"
              label={animate ? "Animation is on. Turn it off" : "Animation is off. Turn it on"}
              pressed={animate}
              disabled={!editable}
              onClick={() => diagram.apply([{ op: "set", animate: !animate }])}
            />
            <span className="mm-grow" />
            {diagram.pendingComments.length ? (
              <IconButton icon="chat" label="Send your comments to the chat" text={`Send ${diagram.pendingComments.length} comment${diagram.pendingComments.length === 1 ? "" : "s"}`} onClick={sendComments} />
            ) : !diagram.contextOk && diagram.changes.length ? (
              <IconButton icon="chat" label="Tell the chat what you changed" text="Send my edits" onClick={sendChanges} />
            ) : null}
            {!compact ? (
              <>
                <IconButton icon="undo" label="Undo" disabled={!diagram.canUndo} onClick={diagram.undo} />
                <IconButton icon="redo" label="Redo" disabled={!diagram.canRedo} onClick={diagram.redo} />
                <IconButton icon="minus" label="Zoom out" onClick={() => canvas.current?.zoom(1 / 1.25)} />
                <IconButton icon="plus" label="Zoom in" onClick={() => canvas.current?.zoom(1.25)} />
              </>
            ) : null}
            <IconButton icon="fit" label="Fit to the view" onClick={() => canvas.current?.fit()} />
            <Menu testId="export" icon="download" label="Export" items={EXPORTS} onPick={(id) => void doExport(id)} align="right" />
            {host.canFullscreen ? (
              <IconButton
                icon={compact ? "expand" : "shrink"}
                label={compact ? "Full screen" : "Leave full screen"}
                onClick={() => void host.requestDisplayMode(compact ? "fullscreen" : "inline")}
              />
            ) : null}
          </div>

          <div className="mm-stage">
            <Canvas
              ref={canvas}
              doc={doc}
              structure={structure}
              tokens={tokens}
              compact={compact}
              animate={animate}
              reveal={reveal.current === true}
              editable={editable}
              selected={selected}
              onSelect={setSelected}
              renaming={renaming}
              onRenaming={setRenaming}
              collapsed={collapsed}
              onToggle={toggle}
              onOps={diagram.apply}
              onUndo={diagram.undo}
              onRedo={diagram.redo}
            />
            {toast ? <Toast>{toast}</Toast> : null}
            {manual ? (
              <div className="mm-manual" role="dialog" aria-label="Message for the chat">
                <p>This chat does not take messages from a diagram. Copy this into the chat:</p>
                <textarea readOnly value={manual} rows={4} onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="mm-btn mm-btn-text" onClick={() => setManual(null)}>
                  <Icon name="close" /> <span>Close</span>
                </button>
              </div>
            ) : null}
          </div>

          {node && editable ? (
            <div className="mm-node" data-testid="node-panel">
              <div className="mm-node-head">
                <strong>{node.label}</strong>
                {node.status ? <span className="mm-chip">{statusLabel(node.status)}</span> : null}
                <span className="mm-grow" />
                <button type="button" className="mm-link" onClick={() => setRenaming(node.id)}>
                  Rename
                </button>
                <button type="button" className="mm-link" onClick={() => diagram.apply([{ op: "add_node", parent: node.id, label: "New idea" }])}>
                  Add child
                </button>
                {(treeOf(doc).children.get(node.id) ?? []).length ? (
                  <button type="button" className="mm-link" onClick={() => toggle(node.id)}>
                    {collapsed.has(node.id) ? "Unfold" : "Fold"}
                  </button>
                ) : null}
                {node.id !== treeOf(doc).root.id ? (
                  <button
                    type="button"
                    className="mm-link"
                    onClick={() => {
                      diagram.apply([{ op: "remove_node", id: node.id }]);
                      setSelected(null);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
                <button type="button" className="mm-btn" aria-label="Close" title="Close" onClick={() => setSelected(null)}>
                  <Icon name="close" size={14} />
                </button>
              </div>
              {node.note ? <p className="mm-note">{node.note}</p> : null}
              <div className="mm-actions">
                {ACTIONS.map((action) => (
                  <button key={action.id} type="button" className="mm-chip mm-chip-btn" data-action={action.id} onClick={() => act(action.id)}>
                    {action.label}
                  </button>
                ))}
              </div>
              <form
                className="mm-ask"
                onSubmit={(event) => {
                  event.preventDefault();
                  ask();
                }}
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about this node, or leave a comment"
                  aria-label="Ask about this node, or leave a comment"
                  maxLength={300}
                />
                <button type="submit" className="mm-btn mm-btn-text mm-primary" disabled={!question.trim()}>
                  Ask
                </button>
                <button type="button" className="mm-btn mm-btn-text" disabled={!question.trim()} onClick={comment}>
                  Comment
                </button>
              </form>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mm-empty">{message ?? "Drawing the diagram"}</div>
      )}
    </div>
  );
}
