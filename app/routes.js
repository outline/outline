// @flow
import * as React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Home from 'scenes/Home';
import Dashboard from 'scenes/Dashboard';
import Starred from 'scenes/Starred';
import Drafts from 'scenes/Drafts';
import Archive from 'scenes/Archive';
import Collection from 'scenes/Collection';
import Document from 'scenes/Document';
import KeyedDocument from 'scenes/Document/KeyedDocument';
import Search from 'scenes/Search';
import Settings from 'scenes/Settings';
import Details from 'scenes/Settings/Details';
import Notifications from 'scenes/Settings/Notifications';
import Security from 'scenes/Settings/Security';
import People from 'scenes/Settings/People';
import Slack from 'scenes/Settings/Slack';
import Zapier from 'scenes/Settings/Zapier';
import Shares from 'scenes/Settings/Shares';
import Tokens from 'scenes/Settings/Tokens';
import Export from 'scenes/Settings/Export';
import Error404 from 'scenes/Error404';

import Layout from 'components/Layout';
import SocketProvider from 'components/SocketProvider';
import Authenticated from 'components/Authenticated';
import RouteSidebarHidden from 'components/RouteSidebarHidden';
import { matchDocumentSlug as slug } from 'utils/routeHelpers';

const NotFound = () => <Search notFound />;
const NewDocument = () => <Document newDocument />;
const RedirectDocument = ({ match }: { match: Object }) => (
  <Redirect to={`/doc/${match.params.documentSlug}`} />
);

export default function Routes() {
  return (
    <Switch>
      <Route exact path="/" component={Home} />
      <Route exact path="/share/:shareId" component={KeyedDocument} />
      <Authenticated>
        <SocketProvider>
          <Layout>
            <Switch>
              <Route path="/dashboard/:tab" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route exact path="/starred" component={Starred} />
              <Route exact path="/starred/:sort" component={Starred} />
              <Route exact path="/drafts" component={Drafts} />
              <Route exact path="/archive" component={Archive} />
              <Route exact path="/settings" component={Settings} />
              <Route exact path="/settings/details" component={Details} />
              <Route exact path="/settings/security" component={Security} />
              <Route exact path="/settings/people" component={People} />
              <Route exact path="/settings/people/:filter" component={People} />
              <Route exact path="/settings/shares" component={Shares} />
              <Route exact path="/settings/tokens" component={Tokens} />
              <Route
                exact
                path="/settings/notifications"
                component={Notifications}
              />
              <Route
                exact
                path="/settings/integrations/slack"
                component={Slack}
              />
              <Route
                exact
                path="/settings/integrations/zapier"
                component={Zapier}
              />
              <Route exact path="/settings/export" component={Export} />
              <RouteSidebarHidden
                exact
                path="/collections/:id/new"
                component={NewDocument}
              />
              <Route
                exact
                path="/collections/:id/:tab"
                component={Collection}
              />
              <Route exact path="/collections/:id" component={Collection} />
              <Route exact path={`/d/${slug}`} component={RedirectDocument} />
              <Route
                exact
                path={`/doc/${slug}/history/:revisionId?`}
                component={KeyedDocument}
              />
              <RouteSidebarHidden
                exact
                path={`/doc/${slug}/edit`}
                component={KeyedDocument}
              />
              <Route path={`/doc/${slug}`} component={KeyedDocument} />
              <Route exact path="/search" component={Search} />
              <Route exact path="/search/:term" component={Search} />
              <Route path="/404" component={Error404} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </SocketProvider>
      </Authenticated>
    </Switch>
  );
}
