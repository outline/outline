import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import Router     from 'react-router/lib/Router';
import Route      from 'react-router/lib/Route';
import IndexRoute from 'react-router/lib/IndexRoute';
import { createStore, applyMiddleware } from 'redux';
import { routerMiddleware } from 'react-router-redux';
import { persistStore, autoRehydrate } from 'redux-persist';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import History from 'utils/History';

import auth from 'utils/auth';

import reducers from 'reducers';

import 'normalize.css/normalize.css';
import 'utils/base-styles.scss';
import 'fonts/atlas/atlas.css';
import 'assets/styles/github-gist.scss';

import Application from 'scenes/Application';

import Home from 'scenes/Home';
import Editor from 'scenes/Editor';
import Dashboard from 'scenes/Dashboard';
import Atlas from 'scenes/Atlas';
import DocumentScene from 'scenes/DocumentScene';
import SlackAuth from 'scenes/SlackAuth';

// Redux
let store;
const routerMiddlewareWithHistory = routerMiddleware(History);
if (__DEV__) {
  const loggerMiddleware = createLogger();
  store = createStore(reducers, applyMiddleware(
    thunkMiddleware,
    routerMiddlewareWithHistory,
    loggerMiddleware,
  ), autoRehydrate());
} else {
  store = createStore(reducers, applyMiddleware(
    thunkMiddleware,
    routerMiddlewareWithHistory,
  ), autoRehydrate());
}


persistStore(store, {
  whitelist: [
    'user',
    'team',
  ]
}, () => {
  render((
    <Provider store={store}>
      <Router history={History}>
        <Route path="/" component={ Application }>
          <IndexRoute component={Home} />

          <Route path="/dashboard" component={ Dashboard } onEnter={ requireAuth } />
          <Route path="/atlas/:id" component={ Atlas } onEnter={ requireAuth } />
          <Route path="/atlas/:id/new" component={ Editor } onEnter={ requireAuth } />
          <Route path="/documents/:id" component={ DocumentScene } onEnter={ requireAuth } />

          <Route path="/auth/slack" component={SlackAuth} />
        </Route>
      </Router>
    </Provider>
  ), document.getElementById('root'));
});

function requireAuth(nextState, replace) {
  if (!auth.loggedIn()) {
    replace({
      pathname: '/',
      state: { nextPathname: nextState.location.pathname },
    });
  }
}
