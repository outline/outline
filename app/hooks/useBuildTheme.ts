import * as React from "react";
import { breakpoints } from "@shared/styles";
import {
  buildDarkTheme,
  buildLightTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import { CustomTheme } from "@shared/types";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "./useStores";

/**
 * Builds a theme based on the current user's preferences, the current device
 * and the custom theme provided.
 *
 * @param customTheme Custom theme to merge with the default theme
 * @returns The theme to use
 */
export default function useBuildTheme(customTheme: Partial<CustomTheme> = {}) {
  const { ui } = useStores();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const isPrinting = useMediaQuery("print");

  const theme = React.useMemo(
    () =>
      isPrinting
        ? buildLightTheme(customTheme)
        : isMobile
        ? ui.resolvedTheme === "dark"
          ? buildPitchBlackTheme(customTheme)
          : buildLightTheme(customTheme)
        : ui.resolvedTheme === "dark"
        ? buildDarkTheme(customTheme)
        : buildLightTheme(customTheme),
    [customTheme, isMobile, isPrinting, ui.resolvedTheme]
  );

  return theme;
}
