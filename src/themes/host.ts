import { OKABE_ITO, SYSTEM_FONT, type ThemeDef } from "./types.js";

/**
 * Follows the chat client. Colors and fonts come from the variables the host
 * gives every MCP App, with fallbacks for hosts that give none.
 */
export const host: ThemeDef = {
  id: "host",
  label: "Match the chat",
  description: "Takes its colors and font from the chat client, in light and dark.",
  tokens: (mode) => ({
    background: "transparent",
    surface: `var(--color-background-secondary, ${mode === "dark" ? "#1F1F1F" : "#F5F4F1"})`,
    text: `var(--color-text-primary, ${mode === "dark" ? "#F2EFE9" : "#141414"})`,
    muted: `var(--color-text-secondary, ${mode === "dark" ? "#8D8984" : "#6B6762"})`,
    line: `var(--color-border-primary, ${mode === "dark" ? "#3A3A3A" : "#D6D3CD"})`,
    accent: "#0099FF",
    onSolid: "#FFFFFF",
    rootFill: "#0A6FC2",
    onRoot: "#FFFFFF",
    palette: mode === "dark" ? ["#56B4E9", "#F0965A", "#3CC9A0", "#E3A0C6", "#F2B33D", "#8CCBF2"] : OKABE_ITO,
    font: `var(--font-sans, ${SYSTEM_FONT})`,
    radius: 10,
    root: "solid",
    branch: "tint",
    leaf: "underline",
    taper: true,
    lineWidth: 2,
    sketch: false,
    backdrop: "none",
  }),
};
