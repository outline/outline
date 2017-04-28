import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'mobx-react';
import Router from 'react-router/lib/Router';
import Route from 'react-router/lib/Route';
import IndexRoute from 'react-router/lib/IndexRoute';
import History from 'utils/History';
import { Offline } from 'components/Offline';

import stores from 'stores';

import 'normalize.css/normalize.css';
import 'styles/base.scss';
import 'styles/fonts.css';
import 'styles/transitions.scss';
import 'styles/hljs-github-gist.scss';
import 'styles/codemirror.scss';

import Application from 'scenes/Application';

import Home from 'scenes/Home';
import Dashboard from 'scenes/Dashboard';
import Atlas from 'scenes/Atlas';
import DocumentScene from 'scenes/DocumentScene';
import DocumentEdit from 'scenes/DocumentEdit';
import Search from 'scenes/Search';
import Settings from 'scenes/Settings';
import SlackAuth from 'scenes/SlackAuth';
import Flatpage from 'scenes/Flatpage';
import ErrorAuth from 'scenes/ErrorAuth';
import Error404 from 'scenes/Error404';

import flatpages from 'static/flatpages';

let DevTools;
if (__DEV__) {
  DevTools = require('mobx-react-devtools').default; // eslint-disable-line global-require
}

function requireAuth(nextState, replace) {
  if (!stores.user.authenticated) {
    replace({
      pathname: '/',
      state: { nextPathname: nextState.location.pathname },
    });
  }
}

render(
  <div style={{ display: 'flex', flex: 1, height: '100%' }}>
    <Provider {...stores}>
      <Offline>
        <Router history={History}>
          <Route path="/" component={Application}>
            <IndexRoute component={Home} />

            <Route
              path="/dashboard"
              component={Dashboard}
              onEnter={requireAuth}
            />
            <Route
              path="/collections/:id"
              component={Atlas}
              onEnter={requireAuth}
            />
            <Route
              path="/collections/:id/new"
              component={DocumentEdit}
              onEnter={requireAuth}
              newDocument
            />
            <Route
              path="/d/:id"
              component={DocumentScene}
              onEnter={requireAuth}
            />
            <Route
              path="/d/:id/edit"
              component={DocumentEdit}
              onEnter={requireAuth}
            />
            <Route
              path="/d/:id/new"
              component={DocumentEdit}
              onEnter={requireAuth}
              newChildDocument
            />

            <Route path="/search" component={Search} onEnter={requireAuth} />
            <Route
              path="/settings"
              component={Settings}
              onEnter={requireAuth}
            />

            <Route path="/auth/slack" component={SlackAuth} />
            <Route
              path="/auth/slack/commands"
              component={SlackAuth}
              apiPath="/auth.slackCommands"
            />
            <Route path="/auth/error" component={ErrorAuth} />

            <Flatpage
              path="/keyboard-shortcuts"
              component={Flatpage}
              title="Keyboard shortcuts"
              content={flatpages.keyboard}
            />

            <Flatpage
              path="/developers"
              component={Flatpage}
              title="API"
              content={flatpages.api}
            />

            <Route path="/404" component={Error404} />
            <Route path="*" component={Search} sceneType="notFound" />
          </Route>
        </Router>
      </Offline>
    </Provider>
    {__DEV__ && <DevTools position={{ bottom: 0, right: 0 }} />}
  </div>,
  document.getElementById('root')
);
