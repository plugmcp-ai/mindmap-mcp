import type { Box, Link, Side } from "../layouts/types.js";

interface Point {
  x: number;
  y: number;
}

export interface Drawn {
  /** SVG path data. */
  d: string;
  /** True when the path is a closed shape to fill, not a line to stroke. */
  filled: boolean;
  /** Where a label goes. */
  mid: Point;
  /** Tip and direction of the arrowhead, when the link has one. */
  tip: Point & { angle: number };
}

const n = (value: number) => Math.round(value * 10) / 10;

/** The side of `box` that faces `other`. */
function facing(box: Box, other: Box): Exclude<Side, "auto" | "center"> {
  const dx = other.x + other.w / 2 - (box.x + box.w / 2);
  const dy = other.y + other.h / 2 - (box.y + box.h / 2);
  // Boxes are wider than tall, so sideways wins unless the other box is clearly above or below.
  if (Math.abs(dx) * 0.6 >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function anchor(box: Box, side: Exclude<Side, "auto">): Point {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  switch (side) {
    case "left":
      return { x: box.x, y: cy };
    case "right":
      return { x: box.x + box.w, y: cy };
    case "top":
      return { x: cx, y: box.y };
    case "bottom":
      return { x: cx, y: box.y + box.h };
    default:
      return { x: cx, y: cy };
  }
}

const sideways = (side: Side) => side === "left" || side === "right";

/** A small repeatable wobble, so a sketched line looks the same every frame. */
function wobble(seed: string, amount: number): (index: number) => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return (index) => {
    const value = Math.sin((hash % 1000) + index * 12.9898) * 43758.5453;
    return (value - Math.floor(value) - 0.5) * 2 * amount;
  };
}

/** Width of a tapered branch at its two ends, by how deep the child is. */
export function taperWidths(depth: number): [number, number] {
  if (depth <= 1) return [11, 5];
  if (depth === 2) return [5, 2.4];
  return [2.6, 1.6];
}

/** Work out the path of a link from where its two boxes are right now. */
export function drawLink(link: Link, from: Box, to: Box, options: { taper: boolean; sketch: boolean }): Drawn {
  let fromSide = link.fromSide === "auto" ? facing(from, to) : link.fromSide;
  let toSide = link.toSide === "auto" ? facing(to, from) : link.toSide;
  // A cross link between two nodes in one column would run through the nodes between them:
  // send it out to the right and back in.
  const column = Math.abs(from.x + from.w / 2 - (to.x + to.w / 2)) < Math.max(from.w, to.w) * 0.6;
  if (link.dashed && link.fromSide === "auto" && link.toSide === "auto" && column) {
    fromSide = "right";
    toSide = "right";
  }
  let a = anchor(from, fromSide);
  const b = anchor(to, toSide);
  const jitter = options.sketch ? wobble(link.id, 2.2) : () => 0;

  if (link.shape === "line") {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    return {
      d: `M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`,
      filled: false,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      tip: { ...b, angle },
    };
  }

  if (link.shape === "elbow") {
    // A list item hangs from near the left end of its parent, like a file tree.
    if (!sideways(fromSide) && toSide === "left") {
      a = { x: Math.min(from.x + 14, b.x - 6), y: a.y };
      return {
        d: `M${n(a.x)} ${n(a.y)}V${n(b.y)}H${n(b.x)}`,
        filled: false,
        mid: { x: a.x, y: (a.y + b.y) / 2 },
        tip: { ...b, angle: 0 },
      };
    }
    if (sideways(fromSide)) {
      const mid = (a.x + b.x) / 2;
      return {
        d: `M${n(a.x)} ${n(a.y)}H${n(mid)}V${n(b.y)}H${n(b.x)}`,
        filled: false,
        mid: { x: mid, y: (a.y + b.y) / 2 },
        tip: { ...b, angle: b.x >= a.x ? 0 : Math.PI },
      };
    }
    const mid = (a.y + b.y) / 2;
    return {
      d: `M${n(a.x)} ${n(a.y)}V${n(mid)}H${n(b.x)}V${n(b.y)}`,
      filled: false,
      mid: { x: (a.x + b.x) / 2, y: mid },
      tip: { ...b, angle: b.y >= a.y ? Math.PI / 2 : -Math.PI / 2 },
    };
  }

  // A curve leaves and arrives square to the sides it joins.
  // The handles reach half way along the axis they leave on, so a far child does not make a wide loop.
  const far = Math.hypot(b.x - a.x, b.y - a.y);
  const across = fromSide === toSide ? Math.max(far * 0.5, 40) : Math.max(Math.abs(b.x - a.x) * 0.5, 18);
  const down = fromSide === toSide ? Math.max(far * 0.5, 40) : Math.max(Math.abs(b.y - a.y) * 0.5, 18);
  const push = (point: Point, side: Side, sign: 1 | -1): Point => {
    switch (side) {
      case "left":
        return { x: point.x - across * sign, y: point.y };
      case "right":
        return { x: point.x + across * sign, y: point.y };
      case "top":
        return { x: point.x, y: point.y - down * sign };
      case "bottom":
        return { x: point.x, y: point.y + down * sign };
      default:
        return point;
    }
  };
  const c1 = push(a, fromSide, 1);
  const c2 = push(b, toSide, 1);
  c1.x += jitter(1);
  c1.y += jitter(2);
  c2.x += jitter(3);
  c2.y += jitter(4);
  const mid = {
    x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
    y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
  };
  const tip = { ...b, angle: Math.atan2(b.y - c2.y, b.x - c2.x) };

  if (link.shape === "taper" && options.taper) {
    const [w0, w1] = taperWidths(link.depth);
    // Walk along the middle line and step out to both sides, wide at the parent and narrow at the child.
    const STEPS = 14;
    const left: string[] = [];
    const right: string[] = [];
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const u = 1 - t;
      const x = u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x;
      const y = u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y;
      let dx = 3 * u * u * (c1.x - a.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x);
      let dy = 3 * u * u * (c1.y - a.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y);
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const half = (w0 + (w1 - w0) * t) / 2;
      left.push(`${n(x - dy * half)} ${n(y + dx * half)}`);
      right.unshift(`${n(x + dy * half)} ${n(y - dx * half)}`);
    }
    return { d: `M${left.join("L")}L${right.join("L")}Z`, filled: true, mid, tip };
  }

  return {
    d: `M${n(a.x)} ${n(a.y)}C${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(b.x)} ${n(b.y)}`,
    filled: false,
    mid,
    tip,
  };
}

