import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import OAuthClient from "~/models/OAuthClient";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import OAuthClientMenu from "~/menus/OAuthClientMenu";

type Props = {
  oauthClient: OAuthClient;
};

const OAuthClientListItem = ({ oauthClient }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const subtitle = (
    <>
      <Text type="tertiary">
        {t(`Created`)} <Time dateTime={oauthClient.createdAt} addSuffix />{" "}
        {oauthClient.createdById === user.id
          ? ""
          : t(`by {{ name }}`, { name: user.name })}
      </Text>
    </>
  );

  return (
    <ListItem
      key={oauthClient.id}
      title={oauthClient.name}
      subtitle={subtitle}
      actions={<OAuthClientMenu oauthClient={oauthClient} />}
    />
  );
};

export default observer(OAuthClientListItem);
