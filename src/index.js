import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'mobx-react';
import Router     from 'react-router/lib/Router';
import Route      from 'react-router/lib/Route';
import IndexRoute from 'react-router/lib/IndexRoute';
import History from 'utils/History';

import stores from 'stores';
window.stores = stores;

import 'normalize.css/normalize.css';
import 'utils/base-styles.scss';
import 'fonts/atlas/atlas.css';
import 'assets/styles/github-gist.scss';
import 'assets/styles/codemirror.css';

import Application from 'scenes/Application';

import Home from 'scenes/Home';
import Dashboard from 'scenes/Dashboard';
import Atlas from 'scenes/Atlas';
import DocumentScene from 'scenes/DocumentScene';
import DocumentEdit from 'scenes/DocumentEdit';
import SlackAuth from 'scenes/SlackAuth';

let DevTools;
if (__DEV__) {
  DevTools = require('mobx-react-devtools').default;
}

function requireAuth(nextState, replace) {
  if (!stores.user.authenticated) {
    replace({
      pathname: '/',
      state: { nextPathname: nextState.location.pathname },
    });
  }
}

render((
  <div style={{ display: 'flex', flex: 1, }}>
    <Provider user={ stores.user }>
      <Router history={History}>
        <Route path="/" component={ Application }>
          <IndexRoute component={Home} />

          <Route path="/dashboard" component={ Dashboard } onEnter={ requireAuth } />
          <Route path="/atlas/:id" component={ Atlas } onEnter={ requireAuth } />
          <Route path="/atlas/:id/new" component={ DocumentEdit } onEnter={ requireAuth } newDocument={ true } />
          <Route path="/documents/:id" component={ DocumentScene } onEnter={ requireAuth } />
          <Route path="/documents/:id/edit" component={ DocumentEdit } onEnter={ requireAuth } />
          <Route path="/documents/:id/new" component={ DocumentEdit } onEnter={ requireAuth } newChildDocument={ true } />

          <Route path="/auth/slack" component={SlackAuth} />
        </Route>
      </Router>
    </Provider>
    { __DEV__ ? <DevTools position={{ bottom: 0, right: 0 }} /> : null }
  </div>
), document.getElementById('root'));
