// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import { isCustomSubdomain } from "shared/utils/domains";
import LoadingIndicator from "components/LoadingIndicator";
import useStores from "../hooks/useStores";
import env from "env";

type Props = {
  children: React.Node,
};

const Authenticated = ({ children }: Props) => {
  const { auth } = useStores();
  const { i18n } = useTranslation();
  const language = auth.user && auth.user.language;

  // Watching for language changes here as this is the earliest point we have
  // the user available and means we can start loading translations faster
  React.useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  if (auth.authenticated) {
    const { user, team } = auth;
    const { hostname } = window.location;

    if (!team || !user) {
      return <LoadingIndicator />;
    }

    // If we're authenticated but viewing a domain that doesn't match the
    // current team then kick the user to the teams correct domain.
    if (team.domain) {
      if (team.domain !== hostname) {
        window.location.href = `${team.url}${window.location.pathname}`;
        return <LoadingIndicator />;
      }
    } else if (
      env.SUBDOMAINS_ENABLED &&
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
  return <Redirect to="/" />;
};

export default observer(Authenticated);
