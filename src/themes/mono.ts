import { SYSTEM_FONT, type ThemeDef } from "./types.js";

/** One ink color and thin lines. The structure does the talking. */
export const mono: ThemeDef = {
  id: "mono",
  label: "Minimal",
  description: "One ink color and thin lines. Quiet enough for a document or a slide.",
  tokens: (mode) => {
    const ink = mode === "dark" ? "#ECE9E3" : "#1A1A1A";
    return {
      background: mode === "dark" ? "#141414" : "#FFFFFF",
      surface: mode === "dark" ? "#1D1D1D" : "#FFFFFF",
      text: ink,
      muted: mode === "dark" ? "#8D8984" : "#6B6762",
      line: mode === "dark" ? "#444444" : "#BDBAB4",
      accent: "#0099FF",
      onSolid: mode === "dark" ? "#141414" : "#FFFFFF",
      rootFill: ink,
      onRoot: mode === "dark" ? "#141414" : "#FFFFFF",
      palette: [ink],
      font: SYSTEM_FONT,
      radius: 6,
      root: "solid",
      branch: "outline",
      leaf: "underline",
      taper: false,
      lineWidth: 1.5,
      sketch: false,
      backdrop: "none",
    };
  },
};
