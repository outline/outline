// @flow
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'mobx-react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';

import stores from 'stores';
import globalStyles from 'shared/styles/globals';
import 'shared/styles/prism.css';

import Home from 'scenes/Home';
import Dashboard from 'scenes/Dashboard';
import Starred from 'scenes/Starred';
import Collection from 'scenes/Collection';
import Document from 'scenes/Document';
import Search from 'scenes/Search';
import Settings from 'scenes/Settings';
import Slack from 'scenes/Settings/Slack';
import Tokens from 'scenes/Settings/Tokens';
import SlackAuth from 'scenes/SlackAuth';
import ErrorAuth from 'scenes/ErrorAuth';
import Error404 from 'scenes/Error404';

import ErrorBoundary from 'components/ErrorBoundary';
import ScrollToTop from 'components/ScrollToTop';
import Layout from 'components/Layout';
import Auth from 'components/Auth';
import RouteSidebarHidden from 'components/RouteSidebarHidden';

import { matchDocumentSlug } from 'utils/routeHelpers';

let DevTools;
if (__DEV__) {
  DevTools = require('mobx-react-devtools').default; // eslint-disable-line global-require
}

const notFoundSearch = () => <Search notFound />;
const DocumentNew = () => <Document newDocument />;
const RedirectDocument = ({ match }: { match: Object }) => (
  <Redirect to={`/doc/${match.params.documentSlug}`} />
);

globalStyles();

render(
  <div style={{ display: 'flex', flex: 1, height: '100%' }}>
    <ErrorBoundary>
      <Provider {...stores}>
        <Router>
          <ScrollToTop>
            <Switch>
              <Route exact path="/" component={Home} />
              <Route exact path="/auth/slack" component={SlackAuth} />
              <Route exact path="/auth/slack/commands" component={SlackAuth} />
              <Route exact path="/auth/error" component={ErrorAuth} />

              <Auth>
                <Layout>
                  <Switch>
                    <Route exact path="/dashboard" component={Dashboard} />
                    <Route exact path="/starred" component={Starred} />
                    <Route exact path="/settings" component={Settings} />
                    <Route exact path="/settings/tokens" component={Tokens} />
                    <Route
                      exact
                      path="/settings/integrations/slack"
                      component={Slack}
                    />

                    <Route
                      exact
                      path="/collections/:id"
                      component={Collection}
                    />
                    <Route
                      exact
                      path={`/d/${matchDocumentSlug}`}
                      component={RedirectDocument}
                    />
                    <Route
                      exact
                      path={`/doc/${matchDocumentSlug}`}
                      component={Document}
                    />
                    <Route
                      exact
                      path={`/doc/${matchDocumentSlug}/move`}
                      component={Document}
                    />

                    <Route exact path="/search" component={Search} />
                    <Route exact path="/search/:query" component={Search} />

                    <Route path="/404" component={Error404} />

                    <RouteSidebarHidden
                      exact
                      path={`/doc/${matchDocumentSlug}/edit`}
                      component={Document}
                    />
                    <RouteSidebarHidden
                      exact
                      path="/collections/:id/new"
                      component={DocumentNew}
                    />
                    <Route component={notFoundSearch} />
                  </Switch>
                </Layout>
              </Auth>
            </Switch>
          </ScrollToTop>
        </Router>
      </Provider>
    </ErrorBoundary>
    {DevTools && <DevTools position={{ bottom: 0, right: 0 }} />}
  </div>,
  document.getElementById('root')
);
