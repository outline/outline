import { useEffect, useState } from "react";
import { getTheme } from "./core/registry";
import type { ThemeDefinition } from "./core/types";

const STORAGE_KEY = "outlineTheme";
const CHANGE_EVENT = "outline-theme-change";

/** Reads the selected theme id from localStorage (empty when unset). */
function readId(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? "").trim();
  } catch {
    // localStorage can throw in private-mode / sandboxed contexts.
    return "";
  }
}

/**
 * Reactively reads the selected theme and resolves it to a definition. The
 * initial value is read synchronously so the chosen theme applies on first
 * paint; it then re-renders on theme change in the current tab (CHANGE_EVENT)
 * or another tab (storage). No selection (or an unknown id) yields undefined,
 * which leaves stock Outline behavior intact.
 *
 * @returns the selected theme definition, or undefined.
 */
export function useSelectedTheme(): ThemeDefinition | undefined {
  const [id, setId] = useState<string>(readId);

  useEffect(() => {
    const sync = () => setId(readId());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  return getTheme(id);
}

/**
 * Persists the selected theme id and notifies listeners in the current tab.
 *
 * @param id the theme id to select, or null to clear and revert to stock.
 */
export function setTheme(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
