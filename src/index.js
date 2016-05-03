import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, Route, IndexRoute } from 'react-router';
import { createStore, applyMiddleware } from 'redux';
import { routerMiddleware } from 'react-router-redux';
import { persistStore, autoRehydrate } from 'redux-persist';
import thunkMiddleware from 'redux-thunk';
import * as storage from 'redux-storage';
import createEngine from 'redux-storage-engine-localstorage';
import createLogger from 'redux-logger';
import History from 'utils/History';

import auth from 'utils/auth';

import reducers from 'reducers';

import 'utils/base-styles.scss';

import Home from 'scenes/Home';
import App from 'scenes/App';
import Dashboard from 'scenes/Dashboard';
import SlackAuth from 'scenes/SlackAuth';

// Redux

const reducer = storage.reducer(reducers);
const loggerMiddleware = createLogger();
const routerMiddlewareWithHistory = routerMiddleware(History);

const createStoreWithMiddleware = (createStore);

const store = createStore(reducer, applyMiddleware(
  thunkMiddleware,
  routerMiddlewareWithHistory,
  loggerMiddleware,
), autoRehydrate());

persistStore(store, {
  whitelist: [
    'user',
    'team',
  ]
}, () => {
  render((
    <Provider store={store}>
      <Router history={History}>
        <Route path="/">
          <IndexRoute component={Home} />

          <Route path="/dashboard" component={Dashboard
          } onEnter={ requireAuth } />
          <Route path="/atlas/:id" component={Dashboard} onEnter={ requireAuth } />
          <Route path="/atlas/:id/new" component={Dashboard} onEnter={ requireAuth } />

          <Route path="/editor" component={Dashboard} />

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

