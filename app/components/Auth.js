// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import AuthStore from 'stores/AuthStore';
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

    if (window.Bugsnag) {
      Bugsnag.user = {
        id: user.id,
        name: user.name,
        teamId: team.id,
        team: team.name,
      };
    }

    // TODO:
    authenticatedStores.collections.fetchPage({ limit: 100 });

    return children;
  }

  auth.logout();
  return null;
});

export default inject('auth')(Auth);
