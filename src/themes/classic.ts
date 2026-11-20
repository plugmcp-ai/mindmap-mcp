import { SYSTEM_FONT, type ThemeDef } from "./types.js";

/** The mind map from the books: one strong color per branch, thick organic curves, words on the lines. */
export const classic: ThemeDef = {
  id: "classic",
  label: "Classic",
  description: "Bold colors and thick curved branches, like a mind map drawn by hand with markers.",
  tokens: (mode) => ({
    background: mode === "dark" ? "#17171A" : "#FFFDF8",
    surface: mode === "dark" ? "#232327" : "#FFFFFF",
    text: mode === "dark" ? "#F4F1EA" : "#1B1B1F",
    muted: mode === "dark" ? "#9A968F" : "#6F6A63",
    line: mode === "dark" ? "#3B3B41" : "#DDD8CE",
    accent: "#0099FF",
    onSolid: "#FFFFFF",
    rootFill: mode === "dark" ? "#F4F1EA" : "#1B1B1F",
    onRoot: mode === "dark" ? "#1B1B1F" : "#FFFFFF",
    // Dark enough that white text on a filled branch stays readable.
    palette: ["#D1431B", "#0E8177", "#3D6FD9", "#C0389B", "#A86A12", "#6B4FBB"],
    font: SYSTEM_FONT,
    radius: 999,
    root: "solid",
    branch: "solid",
    leaf: "underline",
    taper: true,
    lineWidth: 3,
    sketch: false,
    backdrop: "none",
  }),
};
