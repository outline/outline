import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';
import { createStore, applyMiddleware } from 'redux';
import * as storage from 'redux-storage';
import createEngine from 'redux-storage-engine-localstorage';
import History from './Utils/History';

import Auth from './Utils/Auth';

import reducers from './Reducers';

import App from './Views/App';
import Login from './Views/Login';
import Dashboard from './Views/Dashboard';

// Redux

const reducer = storage.reducer(reducers);
const engine = createEngine('atlas-store');
const storageMiddleware = storage.createMiddleware(engine);

const createStoreWithMiddleware = applyMiddleware(storageMiddleware)(createStore);
const store = createStoreWithMiddleware(reducer);

const load = storage.createLoader(engine);
load(store);
// .then((newState) => console.log('Loaded state:', newState));
// .catch(() => console.log('Failed to load previous state'));

// React router

function requireAuth(nextState, replace) {
  if (!Auth.loggedIn()) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname },
    });
  }
}

render((
  <Provider store={store}>
    <Router history={History}>
      <Route path="/" component={App} />
    </Router>
  </Provider>
), document.getElementById('root'));
