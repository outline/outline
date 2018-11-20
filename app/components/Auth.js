// @flow
import * as React from 'react';
import { Provider, observer, inject } from 'mobx-react';
import stores from 'stores';
import AuthStore from 'stores/AuthStore';
import ApiKeysStore from 'stores/ApiKeysStore';
import UsersStore from 'stores/UsersStore';
import CollectionsStore from 'stores/CollectionsStore';
import IntegrationsStore from 'stores/IntegrationsStore';
import LoadingIndicator from 'components/LoadingIndicator';
import { isCustomSubdomain } from 'shared/utils/domains';

type Props = {
  auth: AuthStore,
  children?: React.Node,
};

let authenticatedStores;

const Auth = observer(({ auth, children }: Props) => {
  if (auth.authenticated) {
    const { user, team } = auth;
    const { hostname } = window.location;

    if (!team || !user) {
      return <LoadingIndicator />;
    }

    // If we're authenticated but viewing a subdomain that doesn't match the
    // currently authenticated team then kick the user to the teams subdomain.
    if (
      process.env.SUBDOMAINS_ENABLED &&
      team.subdomain &&
      isCustomSubdomain(hostname) &&
      !hostname.startsWith(`${team.subdomain}.`)
    ) {
      window.location.href = `${team.url}${window.location.pathname}`;
      return <LoadingIndicator />;
    }

    // Only initialize stores once. Kept in global scope because otherwise they
    // will get overridden on route change
    if (!authenticatedStores) {
      authenticatedStores = {
        integrations: new IntegrationsStore({
          ui: stores.ui,
        }),
        apiKeys: new ApiKeysStore(),
        users: new UsersStore(),
        collections: new CollectionsStore({
          ui: stores.ui,
          teamId: team.id,
        }),
      };

      if (window.Bugsnag) {
        Bugsnag.user = {
          id: user.id,
          name: user.name,
          teamId: team.id,
          team: team.name,
        };
      }

      // Session custom dimension separates logged in from logged out users
      if (window.ga) {
        window.ga('set', { dimension1: true });
      }

      authenticatedStores.collections.fetchPage({ limit: 100 });
    }

    return <Provider {...authenticatedStores}>{children}</Provider>;
  }

  auth.logout();
  return null;
});

export default inject('auth')(Auth);
