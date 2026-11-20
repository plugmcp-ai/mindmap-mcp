import { SYSTEM_FONT, type ThemeDef } from "./types.js";

/** Strongest contrast: every node is a box with a heavy border, and no meaning rests on color. */
export const contrast: ThemeDef = {
  id: "contrast",
  label: "High contrast",
  description: "Black and white with heavy borders. Easiest to read, and prints well.",
  tokens: (mode) => {
    const ink = mode === "dark" ? "#FFFFFF" : "#000000";
    const paper = mode === "dark" ? "#000000" : "#FFFFFF";
    return {
      background: paper,
      surface: paper,
      text: ink,
      muted: ink,
      line: ink,
      accent: mode === "dark" ? "#FFD60A" : "#0047FF",
      onSolid: paper,
      rootFill: ink,
      onRoot: paper,
      palette: [ink],
      font: SYSTEM_FONT,
      radius: 4,
      root: "solid",
      branch: "outline",
      leaf: "outline",
      taper: false,
      lineWidth: 2.5,
      sketch: false,
      backdrop: "none",
    };
  },
};
