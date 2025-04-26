import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import OAuthClient from "~/models/oauth/OAuthClient";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { AvatarVariant } from "~/components/Avatar/Avatar";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import OAuthClientMenu from "~/menus/OAuthClientMenu";
import { settingsPath } from "~/utils/routeHelpers";

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
      image={
        <Avatar
          model={oauthClient}
          size={AvatarSize.Large}
          variant={AvatarVariant.Square}
        />
      }
      title={
        <Link to={settingsPath("applications", oauthClient.id)}>
          <Text>{oauthClient.name}</Text>
        </Link>
      }
      subtitle={subtitle}
      actions={<OAuthClientMenu oauthClient={oauthClient} />}
    />
  );
};

export default observer(OAuthClientListItem);
