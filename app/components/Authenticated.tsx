import { observer } from "mobx-react";
import { useEffect } from "react";
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

  // Watching for language changes here as this is the earliest point we might have the user
  // available and means we can start loading translations faster
  useEffect(() => {
    void changeLanguage(language, i18n);
  }, [i18n, language]);

  if (auth.authenticated) {
    return children;
  }

  if (auth.isFetching) {
    return <LoadingIndicator />;
  }

  void auth.logout(true);
  return <Redirect to="/" />;
};

export default observer(Authenticated);
