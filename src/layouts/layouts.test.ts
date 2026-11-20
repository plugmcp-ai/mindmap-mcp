import { describe, expect, it } from "vitest";
import { FIXTURES } from "../fixtures.js";
import type { MapNode } from "../model/schema.js";
import { treeOf } from "../model/tree.js";
import { LAYOUTS } from "./index.js";
import { fitLabel, roughMeasure } from "./lib/measure.js";
import type { Box } from "./types.js";

const overlap = (a: Box, b: Box) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

// Every layout must draw every sample diagram: a user can switch to any structure at any time.
describe.each(LAYOUTS.map((layout) => [layout.id, layout] as const))("%s layout", (_id, layout) => {
  for (const doc of FIXTURES) {
    const tree = treeOf(doc);
    const size = (node: MapNode) => {
      const fit = fitLabel(node.label, tree.depth.get(node.id) ?? 0, roughMeasure, layout.nodes === "shape" ? (node.kind ?? "step") : "branch");
      return { w: fit.w, h: fit.h };
    };

    it(`places every node of "${doc.title}" without overlap`, () => {
      const result = layout.layout({ doc, size, compact: false });
      const real = result.boxes.filter((box) => !box.ghost);
      expect(real.map((box) => box.id).sort()).toEqual(doc.nodes.map((node) => node.id).sort());
      for (const box of result.boxes) {
        expect(Number.isFinite(box.x) && Number.isFinite(box.y), `${box.id} has a position`).toBe(true);
      }
      const hits: string[] = [];
      for (let i = 0; i < real.length; i += 1) {
        for (let j = i + 1; j < real.length; j += 1) {
          if (overlap(real[i]!, real[j]!)) hits.push(`${real[i]!.id} and ${real[j]!.id}`);
        }
      }
      expect(hits).toEqual([]);
    });

    it(`joins only boxes that exist in "${doc.title}", with unique ids`, () => {
      const result = layout.layout({ doc, size, compact: true });
      const ids = new Set(result.boxes.map((box) => box.id));
      for (const link of result.links) {
        expect(ids.has(link.from), `${link.id} starts at a box`).toBe(true);
        expect(ids.has(link.to), `${link.id} ends at a box`).toBe(true);
      }
      expect(new Set(result.links.map((link) => link.id)).size).toBe(result.links.length);
      expect(new Set(result.boxes.map((box) => box.id)).size).toBe(result.boxes.length);
    });

    it(`gives the same result twice for "${doc.title}"`, () => {
      const first = layout.layout({ doc, size, compact: false });
      const second = layout.layout({ doc, size, compact: false });
      expect(second).toEqual(first);
    });
  }
});
