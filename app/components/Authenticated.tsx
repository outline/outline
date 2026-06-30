import { observer } from "mobx-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { changeLanguage } from "~/utils/language";
import LoadingIndicator from "./LoadingIndicator";

type Props = {
  children: JSX.Element;
};

const Authenticated = ({ children }: Props) => {
  const { auth } = useStores();
  const { i18n } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const language = user?.language;
  const hasLoggedOut = useRef(false);

  // Watching for language changes here as this is the earliest point we might have the user
  // available and means we can start loading translations faster
  useEffect(() => {
    void changeLanguage(language, i18n);
  }, [i18n, language]);

  const shouldLogout = !auth.authenticated && !auth.isFetching;

  // Passive logout when we land here without an authenticated session – note we
  // intentionally do not revoke the server-side token, as that would clobber
  // the session in any other tab that may have already re-authenticated.
  useEffect(() => {
    if (shouldLogout && !hasLoggedOut.current) {
      hasLoggedOut.current = true;
      void auth.logout({
        savePath: true,
        clearCache: false,
        revokeToken: false,
      });
    }
  }, [shouldLogout, auth]);

  useEffect(() => {
    if (auth.logoutRedirectUri) {
      window.location.href = auth.logoutRedirectUri;
    }
  }, [auth.logoutRedirectUri]);

  if (auth.authenticated) {
    return children;
  }

  if (auth.isFetching || auth.logoutRedirectUri) {
    return <LoadingIndicator />;
  }

  return <Redirect to="/" />;
};

export default observer(Authenticated);
