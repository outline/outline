import { useCallback } from "react";
import { ensureContrast } from "../utils/color";
import useStores from "./useStores";

/**
 * Returns a function that swaps a color for a fallback when the color is not
 * visible against the background of the current theme.
 *
 * @returns a function that takes a color and an optional fallback, which
 * defaults to currentColor, and returns the color to render.
 */
export default function useContrastColor() {
  const { ui } = useStores();
  const isDark = ui.resolvedTheme === "dark";

  return useCallback(
    (color: string | null | undefined, fallback?: string) =>
      ensureContrast(color, isDark, fallback),
    [isDark]
  );
}
