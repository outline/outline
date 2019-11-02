// @flow
import 'react-hot-loader';
import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import { render } from 'react-dom';
import { Provider } from 'mobx-react';
import { BrowserRouter as Router } from 'react-router-dom';
import stores from 'stores';

import ErrorBoundary from 'components/ErrorBoundary';
import ScrollToTop from 'components/ScrollToTop';
import Toasts from 'components/Toasts';
import Theme from 'components/Theme';
import Routes from './routes';

const element = document.getElementById('root');

const App = () => {
  return (
    <ErrorBoundary>
      <Provider {...stores}>
        <Theme>
          <Router>
            <React.Fragment>
              <ScrollToTop>
                <Routes />
              </ScrollToTop>
              <Toasts />
            </React.Fragment>
          </Router>
        </Theme>
      </Provider>
    </ErrorBoundary>
  );
};

const AppContainer = hot(App);

if (element) {
  render(<AppContainer />, element);
}

window.addEventListener('load', async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!process.env.GOOGLE_ANALYTICS_ID || !window.ga) return;

  // https://github.com/googleanalytics/autotrack/issues/137#issuecomment-305890099
  await import('autotrack/autotrack.js');

  window.ga('require', 'outboundLinkTracker');
  window.ga('require', 'urlChangeTracker');
  window.ga('require', 'eventTracker', {
    attributePrefix: 'data-',
  });
});
