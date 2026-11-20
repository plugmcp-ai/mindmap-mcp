import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Box } from "../layouts/types.js";
import type { Doc, MapNode, Op, Structure } from "../model/schema.js";
import { subtree } from "../model/tree.js";
import type { NodeStyle, Tokens } from "../themes/types.js";
import { arrowHead, boxPath, drawLink } from "./paths.js";
import { buildScene, createMeasure } from "./scene.js";
import { MOVE_MS, prefersReducedMotion, useTween } from "./useTween.js";

export interface CanvasHandle {
  fit: () => void;
  zoom: (factor: number) => void;
  /** The drawing as an SVG element, cropped to the diagram, for export. */
  snapshot: () => SVGSVGElement | null;
}

interface Props {
  doc: Doc;
  structure: Structure;
  tokens: Tokens;
  /** True in the small inline card. */
  compact: boolean;
  animate: boolean;
  /** Draw the nodes one after another the first time. */
  reveal: boolean;
  editable: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  renaming: string | null;
  onRenaming: (id: string | null) => void;
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onOps: (ops: Op[]) => void;
  onUndo: () => void;
  onRedo: () => void;
}

const STATUS: Record<NonNullable<MapNode["status"]>, { color: string; label: string }> = {
  todo: { color: "#8D8984", label: "To do" },
  doing: { color: "#0072B2", label: "Doing" },
  done: { color: "#009E73", label: "Done" },
  blocked: { color: "#D55E00", label: "Blocked" },
  idea: { color: "#CC79A7", label: "Idea" },
  risk: { color: "#E69F00", label: "Risk" },
};

export const statusLabel = (status: MapNode["status"]) => (status ? STATUS[status].label : "");

