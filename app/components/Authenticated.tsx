import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import LoadingIndicator from "~/components/LoadingIndicator";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { changeLanguage } from "~/utils/language";

type Props = {
  children: JSX.Element;
};

const Authenticated = ({ children }: Props) => {
  const { auth } = useStores();
  const { i18n } = useTranslation();
  const language = auth.user?.language;

  // Watching for language changes here as this is the earliest point we have
  // the user available and means we can start loading translations faster
  React.useEffect(() => {
    changeLanguage(language, i18n);
  }, [i18n, language]);

  if (auth.authenticated) {
    const { user, team } = auth;

    if (!team || !user) {
      return <LoadingIndicator />;
    }

    return children;
  }

  auth.logout(true);

  if (auth.oidcRedirectLogout) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.location =
      auth.oidcRedirectLogout + "&post_logout_redirect_uri=" + env.URL;
    return null;
  } else {
    return <Redirect to="/" />;
  }
};

export default observer(Authenticated);
