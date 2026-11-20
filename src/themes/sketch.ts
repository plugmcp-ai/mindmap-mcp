import type { ThemeDef } from "./types.js";

/** Wobbly lines and a handwriting font, for ideas that are not finished yet. */
export const sketch: ThemeDef = {
  id: "sketch",
  label: "Sketch",
  description: "Wobbly lines and handwriting. Says the idea is a draft and open to change.",
  tokens: (mode) => ({
    background: mode === "dark" ? "#1C1B19" : "#FBF8F1",
    surface: mode === "dark" ? "#26241F" : "#FFFEFA",
    text: mode === "dark" ? "#F1ECE0" : "#2B2A28",
    muted: mode === "dark" ? "#A39C8D" : "#77726A",
    line: mode === "dark" ? "#5A554B" : "#8A857C",
    accent: "#0099FF",
    onSolid: "#FFFFFF",
    rootFill: mode === "dark" ? "#F1ECE0" : "#2B2A28",
    onRoot: mode === "dark" ? "#1C1B19" : "#FBF8F1",
    palette: ["#2F6DB5", "#C8553D", "#3F8F6B", "#A8518A", "#C98A1B", "#5B6C8F"],
    // No font is shipped: this asks for a handwriting face the device already has.
    font: '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Marker Felt", "Chalkboard SE", cursive',
    radius: 8,
    root: "outline",
    branch: "outline",
    leaf: "underline",
    taper: false,
    lineWidth: 2,
    sketch: true,
    backdrop: "dots",
  }),
};
