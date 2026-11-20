import type { Theme as ThemeId } from "../model/schema.js";
import { blueprint } from "./blueprint.js";
import { classic } from "./classic.js";
import { contrast } from "./contrast.js";
import { host } from "./host.js";
import { mono } from "./mono.js";
import { sketch } from "./sketch.js";
import type { ThemeDef } from "./types.js";

/**
 * Every theme, in the order the toolbar shows them.
 * To add one: write src/themes/<name>.ts, add its id to THEMES in
 * src/model/schema.ts, and add it to this list.
 */
export const THEMES: ThemeDef[] = [host, classic, mono, blueprint, sketch, contrast];

const byId = new Map<string, ThemeDef>(THEMES.map((theme) => [theme.id, theme]));

export function themeFor(id: ThemeId | undefined): ThemeDef {
  return byId.get(id ?? "host") ?? host;
}

export type { NodeStyle, ThemeDef, Tokens } from "./types.js";
