import type { ThemeDef } from "./types.js";

/** A technical drawing: pale lines on deep blue, over a grid. Always dark. */
export const blueprint: ThemeDef = {
  id: "blueprint",
  label: "Blueprint",
  description: "Pale lines on deep blue over a grid, like a technical drawing. Good for systems and flows.",
  tokens: () => ({
    background: "#0B2545",
    surface: "#103260",
    text: "#EAF2FF",
    muted: "#9DB7DA",
    line: "#3D6497",
    accent: "#FFD166",
    onSolid: "#0B2545",
    rootFill: "#EAF2FF",
    onRoot: "#0B2545",
    palette: ["#8EC5FF", "#7EE0C8", "#FFD166", "#F4A3C0", "#C3B5FF", "#FFB08A"],
    font: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
    radius: 2,
    root: "solid",
    branch: "outline",
    leaf: "outline",
    taper: false,
    lineWidth: 1.5,
    sketch: false,
    backdrop: "grid",
  }),
};
