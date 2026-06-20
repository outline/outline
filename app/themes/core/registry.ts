import type { ThemeDefinition } from "./types";
import * as presets from "../themes";

const themes: Record<string, ThemeDefinition> = {};
const themeList: ThemeDefinition[] = [];

// Build the id -> definition map from the palette exports. Entries without an
// id are skipped, and the first definition for a given id wins (ids are
// expected to be unique) — so a stray export can never register undefined.
for (const theme of Object.values(presets)) {
  if (!theme.id || themes[theme.id]) {
    continue;
  }
  themes[theme.id] = theme;
  themeList.push(theme);
}

/** Runtime map of theme id -> ThemeDefinition, and the ordered list for UIs. */
export { themes, themeList };

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
