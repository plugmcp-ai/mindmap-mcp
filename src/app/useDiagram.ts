import { useCallback, useEffect, useRef, useState } from "react";
import { contextText, type Situation } from "../feedback/channel.js";
import { invert } from "../model/invert.js";
import { applyOps } from "../model/ops.js";
import { compactChanges } from "../model/outline.js";
import type { Doc, Op } from "../model/schema.js";
import type { Host } from "./host.js";

export interface Loaded {
  docId: string;
  revision: number;
  doc: Doc;
}

const CONTEXT_DELAY = 1200;
const FAST_POLL = 2000;
const SLOW_POLL = 10000;
const FAST_FOR = 90000;

/**
 * The diagram as the user sees it, kept in step with the server.
 *
 * - A change on the canvas is applied at once, saved, and told to the model.
 * - A change the model makes with edit_diagram is picked up by polling, so the
 *   open diagram updates in place.
 */
export function useDiagram(host: Host, loaded: Loaded | undefined, selected: string | null) {
  const [doc, setDoc] = useState<Doc | undefined>(loaded?.doc);
  const [revision, setRevision] = useState(loaded?.revision ?? 0);
  const [changes, setChanges] = useState<string[]>([]);
  const [pendingComments, setPendingComments] = useState<Array<{ node: string; text: string }>>([]);
  // Undo and redo stacks. Kept in a ref so a step reads and writes them in one go.
  const history = useRef<{ undo: Op[][]; redo: Op[][] }>({ undo: [], redo: [] });
  const [, redraw] = useState(0);
  const setHistory = useCallback((next: { undo: Op[][]; redo: Op[][] }) => {
    history.current = next;
    redraw((value) => value + 1);
  }, []);
  const [contextOk, setContextOk] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);

  const live = useRef({ doc, revision, changes, host, selected, docId: loaded?.docId });
  live.current = { doc, revision, changes, host, selected, docId: loaded?.docId };
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const unsaved = useRef(0);
  const active = useRef(Date.now());
  const contextTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A new tool result replaces what is on screen.
  useEffect(() => {
    if (!loaded) return;
    setDoc(loaded.doc);
    setRevision(loaded.revision);
    setChanges([]);
    setPendingComments([]);
    setHistory({ undo: [], redo: [] });
    active.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded?.docId, loaded?.revision]);

  const situation = useCallback((): Situation | undefined => {
    const now = live.current;
    if (!now.doc || !now.docId) return undefined;
    return {
      docId: now.docId,
      revision: now.revision,
      doc: now.doc,
      changes: now.changes,
      selected: now.doc.nodes.find((node) => node.id === now.selected),
    };
  }, []);

  const tellModel = useCallback(() => {
    clearTimeout(contextTimer.current);
    contextTimer.current = setTimeout(() => {
      const now = situation();
      if (!now) return;
      void live.current.host
        .updateModelContext(contextText(now), { docId: now.docId, revision: now.revision, changes: now.changes, selected: now.selected?.id ?? null })
        .then(setContextOk)
        .catch(() => setContextOk(false));
    }, CONTEXT_DELAY);
  }, [situation]);

  // The model should know which node the user is looking at.
  useEffect(() => {
    if (live.current.docId && selected) tellModel();
  }, [selected, tellModel]);
  useEffect(() => () => clearTimeout(contextTimer.current), []);

  const commit = useCallback(
    (ops: Op[]): boolean => {
      const now = live.current;
      if (!now.doc || !ops.length) return false;
      const applied = applyOps(now.doc, ops);
      if (!applied.changes.length) return false;
      live.current = { ...now, doc: applied.doc, changes: compactChanges([...now.changes, ...applied.changes]) };
      setDoc(applied.doc);
      setChanges(live.current.changes);
      if (applied.comments.length) setPendingComments((list) => [...list, ...applied.comments]);
      active.current = Date.now();
      const docId = now.docId;
      if (docId) {
        unsaved.current += 1;
        saving.current = saving.current
          .then(() => live.current.host.callTool("save_state", { docId, ops }))
          .then((result) => {
            const saved = (result as Awaited<ReturnType<Host["callTool"]>>).output?.revision;
            if (typeof saved === "number") setRevision(saved);
            setSaveFailed((result as Awaited<ReturnType<Host["callTool"]>>).isError);
          })
          .catch(() => setSaveFailed(true))
          .finally(() => {
            unsaved.current -= 1;
          });
      }
      tellModel();
      return true;
    },
    [tellModel],
  );

  const apply = useCallback(
    (ops: Op[]) => {
      const before = live.current.doc;
      if (!before) return;
      const back = invert(before, ops);
      if (commit(ops) && back.length) setHistory({ undo: [...history.current.undo, back].slice(-60), redo: [] });
    },
    [commit, setHistory],
  );

  const step = useCallback(
    (from: "undo" | "redo") => {
      const now = history.current;
      const ops = now[from].at(-1);
      const before = live.current.doc;
      if (!ops || !before) return;
      const back = invert(before, ops);
      commit(ops);
      const to = from === "undo" ? "redo" : "undo";
      setHistory({ ...now, [from]: now[from].slice(0, -1), [to]: [...now[to], back] });
    },
    [commit, setHistory],
  );

  // Pick up what the model changed with edit_diagram.
  const docId = loaded?.docId;
  useEffect(() => {
    if (!docId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (stopped) return;
      const hiddenNow = typeof document !== "undefined" && document.hidden;
      if (!hiddenNow && unsaved.current === 0) {
        try {
          const { output, isError } = await live.current.host.callTool("load_state", { docId, sinceRevision: live.current.revision });
          const next = output as (Partial<Loaded> & { unchanged?: boolean }) | undefined;
          if (!stopped && !isError && next && !next.unchanged && next.doc && typeof next.revision === "number" && unsaved.current === 0 && next.revision > live.current.revision) {
            setDoc(next.doc);
            setRevision(next.revision);
            // The model has seen the user's changes: it reported them in its own edit.
            setChanges([]);
            setHistory({ undo: [], redo: [] });
            active.current = Date.now();
          }
        } catch {
          // A host that cannot call tools from the view keeps what it has.
        }
      }
      timer = setTimeout(check, Date.now() - active.current < FAST_FOR ? FAST_POLL : SLOW_POLL);
    };
    timer = setTimeout(check, FAST_POLL);
    const wake = () => {
      active.current = Date.now();
    };
    window.addEventListener("focus", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("focus", wake);
    };
  }, [docId]);

  /** Call after a message went to the chat: the model is about to answer, so look for its edit soon. */
  const expectReply = useCallback((sentComments: boolean) => {
    active.current = Date.now();
    if (sentComments) setPendingComments([]);
  }, []);

  return {
    doc,
    revision,
    changes,
    pendingComments,
    contextOk,
    saveFailed,
    canUndo: history.current.undo.length > 0,
    canRedo: history.current.redo.length > 0,
    apply,
    undo: () => step("undo"),
    redo: () => step("redo"),
    situation,
    expectReply,
  };
}
