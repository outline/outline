// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import GlobalStyles from "shared/styles/globals";
import { dark, light, lightMobile, darkMobile } from "shared/styles/theme";
import useMediaQuery from "hooks/useMediaQuery";
import useStores from "hooks/useStores";

const empty = {};

type Props = {|
  children: React.Node,
|};

function Theme({ children }: Props) {
  const { ui } = useStores();
  const theme = ui.resolvedTheme === "dark" ? dark : light;
  const mobileTheme = ui.resolvedTheme === "dark" ? darkMobile : lightMobile;
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.tablet}px)`);

  return (
    <ThemeProvider theme={theme}>
      <ThemeProvider theme={isMobile ? mobileTheme : empty}>
        <>
          <GlobalStyles />
          {children}
        </>
      </ThemeProvider>
    </ThemeProvider>
  );
}

export default observer(Theme);