const PAD = 28;

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  const { doc, structure, tokens, compact, animate, editable, selected, onSelect, renaming, onRenaming, collapsed, onToggle, onOps } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [area, setArea] = useState({ w: 640, h: 420 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [smooth, setSmooth] = useState(false);
  const moved = useRef(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; over: string | null } | null>(null);

  // Draw the nodes one after another the first time a whole diagram arrives.
  const [limit, setLimit] = useState<number | undefined>(() => (props.reveal && animate && !prefersReducedMotion() ? 1 : undefined));
  useEffect(() => {
    if (limit === undefined) return;
    if (limit >= doc.nodes.length) {
      setLimit(undefined);
      return;
    }
    const timer = setTimeout(() => setLimit((value) => (value === undefined ? value : value + 1)), 55);
    return () => clearTimeout(timer);
  }, [limit, doc.nodes.length]);

  const measure = useMemo(() => createMeasure(tokens.font), [tokens.font]);
  const scene = useMemo(
    () => buildScene(doc, structure, { measure, compact, collapsed, limit }),
    [doc, structure, measure, compact, collapsed, limit],
  );
  const parentOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, children] of scene.tree.children) for (const child of children) map.set(child.id, id);
    return map;
  }, [scene]);
  const frame = useTween(scene.boxes, animate, (id) => parentOf.get(id));
  const nodeById = useMemo(() => new Map(scene.doc.nodes.map((node) => [node.id, node])), [scene]);

  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const read = () => setArea({ w: Math.max(element.clientWidth, 120), h: Math.max(element.clientHeight, 120) });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = useCallback(
    (animated: boolean) => {
      const { bounds } = scene;
      const k = Math.min((area.w - PAD * 2) / bounds.w, (area.h - PAD * 2) / bounds.h, 1.3);
      const scale = Math.max(k, 0.15);
      setSmooth(animated && !prefersReducedMotion());
      setView({
        k: scale,
        x: (area.w - bounds.w * scale) / 2 - bounds.x * scale,
        y: (area.h - bounds.h * scale) / 2 - bounds.y * scale,
      });
    },
    [scene, area],
  );

  // A new structure starts fitted again, even if the user had moved the old one.
  useEffect(() => {
    moved.current = false;
  }, [structure, compact]);
  const first = useRef(true);
  useEffect(() => {
    if (moved.current) return;
    fit(!first.current && animate);
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.bounds.x, scene.bounds.y, scene.bounds.w, scene.bounds.h, area.w, area.h, structure]);

  const zoom = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      moved.current = true;
      setSmooth(false);
      setView((now) => {
        const k = Math.min(Math.max(now.k * factor, 0.15), 3);
        const cx = at?.x ?? area.w / 2;
        const cy = at?.y ?? area.h / 2;
        return { k, x: cx - ((cx - now.x) / now.k) * k, y: cy - ((cy - now.y) / now.k) * k };
      });
    },
    [area],
  );

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        moved.current = false;
        fit(true);
      },
      zoom: (factor) => zoom(factor),
      snapshot: () => {
        if (!svg.current) return null;
        const copy = svg.current.cloneNode(true) as SVGSVGElement;
        copy.querySelectorAll("[data-ui]").forEach((element) => element.remove());
        const { bounds } = scene;
        const margin = 24;
        copy.setAttribute("viewBox", `${bounds.x - margin} ${bounds.y - margin} ${bounds.w + margin * 2} ${bounds.h + margin * 2}`);
        copy.setAttribute("width", String(Math.round(bounds.w + margin * 2)));
        copy.setAttribute("height", String(Math.round(bounds.h + margin * 2)));
        copy.querySelector("[data-world]")?.removeAttribute("style");
        return copy;
      },
    }),
    [fit, zoom, scene],
  );

  // The wheel zooms only in full screen, or with Ctrl held: in a chat it must keep scrolling the chat.
  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (compact && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoom(Math.exp(-event.deltaY * 0.0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [compact, zoom]);

  const toWorld = (event: { clientX: number; clientY: number }) => {
    const rect = wrap.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left - view.x) / view.k, y: (event.clientY - rect.top - view.y) / view.k };
  };
  const hit = (point: { x: number; y: number }, skip?: ReadonlySet<string>) => {
    for (const box of scene.boxes) {
      if (box.ghost || skip?.has(box.id)) continue;
      if (point.x >= box.x - 4 && point.x <= box.x + box.w + 4 && point.y >= box.y - 4 && point.y <= box.y + box.h + 4) return box.id;
    }
    return null;
  };

  const lastClick = useRef<{ node: string | null; at: number }>({ node: null, at: 0 });
  const press = useRef<{ x: number; y: number; view: typeof view; node: string | null; moved: boolean } | null>(null);
  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("[data-stop]")) return;
    const node = (event.target as Element).closest("[data-node]")?.getAttribute("data-node") ?? null;
    press.current = { x: event.clientX, y: event.clientY, view, node, moved: false };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    const start = press.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    start.moved = true;
    const canMove = editable && scene.layout.reads === "tree" && start.node && start.node !== scene.tree.root.id;
    if (canMove && start.node) {
      const point = toWorld(event);
      setDrag({ id: start.node, ...point, over: hit(point, subtree(scene.doc, start.node)) });
      return;
    }
    moved.current = true;
    setSmooth(false);
    setView({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
  };
  const onPointerUp = () => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    if (drag) {
      if (drag.over && drag.over !== parentOf.get(drag.id)) onOps([{ op: "move_node", id: drag.id, parent: drag.over }]);
      setDrag(null);
      return;
    }
    if (!start.moved) {
      onSelect(start.node);
      if (renaming && renaming !== start.node) onRenaming(null);
      // A second click on the same node soon after the first is a double click: rename it.
      // The browser's own double-click event is not used: with the pointer captured it no longer names the node.
      const now = performance.now();
      if (editable && start.node && lastClick.current.node === start.node && now - lastClick.current.at < 400) onRenaming(start.node);
      lastClick.current = { node: start.node, at: now };
    }
  };

  const addChild = (parent: string) => {
    const id = freshId(doc);
    onOps([{ op: "add_node", id, parent, label: "New idea" }]);
    if (collapsed.has(parent)) onToggle(parent);
    onSelect(id);
    onRenaming(id);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (renaming) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) props.onRedo();
      else props.onUndo();
      return;
    }
    if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      props.onRedo();
      return;
    }
    if (event.key === "Escape") {
      onSelect(null);
      return;
    }
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = arrows[event.key];
    if (direction) {
      event.preventDefault();
      const from = scene.boxes.find((box) => box.id === selected) ?? scene.boxes.find((box) => box.id === scene.tree.root.id);
      if (!from) return;
      if (!selected) {
        onSelect(from.id);
        return;
      }
      let best: { id: string; score: number } | null = null;
      for (const box of scene.boxes) {
        if (box.ghost || box.id === from.id) continue;
        const dx = box.x + box.w / 2 - (from.x + from.w / 2);
        const dy = box.y + box.h / 2 - (from.y + from.h / 2);
        const along = dx * direction[0] + dy * direction[1];
        if (along <= 1) continue;
        const across = Math.abs(dx * direction[1]) + Math.abs(dy * direction[0]);
        const score = along + across * 2.5;
        if (!best || score < best.score) best = { id: box.id, score };
      }
      if (best) onSelect(best.id);
      return;
    }
    if (!selected) return;
    if (event.key === " ") {
      event.preventDefault();
      if (scene.parents.has(selected)) onToggle(selected);
      return;
    }
    if (!editable) return;
    if (event.key === "F2" || (event.key === "Enter" && event.altKey)) {
      event.preventDefault();
      onRenaming(selected);
    } else if (event.key === "Tab") {
      event.preventDefault();
      addChild(selected);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const parent = parentOf.get(selected);
      if (!parent) {
        addChild(selected);
        return;
      }
      const id = freshId(doc);
      onOps([{ op: "add_node", id, parent, after: selected, label: "New idea" }]);
      onSelect(id);
      onRenaming(id);
    } else if ((event.key === "Delete" || event.key === "Backspace") && selected !== scene.tree.root.id) {
      event.preventDefault();
      const next = parentOf.get(selected) ?? null;
      onOps([{ op: "remove_node", id: selected }]);
      onSelect(next);
    }
  };

  const backdrop = tokens.background === "transparent" ? tokens.surface : tokens.background;
  const colorOf = (id: string) => {
    const branch = scene.layout.id === "swimlanes" && scene.bands.length ? laneIndex(scene, id) : (scene.tree.branch.get(id) ?? -1);
    return branch < 0 ? tokens.palette[0]! : tokens.palette[branch % tokens.palette.length]!;
  };
  const styleOf = (id: string): NodeStyle => {
    if (scene.layout.nodes === "shape") return tokens.leaf === "underline" ? "tint" : tokens.leaf;
    const depth = scene.tree.depth.get(id) ?? 0;
    return depth === 0 ? tokens.root : depth === 1 ? tokens.branch : tokens.leaf;
  };
  // A node drawn as words on a line is joined at the end of that line, not at the middle of the words.
  const underlined = (id: string) => {
    const box = frame.boxes.get(id);
    return Boolean(box && !box.ghost && styleOf(id) === "underline");
  };
  const linkBox = (id: string): Box | undefined => {
    const box = frame.boxes.get(id);
    if (!box || !underlined(id)) return box;
    return { ...box, y: box.y + box.h, h: 0 };
  };
  const sideToward = (box: Box, other: Box) => {
    const dx = other.x + other.w / 2 - (box.x + box.w / 2);
    // Straight above or below: join the middle of the line, so the branch does not hook around its end.
    if (Math.abs(dx) < box.w / 2 + 12) return other.y > box.y ? ("bottom" as const) : ("top" as const);
    return dx >= 0 ? ("right" as const) : ("left" as const);
  };

  const worldStyle: CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
    transformOrigin: "0 0",
    transition: smooth ? `transform ${MOVE_MS}ms cubic-bezier(0.2, 0, 0, 1)` : "none",
  };
  const renameBox = renaming ? frame.boxes.get(renaming) : undefined;
  const renameFit = renaming ? scene.fits.get(renaming) : undefined;

  return (
    <div
      ref={wrap}
      className="mm-canvas"
      tabIndex={0}
      role="application"
      aria-label={`${doc.title}. Use the arrow keys to move between nodes.`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ background: tokens.background, cursor: drag ? "grabbing" : "default" }}
    >
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" width={area.w} height={area.h} style={{ display: "block", fontFamily: tokens.font }}>
        {tokens.backdrop !== "none" ? (
          <g data-ui="backdrop">
            <defs>
              <pattern id="mm-backdrop" width="24" height="24" patternUnits="userSpaceOnUse" x={view.x % 24} y={view.y % 24}>
                {tokens.backdrop === "dots" ? (
                  <circle cx="1.5" cy="1.5" r="1.2" fill={tokens.line} opacity="0.55" />
                ) : (
                  <path d="M24 0H0V24" fill="none" stroke={tokens.line} strokeWidth="1" opacity="0.5" />
                )}
              </pattern>
            </defs>
            <rect width={area.w} height={area.h} fill="url(#mm-backdrop)" />
          </g>
        ) : null}
        <g data-world="" style={worldStyle}>
          {scene.bands.map((band, index) => (
            <g key={band.id}>
              <rect x={band.x} y={band.y} width={band.w} height={band.h} fill={tokens.palette[index % tokens.palette.length]} fillOpacity={0.06} stroke={tokens.line} strokeWidth={1} />
              <text x={band.x + 14} y={band.y + band.h / 2} dominantBaseline="central" fontSize={13} fontWeight={600} fill={tokens.text}>
                {band.label}
              </text>
            </g>
          ))}

          {scene.links.map((link) => {
            const from = linkBox(link.from);
            const to = linkBox(link.to);
            if (!from || !to) return null;
            const aimed = {
              ...link,
              ...(link.fromSide === "auto" && !link.dashed && underlined(link.from) ? { fromSide: sideToward(from, to) } : {}),
              ...(link.toSide === "auto" && !link.dashed && underlined(link.to) ? { toSide: sideToward(to, from) } : {}),
            };
            const drawn = drawLink(aimed, from, to, { taper: tokens.taper, sketch: tokens.sketch });
            const color = link.dashed || link.branch < 0 ? (link.heavy ? tokens.text : tokens.muted) : tokens.palette[link.branch % tokens.palette.length]!;
            const alpha = Math.min(frame.alpha.get(link.to) ?? 1, frame.alpha.get(link.from) ?? 1);
            const width = link.heavy ? Math.max(tokens.lineWidth * 1.6, 3) : link.shape === "taper" ? Math.max(tokens.lineWidth, link.depth <= 1 ? 3 : 2) : tokens.lineWidth;
            return (
              <g key={link.id} opacity={alpha}>
                {drawn.filled ? (
                  <path d={drawn.d} fill={color} />
                ) : (
                  <path d={drawn.d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={link.dashed ? "5 5" : undefined} />
                )}
                {link.arrow ? <path d={arrowHead(drawn.tip, link.heavy ? 11 : 8)} fill={color} /> : null}
                {link.label ? (
                  <g>
                    <rect
                      x={drawn.mid.x - measure(link.label, 11, 500) / 2 - 5}
                      y={drawn.mid.y - 9}
                      width={measure(link.label, 11, 500) + 10}
                      height={18}
                      rx={9}
                      fill={backdrop}
                      stroke={tokens.line}
                      strokeWidth={1}
                    />
                    <text x={drawn.mid.x} y={drawn.mid.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={500} fill={tokens.text}>
                      {link.label}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {scene.doc.nodes.map((node) => {
            const box = frame.boxes.get(node.id);
            const fit = scene.fits.get(node.id);
            if (!box || !fit) return null;
            const depth = scene.tree.depth.get(node.id) ?? 0;
            const style = styleOf(node.id);
            const isRoot = scene.layout.nodes === "branch" && depth === 0;
            const color = isRoot ? tokens.rootFill : colorOf(node.id);
            const shape = scene.layout.nodes === "shape" ? (node.kind === "decision" ? "diamond" : node.kind === "start" || node.kind === "end" ? "pill" : "rect") : "rect";
            const outline = boxPath(box, tokens.radius, shape, tokens.sketch ? node.id : undefined);
            const textColor = style === "solid" ? (isRoot ? tokens.onRoot : tokens.onSolid) : tokens.text;
            const hiddenCount = scene.hidden.get(node.id);
            const isSelected = selected === node.id;
            const isTarget = drag?.over === node.id;
            const top = box.y + (box.h - fit.lines.length * fit.lineHeight) / 2;
            return (
              <g
                key={node.id}
                id={`mm-node-${node.id}`}
                data-node={node.id}
                role="treeitem"
                aria-level={depth + 1}
                aria-selected={isSelected}
                aria-expanded={scene.parents.has(node.id) ? !hiddenCount : undefined}
                aria-label={[node.label, statusLabel(node.status), node.note].filter(Boolean).join(". ")}
                opacity={(frame.alpha.get(node.id) ?? 1) * (drag?.id === node.id ? 0.45 : 1)}
                style={{ cursor: "pointer" }}
              >
                {/* A wide invisible target so thin nodes are easy to click and tap. */}
                <rect x={box.x - 4} y={box.y - 4} width={box.w + 8} height={box.h + 8} fill="transparent" />
                {style === "solid" ? <path d={outline} fill={color} /> : null}
                {style === "tint" ? <path d={outline} fill={color} fillOpacity={0.16} stroke={color} strokeOpacity={0.6} strokeWidth={1.2} /> : null}
                {style === "outline" ? <path d={outline} fill={tokens.surface} stroke={color} strokeWidth={tokens.lineWidth} /> : null}
                {style === "underline" ? (
                  <path d={`M${box.x} ${box.y + box.h}H${box.x + box.w}`} stroke={color} strokeWidth={Math.max(tokens.lineWidth, 2)} strokeLinecap="round" />
                ) : null}
                {isSelected || isTarget ? (
                  <path
                    d={boxPath({ ...box, x: box.x - 4, y: box.y - 4, w: box.w + 8, h: box.h + 8 }, tokens.radius + 4, shape === "diamond" ? "diamond" : shape)}
                    fill="none"
                    stroke={tokens.accent}
                    strokeWidth={2.5}
                    strokeDasharray={isTarget ? "6 4" : undefined}
                    data-ui="ring"
                  />
                ) : null}
                <text textAnchor="middle" fontSize={fit.fontSize} fontWeight={fit.weight} fill={textColor} style={{ userSelect: "none" }}>
                  {fit.lines.map((line, index) => (
                    <tspan key={index} x={box.x + box.w / 2} y={top + fit.lineHeight * index + fit.lineHeight / 2 + fit.fontSize * 0.35}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {node.status ? (
                  <circle cx={box.x + 2} cy={box.y + 2} r={5} fill={STATUS[node.status].color} stroke={backdrop} strokeWidth={1.5}>
                    <title>{STATUS[node.status].label}</title>
                  </circle>
                ) : null}
                {node.note ? (
                  <circle cx={box.x + box.w - 2} cy={box.y + 2} r={3} fill={tokens.muted}>
                    <title>{node.note}</title>
                  </circle>
                ) : null}
                {hiddenCount ? (
                  <g
                    data-stop=""
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggle(node.id);
                    }}
                  >
                    <rect x={box.x + box.w - 8} y={box.y + box.h - 9} width={26} height={18} rx={9} fill={tokens.surface} stroke={color} strokeWidth={1.5} />
                    <text x={box.x + box.w + 5} y={box.y + box.h} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={700} fill={tokens.text}>
                      +{hiddenCount}
                    </text>
                    <title>Show {hiddenCount} more</title>
                  </g>
                ) : null}
              </g>
            );
          })}

          {drag ? <circle cx={drag.x} cy={drag.y} r={7} fill={tokens.accent} opacity={0.8} data-ui="drag" /> : null}
        </g>
      </svg>

      {renameBox && renameFit && renaming ? (
        <input
          key={renaming}
          data-stop=""
          className="mm-rename"
          autoFocus
          defaultValue={nodeById.get(renaming)?.label ?? ""}
          maxLength={80}
          aria-label="Node label"
          onFocus={(event) => event.currentTarget.select()}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              event.currentTarget.value = nodeById.get(renaming)?.label ?? "";
              event.currentTarget.blur();
            }
          }}
          onBlur={(event) => {
            const label = event.currentTarget.value.trim();
            if (label && label !== nodeById.get(renaming)?.label) onOps([{ op: "update_node", id: renaming, label }]);
            onRenaming(null);
            wrap.current?.focus();
          }}
          style={{
            left: view.x + (renameBox.x + renameBox.w / 2) * view.k,
            top: view.y + (renameBox.y + renameBox.h / 2) * view.k,
            width: Math.max(renameBox.w * view.k + 40, 140),
            fontSize: Math.max(renameFit.fontSize * view.k, 12),
            fontWeight: renameFit.weight,
            fontFamily: tokens.font,
            color: tokens.text,
            background: backdrop,
            borderColor: tokens.accent,
          }}
        />
      ) : null}
    </div>
  );
});

function laneIndex(scene: ReturnType<typeof buildScene>, id: string): number {
  const box = scene.boxes.find((item) => item.id === id);
  if (!box) return -1;
  const middle = box.y + box.h / 2;
  return scene.bands.findIndex((band) => middle >= band.y && middle <= band.y + band.h);
}

function freshId(doc: Doc): string {
  const taken = new Set(doc.nodes.map((node) => node.id));
  for (let n = doc.nodes.length + 1; ; n += 1) {
    if (!taken.has(`n${n}`)) return `n${n}`;
  }
}
