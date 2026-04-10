import { useEffect, useMemo } from "react";
import { breakpoints } from "@shared/styles";
import {
  buildDarkTheme,
  buildLightTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import type { CustomTheme } from "@shared/types";
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
 * @param userThemeOverrides Optional per-user theme property overrides merged last
 * @returns The theme to use
 */
export default function useBuildTheme(
  customTheme: Partial<CustomTheme> = {},
  overrideTheme?: Theme,
  userThemeOverrides?: Record<string, string>
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

  const theme = useMemo(() => {
    const base = isPrinting
      ? buildLightTheme(customTheme)
      : isMobile
        ? resolvedTheme === "dark"
          ? buildPitchBlackTheme(customTheme)
          : buildLightTheme(customTheme)
        : resolvedTheme === "dark"
          ? buildDarkTheme(customTheme)
          : buildLightTheme(customTheme);

    if (userThemeOverrides) {
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(userThemeOverrides)) {
        if (key in base && typeof base[key as keyof typeof base] === "string") {
          filtered[key] = value;
        }
      }
      return { ...base, ...filtered };
    }
    return base;
  }, [customTheme, isMobile, isPrinting, resolvedTheme, userThemeOverrides]);

  return theme;
}
