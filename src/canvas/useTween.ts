import { useEffect, useRef, useState } from "react";
import type { Box } from "../layouts/types.js";

export const MOVE_MS = 280;

/** Starts fast and settles gently. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export interface Frame {
  boxes: Map<string, Box>;
  /** 0 to 1 for a node that is appearing. Nodes not listed are fully shown. */
  alpha: Map<string, number>;
}

/**
 * Moves boxes from where they are to where a new layout wants them. A box that
 * is new grows out of the box named by `origin`, usually its parent, so the
 * eye can follow where it came from. With `enabled` off the boxes jump.
 */
export function useTween(target: Box[], enabled: boolean, origin: (id: string) => string | undefined): Frame {
  const current = useRef(new Map<string, Box>());
  const [frame, setFrame] = useState<Frame>(() => ({ boxes: new Map(target.map((box) => [box.id, box])), alpha: new Map() }));
  const originRef = useRef(origin);
  originRef.current = origin;

  useEffect(() => {
    const goal = new Map(target.map((box) => [box.id, box]));
    const animate = enabled && !prefersReducedMotion() && current.current.size > 0 && target.length <= 160;
    if (!animate) {
      current.current = goal;
      setFrame({ boxes: goal, alpha: new Map() });
      return;
    }
    const start = new Map<string, Box>();
    const fresh = new Set<string>();
    for (const box of target) {
      const was = current.current.get(box.id);
      if (was) {
        start.set(box.id, was);
        continue;
      }
      fresh.add(box.id);
      const from = originRef.current(box.id);
      const parent = from ? current.current.get(from) : undefined;
      // A new box starts at the middle of its parent, at its own size.
      start.set(box.id, parent ? { ...box, x: parent.x + parent.w / 2 - box.w / 2, y: parent.y + parent.h / 2 - box.h / 2 } : box);
    }
    let raf = 0;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - began) / MOVE_MS, 1);
      const k = ease(t);
      const boxes = new Map<string, Box>();
      for (const [id, to] of goal) {
        const from = start.get(id)!;
        boxes.set(id, {
          ...to,
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          w: from.w + (to.w - from.w) * k,
          h: from.h + (to.h - from.h) * k,
        });
      }
      current.current = boxes;
      const alpha = new Map<string, number>();
      if (t < 1) for (const id of fresh) alpha.set(id, k);
      setFrame({ boxes, alpha });
      if (t < 1) raf = requestAnimationFrame(step);
      else clearTimeout(finish);
    };
    raf = requestAnimationFrame(step);
    // A browser stops animation frames for a view that is scrolled out of sight.
    // The diagram must still arrive: after the time the move should take, put everything in place.
    const finish = setTimeout(() => {
      cancelAnimationFrame(raf);
      current.current = goal;
      setFrame({ boxes: goal, alpha: new Map() });
    }, MOVE_MS + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finish);
    };
  }, [target, enabled]);

  return frame;
}
