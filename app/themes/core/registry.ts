import type { ThemeDefinition } from "./types";
import * as presets from "../themes";

const all: ThemeDefinition[] = Object.values(presets);

/** Runtime map of theme id -> ThemeDefinition, built from the palette exports. */
export const themes: Record<string, ThemeDefinition> = Object.fromEntries(
  all.map((theme) => [theme.id, theme])
);

/** Ordered list of all registered themes, for selection UIs. */
export const themeList: ThemeDefinition[] = all;

/**
 * Resolves a theme id to its definition.
 *
 * @param id the theme id to look up (may be empty/null/unknown).
 * @returns the matching theme, or undefined when none/invalid.
 */
export function getTheme(
  id: string | null | undefined
): ThemeDefinition | undefined {
  return id ? themes[id] : undefined;
}
