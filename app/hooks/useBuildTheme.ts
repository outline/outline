import { pickBy } from "es-toolkit";
import { useEffect, useMemo } from "react";
import { breakpoints } from "@shared/styles";
import {
  buildDarkTheme,
  buildLightTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import type { CustomTheme } from "@shared/types";
import { validateColorHex } from "@shared/utils/color";
import { Theme } from "~/stores/UiStore";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "./useStores";
import useQuery from "./useQuery";

/**
 * Builds a theme based on the current user's preferences, the current device
 * and the custom theme provided.
 *
 * @param customTheme Custom theme to merge with the default theme
 * @param overrideTheme Optional override the theme to use
 * @returns The theme to use
 */
export default function useBuildTheme(
  customTheme: Partial<CustomTheme> = {},
  overrideTheme?: Theme
) {
  const { ui } = useStores();
  const params = useQuery();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const isPrinting = useMediaQuery("print");
  const queryTheme = (params.get("theme") as Theme) || undefined;

  // Store the theme override in UiStore so it persists during navigation
  useEffect(() => {
    if (
      queryTheme &&
      (queryTheme === Theme.Light || queryTheme === Theme.Dark)
    ) {
      ui.setThemeOverride(queryTheme);
    }
  }, [queryTheme, ui]);

  const resolvedTheme = overrideTheme ?? ui.resolvedTheme;

  // Drop any stored color that is not valid hex so a bad value cannot break rendering.
  const safeTheme = useMemo(
    () =>
      pickBy(
        customTheme,
        (value): value is string =>
          typeof value === "string" && validateColorHex(value)
      ),
    [customTheme]
  );

  const theme = useMemo(
    () =>
      isPrinting
        ? buildLightTheme(safeTheme)
        : isMobile
          ? resolvedTheme === "dark"
            ? buildPitchBlackTheme(safeTheme)
            : buildLightTheme(safeTheme)
          : resolvedTheme === "dark"
            ? buildDarkTheme(safeTheme)
            : buildLightTheme(safeTheme),
    [safeTheme, isMobile, isPrinting, resolvedTheme]
  );

  return theme;
}
