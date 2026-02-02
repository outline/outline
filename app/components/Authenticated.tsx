import { observer } from "mobx-react";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
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

  // Watching for language changes here as this is the earliest point we might have the user
  // available and means we can start loading translations faster
  // Only change language if it's different from current i18n language to avoid conflicts
  useEffect(() => {
    if (!language) {
      return;
    }

    const currentLanguage = i18n.language;
    const languageBCP = unicodeCLDRtoBCP47(language);

    // Only change language if it's actually different from current
    // This prevents conflicts when user manually changes language in settings
    // Add a small delay to avoid race conditions with manual language changes
    const timeoutId = setTimeout(() => {
      if (currentLanguage !== languageBCP) {
        void changeLanguage(language, i18n);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [i18n, language]);

  // Retry fetching auth if not authenticated and not currently fetching
  // This is important after redirects when cookies might not be immediately available
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!auth.authenticated && !auth.isFetching && retryCount < maxRetries) {
      // Give increasing delays to allow cookies to be set after redirect
      const delay = 100 * (retryCount + 1);
      const timeout = setTimeout(() => {
        void auth.fetchAuth();
        setRetryCount((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [auth.authenticated, auth.isFetching, auth, retryCount]);

  if (auth.authenticated) {
    return children;
  }

  if (auth.isFetching) {
    return <LoadingIndicator />;
  }

  // Only logout if we've exhausted all retry attempts
  if (retryCount >= maxRetries) {
    void auth.logout({ savePath: true });

    if (auth.logoutRedirectUri) {
      window.location.href = auth.logoutRedirectUri;
      return null;
    }
    return <Redirect to="/" />;
  }

  return <LoadingIndicator />;
};

export default observer(Authenticated);
