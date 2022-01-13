import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import { dark, light, lightMobile, darkMobile } from "@shared/theme";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "~/hooks/useStores";
import GlobalStyles from "~/styles/globals";

type Props = {
  children: React.ReactNode;
};

function Theme({ children }: Props) {
  const { ui } = useStores();
  const theme = ui.resolvedTheme === "dark" ? dark : light;
  const mobileTheme = ui.resolvedTheme === "dark" ? darkMobile : lightMobile;
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.tablet}px)`);
  const isPrinting = useMediaQuery("print");

  return (
    <ThemeProvider theme={isPrinting ? light : isMobile ? mobileTheme : theme}>
      <>
        <GlobalStyles />
        {children}
      </>
    </ThemeProvider>
  );
}

export default observer(Theme);
