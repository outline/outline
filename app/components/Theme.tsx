import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import useMediaQuery from "@shared/hooks/useMediaQuery";
import { dark, light, lightMobile, darkMobile } from "@shared/theme";
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

  return (
    <ThemeProvider theme={isMobile ? mobileTheme : theme}>
      <>
        <GlobalStyles />
        {children}
      </>
    </ThemeProvider>
  );
}

export default observer(Theme);
