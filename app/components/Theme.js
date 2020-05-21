// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { ThemeProvider } from 'styled-components';
import { dark, light } from 'shared/styles/theme';
import GlobalStyles from 'shared/styles/globals';
import UiStore from 'stores/UiStore';

type Props = {
  ui: UiStore,
  children: React.Node,
};

function Theme({ children, ui }: Props) {
  return (
    <ThemeProvider theme={ui.resolvedTheme === 'dark' ? dark : light}>
      <React.Fragment>
        <GlobalStyles />
        {children}
      </React.Fragment>
    </ThemeProvider>
  );
}

export default inject('ui')(observer(Theme));
