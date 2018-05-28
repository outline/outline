// @flow
import * as React from 'react';
import { Provider } from 'mobx-react';
import stores from 'stores';
import ApiKeysStore from 'stores/ApiKeysStore';
import UsersStore from 'stores/UsersStore';
import CollectionsStore from 'stores/CollectionsStore';
import IntegrationsStore from 'stores/IntegrationsStore';
import CacheStore from 'stores/CacheStore';

type Props = {
  children?: React.Node,
};

let authenticatedStores;

const Auth = ({ children }: Props) => {
  if (stores.auth.authenticated) {
    if (!stores.auth.team || !stores.auth.user) {
      stores.auth.fetch();
      return null;
    }

    // Only initialize stores once. Kept in global scope because otherwise they
    // will get overridden on route change
    if (!authenticatedStores) {
      // Stores for authenticated user
      const { user, team } = stores.auth;
      const cache = new CacheStore(user.id);
      authenticatedStores = {
        integrations: new IntegrationsStore(),
        apiKeys: new ApiKeysStore(),
        users: new UsersStore(),
        collections: new CollectionsStore({
          ui: stores.ui,
          teamId: team.id,
          cache,
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

  stores.auth.logout();
  return null;
};

export default Auth;