/** A small triangle at the end of a line. */
export function arrowHead(tip: Point & { angle: number }, size = 8): string {
  const back = (offset: number) => ({
    x: tip.x - Math.cos(tip.angle) * size + Math.cos(tip.angle + Math.PI / 2) * offset,
    y: tip.y - Math.sin(tip.angle) * size + Math.sin(tip.angle + Math.PI / 2) * offset,
  });
  const left = back(size * 0.45);
  const right = back(-size * 0.45);
  return `M${n(tip.x)} ${n(tip.y)}L${n(left.x)} ${n(left.y)}L${n(right.x)} ${n(right.y)}Z`;
}

/** The outline of a node's box, wobbly when sketched. */
export function boxPath(box: Box, radius: number, shape: "rect" | "diamond" | "pill", sketchSeed?: string): string {
  const { x, y, w, h } = box;
  const j = sketchSeed ? wobble(sketchSeed, 1.4) : () => 0;
  if (shape === "diamond") {
    return `M${n(x + w / 2 + j(1))} ${n(y + j(2))}L${n(x + w + j(3))} ${n(y + h / 2 + j(4))}L${n(x + w / 2 + j(5))} ${n(y + h + j(6))}L${n(x + j(7))} ${n(y + h / 2 + j(8))}Z`;
  }
  const r = Math.min(shape === "pill" ? h / 2 : radius, h / 2, w / 2);
  return (
    `M${n(x + r + j(1))} ${n(y + j(2))}` +
    `H${n(x + w - r + j(3))}Q${n(x + w)} ${n(y)} ${n(x + w + j(4))} ${n(y + r)}` +
    `V${n(y + h - r + j(5))}Q${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h + j(6))}` +
    `H${n(x + r + j(7))}Q${n(x)} ${n(y + h)} ${n(x + j(8))} ${n(y + h - r)}` +
    `V${n(y + r + j(9))}Q${n(x)} ${n(y)} ${n(x + r + j(1))} ${n(y + j(2))}Z`
  );
}
