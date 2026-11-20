import type { Theme as ThemeId } from "../model/schema.js";

/**
 * A theme is a set of tokens. It holds no drawing code: the canvas reads these
 * values and draws every structure with them.
 *
 * To add a theme, copy one file in this folder, change the values, and add it
 * to index.ts. See CONTRIBUTING.md.
 */

/** How a node's box is drawn. */
export type NodeStyle =
  /** Filled with the branch color, light text. */
  | "solid"
  /** Filled with a faint wash of the branch color. */
  | "tint"
  /** A border in the branch color, no fill. */
  | "outline"
  /** Text only, sitting on a line in the branch color. */
  | "underline";

export interface Tokens {
  /** Canvas background. "transparent" lets the chat show through. */
  background: string;
  /** Fill of boxes that are not colored by their branch. */
  surface: string;
  text: string;
  muted: string;
  /** Lines that carry no branch color: cross links, lanes, the toolbar border. */
  line: string;
  /** Selection, focus and buttons. */
  accent: string;
  /** Text on a solid fill. */
  onSolid: string;
  /** Fill of the root when it is solid, and the text on it. */
  rootFill: string;
  onRoot: string;
  /** One color per top-level branch, repeated when there are more branches. */
  palette: string[];
  font: string;
  /** Corner radius of boxes, in pixels. */
  radius: number;
  root: NodeStyle;
  branch: NodeStyle;
  leaf: NodeStyle;
  /** True draws mind map branches thick at the parent and thin at the child. */
  taper: boolean;
  /** Line width of branches that do not taper. */
  lineWidth: number;
  /** True makes lines wobble as if drawn by hand. */
  sketch: boolean;
  /** Dots or a grid behind the diagram. */
  backdrop: "none" | "dots" | "grid";
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  /** The tokens for a light or a dark chat. A theme with one look returns the same for both. */
  tokens: (mode: "light" | "dark") => Tokens;
}

/**
 * Branch colors that people with color blindness can tell apart (Okabe and Ito),
 * in an order that keeps neighbours distinct. The yellow of the set is left out:
 * it is too faint for a thin line on white.
 */
export const OKABE_ITO = ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#E69F00", "#56B4E9"];

export const SYSTEM_FONT = 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
