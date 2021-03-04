// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import GlobalStyles from "shared/styles/globals";
import { dark, light } from "shared/styles/theme";
import UiStore from "stores/UiStore";

type Props = {
  ui: UiStore,
  children: React.Node,
};

function Theme({ children, ui }: Props) {
  return (
    <ThemeProvider theme={ui.resolvedTheme === "dark" ? dark : light}>
      <>
        <GlobalStyles />
        {children}
      </>
    </ThemeProvider>
  );
}

export default inject("ui")(observer(Theme));
