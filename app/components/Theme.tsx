import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import { breakpoints } from "@shared/styles";
import { dark, light, lightMobile, darkMobile } from "@shared/styles/theme";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "~/hooks/useStores";
import GlobalStyles from "~/styles/globals";

const Theme: React.FC = ({ children }) => {
  const { ui } = useStores();
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
    window.dispatchEvent(new Event("theme-changed"));
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <>
        <GlobalStyles />
        {children}
      </>
    </ThemeProvider>
  );
};

export default observer(Theme);
