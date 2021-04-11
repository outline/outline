// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import GlobalStyles from "shared/styles/globals";
import { dark, light } from "shared/styles/theme";
import useStores from "hooks/useStores";

type Props = {|
  children: React.Node,
|};

function Theme({ children }: Props) {
  const { ui } = useStores();

  return (
    <ThemeProvider theme={ui.resolvedTheme === "dark" ? dark : light}>
      <>
        <GlobalStyles />
        {children}
      </>
    </ThemeProvider>
  );
}

export default observer(Theme);
