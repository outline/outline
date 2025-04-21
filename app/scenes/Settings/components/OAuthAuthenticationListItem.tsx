import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";

type Props = {
  /** The OAuthAuthentication to display */
  oauthAuthentication: OAuthAuthentication;
};

const OAuthAuthenticationListItem = ({ oauthAuthentication }: Props) => {
  const { t } = useTranslation();

  const subtitle = (
    <>
      {oauthAuthentication.lastActiveAt && (
        <Text type="tertiary">
          {t("Last accessed")}{" "}
          <Time dateTime={oauthAuthentication.lastActiveAt} addSuffix />{" "}
          &middot;{" "}
        </Text>
      )}
      {oauthAuthentication.scope.join(", ")}
    </>
  );

  return (
    <ListItem
      key={oauthAuthentication.id}
      title={oauthAuthentication.oauthClient.name}
      subtitle={subtitle}
    />
  );
};

export default observer(OAuthAuthenticationListItem);
