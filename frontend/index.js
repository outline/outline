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
import { Flex } from 'reflexbox';

import stores from 'stores';

import 'normalize.css/normalize.css';
import 'styles/base.scss';
import 'styles/fonts.css';
import 'styles/transitions.scss';
import 'styles/prism-tomorrow.scss';
import 'styles/hljs-github-gist.scss';

import Home from 'scenes/Home';
import Dashboard from 'scenes/Dashboard';
import Atlas from 'scenes/Atlas';
import Document from 'scenes/Document';
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

type AuthProps = {
  children?: React.Element<any>,
};

const Auth = ({ children }: AuthProps) => {
  if (stores.user.authenticated) {
    return <Flex auto>{children}</Flex>;
  } else {
    return <Redirect to="/" />;
  }
};

const notFoundSearch = () => <Search notFound />;
const KeyboardShortcuts = () => (
  <Flatpage title="Keyboard shortcuts" content={flatpages.keyboard} />
);
const Api = () => <Flatpage title="API" content={flatpages.api} />;
const DocumentEdit = () => <Document editDocument />;
const DocumentNew = () => <Document newDocument />;
const DocumentNewChild = () => <Document newChildDocument />;

render(
  <div style={{ display: 'flex', flex: 1, height: '100%' }}>
    <Provider {...stores}>
      <Router>
        <Switch>
          <Route exact path="/" component={Home} />

          <Auth>
            <Switch>
              <Route exact path="/dashboard" component={Dashboard} />
              <Route exact path="/collections/:id" component={Atlas} />
              <Route exact path="/d/:id" component={Document} />
              <Route exact path="/d/:id/edit" component={DocumentEdit} />
              <Route
                exact
                path="/collections/:id/new"
                component={DocumentNew}
              />
              <Route exact path="/d/:id/new" component={DocumentNewChild} />

              <Route exact path="/search" component={Search} />
              <Route exact path="/settings" component={Settings} />

              <Route exact path="/auth/slack" component={SlackAuth} />
              <Route exact path="/auth/slack/commands" component={SlackAuth} />
              <Route exact path="/auth/error" component={ErrorAuth} />

              <Route
                exact
                path="/keyboard-shortcuts"
                component={KeyboardShortcuts}
              />
              <Route exact path="/developers" component={Api} />

              <Route path="/404" component={Error404} />
              <Route component={notFoundSearch} />
            </Switch>
          </Auth>
        </Switch>
      </Router>
    </Provider>
    {DevTools && <DevTools position={{ bottom: 0, right: 0 }} />}
  </div>,
  document.getElementById('root')
);
