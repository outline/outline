import { TeamPreference } from "@shared/types";
import useStores from "~/hooks/useStores";
import { getTheme } from "./core/registry";
import type { ThemeDefinition } from "./core/types";

/**
 * Reads the workspace's selected theme — a server-side team preference, so it
 * is set by an admin and applies to every member. Must be called inside a MobX
 * `observer` (e.g. the Theme provider) so it re-renders when the preference
 * changes. No selection (or an unknown id) yields undefined, leaving stock
 * Outline behavior intact.
 *
 * @returns the team's selected theme definition, or undefined.
 */
export function useSelectedTheme(): ThemeDefinition | undefined {
  const { auth } = useStores();
  const id = auth.team?.getPreference(TeamPreference.Theme);
  return getTheme(typeof id === "string" ? id : undefined);
}
