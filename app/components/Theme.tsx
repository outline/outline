import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import { breakpoints } from "@shared/styles";
import GlobalStyles from "@shared/styles/globals";
import {
  buildDarkTheme,
  buildLightTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import { UserPreference } from "@shared/types";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "~/hooks/useStores";
import { TooltipStyles } from "./Tooltip";

const Theme: React.FC = ({ children }) => {
  const { auth, ui } = useStores();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const isPrinting = useMediaQuery("print");

  const theme = React.useMemo(() => {
    const customTheme = auth.team?.preferences?.customTheme || {};

    return isPrinting
      ? buildLightTheme(customTheme)
      : isMobile
      ? ui.resolvedTheme === "dark"
        ? buildPitchBlackTheme(customTheme)
        : buildLightTheme(customTheme)
      : ui.resolvedTheme === "dark"
      ? buildDarkTheme(customTheme)
      : buildLightTheme(customTheme);
  }, [
    auth.team?.preferences?.customTheme,
    isMobile,
    isPrinting,
    ui.resolvedTheme,
  ]);

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { isDark: ui.resolvedTheme === "dark" },
      })
    );
  }, [ui.resolvedTheme]);

  return (
    <ThemeProvider theme={theme}>
      <>
        <TooltipStyles />
        <GlobalStyles
          useCursorPointer={auth.user?.getPreference(
            UserPreference.UseCursorPointer,
            true
          )}
        />
        {children}
      </>
    </ThemeProvider>
  );
};

export default observer(Theme);
