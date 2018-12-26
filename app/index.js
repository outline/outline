// @flow
import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'mobx-react';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router } from 'react-router-dom';

import stores from 'stores';
import theme from 'shared/styles/theme';
import GlobalStyles from 'shared/styles/globals';
import 'shared/styles/prism.css';

import ErrorBoundary from 'components/ErrorBoundary';
import ScrollToTop from 'components/ScrollToTop';
import ScrollToAnchor from 'components/ScrollToAnchor';
import Toasts from 'components/Toasts';
import Routes from './routes';

let DevTools;
if (__DEV__) {
  DevTools = require('mobx-react-devtools').default; // eslint-disable-line global-require
}

const element = document.getElementById('root');

if (element) {
  render(
    <React.Fragment>
      <GlobalStyles />
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <Provider {...stores}>
            <Router>
              <React.Fragment>
                <ScrollToTop>
                  <ScrollToAnchor>
                    <Routes />
                  </ScrollToAnchor>
                </ScrollToTop>
                <Toasts />
              </React.Fragment>
            </Router>
          </Provider>
        </ErrorBoundary>
      </ThemeProvider>
      {DevTools && <DevTools position={{ bottom: 0, right: 0 }} />}
    </React.Fragment>,
    element
  );
}

window.addEventListener('load', async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!process.env.GOOGLE_ANALYTICS_ID || !window.ga) return;

  // https://github.com/googleanalytics/autotrack/issues/137#issuecomment-305890099
  await import('autotrack/autotrack.js');

  window.ga('require', 'outboundLinkTracker');
  window.ga('require', 'urlChangeTracker');
});
