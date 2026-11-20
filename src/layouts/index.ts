import type { Structure } from "../model/schema.js";
import { fishbone } from "./fishbone.js";
import { flowchart } from "./flowchart.js";
import { logic } from "./logic.js";
import { mindmap } from "./mindmap.js";
import { org } from "./org.js";
import { outline } from "./outline.js";
import { swimlanes } from "./swimlanes.js";
import { timeline } from "./timeline.js";
import { twoSided } from "./two_sided.js";
import type { Layout } from "./types.js";

/**
 * Every layout, in the order the toolbar shows them.
 * To add one: write src/layouts/<name>.ts, add its id to STRUCTURES in
 * src/model/schema.ts, and add it to this list.
 */
export const LAYOUTS: Layout[] = [mindmap, twoSided, logic, org, outline, timeline, fishbone, flowchart, swimlanes];

const byId = new Map<string, Layout>(LAYOUTS.map((layout) => [layout.id, layout]));

export function layoutFor(structure: Structure): Layout {
  return byId.get(structure) ?? mindmap;
}

export type { Band, Box, EdgeShape, Layout, LayoutInput, LayoutResult, Link, Side, Size } from "./types.js";
