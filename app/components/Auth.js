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

type Props = {
  auth: AuthStore,
  children?: React.Node,
};

let authenticatedStores;

const Auth = observer(({ auth, children }: Props) => {
  if (auth.authenticated) {
    const { user, team } = auth;

    if (!team || !user) {
      return <LoadingIndicator />;
    }

    if (
      team.subdomain &&
      !window.location.hostname.startsWith(team.subdomain)
    ) {
      window.location.href = `${team.url}${window.location.pathname}`;
      return <LoadingIndicator />;
    }

    // Only initialize stores once. Kept in global scope because otherwise they
    // will get overridden on route change
    if (!authenticatedStores) {
      // Stores for authenticated user
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

      authenticatedStores.collections.fetchPage({ limit: 100 });
    }

    return <Provider {...authenticatedStores}>{children}</Provider>;
  }

  auth.logout();
  return null;
});

export default inject('auth')(Auth);
