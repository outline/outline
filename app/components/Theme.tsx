import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import { breakpoints } from "@shared/styles";
import GlobalStyles from "@shared/styles/globals";
import { dark, light, lightMobile, darkMobile } from "@shared/styles/theme";
import { UserPreference } from "@shared/types";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "~/hooks/useStores";
import { TooltipStyles } from "./Tooltip";

const Theme: React.FC = ({ children }) => {
  const { auth, ui } = useStores();
  const resolvedTheme = ui.resolvedTheme === "dark" ? dark : light;
  const resolvedMobileTheme =
    ui.resolvedTheme === "dark" ? darkMobile : lightMobile;
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const isPrinting = useMediaQuery("print");
  const theme = isPrinting
    ? light
    : isMobile
    ? resolvedMobileTheme
    : resolvedTheme;

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
