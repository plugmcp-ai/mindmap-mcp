import type { MapNode } from "../../model/schema.js";
import type { Size } from "../types.js";

/** Width of a piece of text in pixels, for a font size and weight. */
export type MeasureText = (text: string, size: number, weight: number) => number;

export interface Fit extends Size {
  lines: string[];
  fontSize: number;
  weight: number;
  lineHeight: number;
  padX: number;
  padY: number;
}

interface Level {
  fontSize: number;
  weight: number;
  maxWidth: number;
  padX: number;
  padY: number;
}

const LEVELS: Level[] = [
  { fontSize: 17, weight: 700, maxWidth: 220, padX: 20, padY: 12 },
  { fontSize: 14, weight: 600, maxWidth: 190, padX: 14, padY: 8 },
  { fontSize: 13, weight: 500, maxWidth: 190, padX: 10, padY: 6 },
];

/** A rough width for tests and for the first frame, before a real font is measured. */
export const roughMeasure: MeasureText = (text, size, weight) => text.length * size * (weight >= 600 ? 0.58 : 0.54);

/** Break a label into lines that fit, and size the box around them. */
export function fitLabel(label: string, depth: number, measure: MeasureText, shape: MapNode["kind"] | "branch" = "branch"): Fit {
  const level = LEVELS[Math.min(depth, LEVELS.length - 1)]!;
  const { fontSize, weight, maxWidth, padX, padY } = level;
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, fontSize, weight) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  if (lines.length > 4) shown[3] = `${shown[3]}...`;
  const lineHeight = Math.round(fontSize * 1.3);
  const textWidth = Math.max(...shown.map((item) => measure(item, fontSize, weight)), 12);
  let w = Math.ceil(textWidth + padX * 2);
  let h = Math.ceil(shown.length * lineHeight + padY * 2);
  if (shape === "decision") {
    // A diamond needs room for its corners.
    w = Math.ceil(w * 1.3 + 24);
    h = Math.ceil(h * 1.5 + 12);
  } else if (shape === "start" || shape === "end") {
    w += 12;
  }
  return { w, h, lines: shown, fontSize, weight, lineHeight, padX, padY };
}
