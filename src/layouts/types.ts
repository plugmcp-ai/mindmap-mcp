import type { Doc, MapNode, Structure } from "../model/schema.js";

/**
 * The layout contract. A layout is a pure function: it gets a document and the
 * size of every node, and returns where the nodes go and which lines join them.
 * It draws nothing. The canvas draws the result and moves smoothly between two
 * results, so a layout never has to think about animation.
 *
 * To add a layout, copy one file in this folder, change it, and add it to
 * index.ts. See CONTRIBUTING.md.
 */

export interface Size {
  w: number;
  h: number;
}

/** A placed node. x and y are the top-left corner. */
export interface Box extends Size {
  id: string;
  x: number;
  y: number;
  /**
   * A point with no node, for lines to attach to, such as a place on a timeline
   * axis. Give it an id that starts with "~" and a size of 0.
   */
  ghost?: boolean;
}

export type Side = "left" | "right" | "top" | "bottom" | "center" | "auto";

export type EdgeShape =
  /** A curved branch that is thick at the parent and thin at the child. */
  | "taper"
  /** A smooth curve of even width. */
  | "curve"
  /** Straight runs with a right-angle turn. */
  | "elbow"
  /** A straight line. */
  | "line";

/** A line between two boxes. The canvas works out the path from where the boxes are. */
export interface Link {
  id: string;
  from: string;
  to: string;
  shape: EdgeShape;
  fromSide: Side;
  toSide: Side;
  label?: string;
  arrow?: boolean;
  dashed?: boolean;
  /** Heavier line, for a spine or an axis. */
  heavy?: boolean;
  /** Top-level branch the line belongs to, for its color. -1 for none. */
  branch: number;
  /** Depth of the node the line leads to. */
  depth: number;
}

/** A labelled background area, such as a swimlane. */
export interface Band {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface LayoutResult {
  boxes: Box[];
  links: Link[];
  bands?: Band[];
}

export interface LayoutInput {
  /** The document, with the children of collapsed nodes already taken out. */
  doc: Doc;
  /** The size of a node's box. */
  size: (node: MapNode) => Size;
  /** True in the small inline card: prefer a layout that is wider than tall. */
  compact: boolean;
}

export interface Layout {
  id: Structure;
  label: string;
  /** One line shown in the gallery and used to pick a structure. */
  description: string;
  /** "tree" layouts follow parent links. "graph" layouts follow edges. */
  reads: "tree" | "graph";
  /** How nodes are drawn: mind map branches, or flowchart shapes. */
  nodes: "branch" | "shape";
  layout: (input: LayoutInput) => LayoutResult;
}
