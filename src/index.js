import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';
import { createStore, compose } from 'redux';
import History from './Utils/History';

import Auth from './Utils/Auth';

import reducers from './Reducers';

import App from './Views/App';
import Login from './Views/Login';
import Dashboard from './Views/Dashboard';

const store = createStore(
  reducers,
  compose(
    window.devToolsExtension ? window.devToolsExtension() : f => f
  )
);

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
      <Route path="/" component={App}>
        <Route path="login" component={Login} />
        <Route path="dashboard" component={Dashboard} onEnter={requireAuth} />
      </Route>
    </Router>
  </Provider>
), document.getElementById('root'));
