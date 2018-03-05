// @flow
import React from 'react';
import { Provider } from 'mobx-react';
import stores from 'stores';
import ApiKeysStore from 'stores/ApiKeysStore';
import UsersStore from 'stores/UsersStore';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import CacheStore from 'stores/CacheStore';

type Props = {
  children?: React.Element<any>,
};

let authenticatedStores;

const Auth = ({ children }: Props) => {
  if (stores.auth.authenticated && stores.auth.team && stores.auth.user) {
    // Only initialize stores once. Kept in global scope because otherwise they
    // will get overridden on route change
    if (!authenticatedStores) {
      // Stores for authenticated user
      const { user, team } = stores.auth;
      const cache = new CacheStore(user.id);
      authenticatedStores = {
        apiKeys: new ApiKeysStore(),
        users: new UsersStore(),
        documents: new DocumentsStore({
          ui: stores.ui,
          cache,
        }),
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

      stores.auth.fetch();
      authenticatedStores.collections.fetchPage({ limit: 100 });
    }

    return <Provider {...authenticatedStores}>{children}</Provider>;
  }

  stores.auth.logout();
  return null;
};

export default Auth;
