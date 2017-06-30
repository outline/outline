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
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';

import 'normalize.css/normalize.css';
import 'styles/base.scss';
import 'styles/fonts.css';
import 'styles/transitions.scss';
import 'styles/prism-tomorrow.scss';
import 'styles/hljs-github-gist.scss';

import Home from 'scenes/Home';
import Dashboard from 'scenes/Dashboard';
import Starred from 'scenes/Starred';
import Collection from 'scenes/Collection';
import Document from 'scenes/Document';
import Search from 'scenes/Search';
import Settings from 'scenes/Settings';
import SlackAuth from 'scenes/SlackAuth';
import Flatpage from 'scenes/Flatpage';
import ErrorAuth from 'scenes/ErrorAuth';
import Error404 from 'scenes/Error404';

import Layout from 'components/Layout';

import flatpages from 'static/flatpages';

let DevTools;
if (__DEV__) {
  DevTools = require('mobx-react-devtools').default; // eslint-disable-line global-require
}

let authenticatedStores;

type AuthProps = {
  children?: React.Element<any>,
};

const Auth = ({ children }: AuthProps) => {
  if (stores.auth.authenticated && stores.auth.team) {
    // Only initialize stores once. Kept in global scope
    // because otherwise they will get overriden on route
    // change
    if (!authenticatedStores) {
      // Stores for authenticated user
      const user = stores.auth.getUserStore();
      authenticatedStores = {
        user,
        documents: new DocumentsStore(),
        collections: new CollectionsStore({
          teamId: user.team.id,
        }),
      };

      authenticatedStores.collections.fetchAll();
    }

    return (
      <Flex auto>
        <Provider {...authenticatedStores}>
          {children}
        </Provider>
      </Flex>
    );
  } else {
    return <Redirect to="/" />;
  }
};

const notFoundSearch = () => <Search notFound />;
const KeyboardShortcuts = () => (
  <Flatpage title="Keyboard shortcuts" content={flatpages.keyboard} />
);
const Api = () => <Flatpage title="API" content={flatpages.api} />;
const DocumentNew = () => <Document newDocument />;
const DocumentNewChild = () => <Document newChildDocument />;

render(
  <div style={{ display: 'flex', flex: 1, height: '100%' }}>
    <Provider {...stores}>
      <Router>
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
                <Route exact path="/collections/:id" component={Collection} />
                <Route exact path="/d/:id" component={Document} />

                <Route exact path="/d/:id/:edit" component={Document} />
                <Route
                  exact
                  path="/collections/:id/new"
                  component={DocumentNew}
                />
                <Route exact path="/d/:id/new" component={DocumentNewChild} />

                <Route exact path="/search" component={Search} />
                <Route exact path="/search/:query" component={Search} />
                <Route exact path="/settings" component={Settings} />

                <Route
                  exact
                  path="/keyboard-shortcuts"
                  component={KeyboardShortcuts}
                />
                <Route exact path="/developers" component={Api} />

                <Route path="/404" component={Error404} />
                <Route component={notFoundSearch} />
              </Switch>
            </Layout>
          </Auth>
        </Switch>
      </Router>
    </Provider>
    {DevTools && <DevTools position={{ bottom: 0, right: 0 }} />}
  </div>,
  document.getElementById('root')
);

window.authenticatedStores = authenticatedStores;
