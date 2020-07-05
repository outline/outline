// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import AuthStore from "stores/AuthStore";
import LoadingIndicator from "components/LoadingIndicator";
import { isCustomSubdomain } from "shared/utils/domains";

type Props = {
  auth: AuthStore,
  children?: React.Node,
};

const Authenticated = observer(({ auth, children }: Props) => {
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

    return children;
  }

  auth.logout(true);
  return null;
});

export default inject("auth")(Authenticated);
