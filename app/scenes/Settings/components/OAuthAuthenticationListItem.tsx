import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import { OAuthScopeHelper } from "~/scenes/Login/OAuthScopeHelper";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { AvatarVariant } from "~/components/Avatar/Avatar";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
import OAuthAuthenticationMenu from "~/menus/OAuthAuthenticationMenu";

type Props = {
  /** The OAuthAuthentication to display */
  oauthAuthentication: OAuthAuthentication;
};

const OAuthAuthenticationListItem = ({ oauthAuthentication }: Props) => {
  const { t } = useTranslation();

  const subtitle = (
    <>
      <Text type="tertiary">
        {oauthAuthentication.lastActiveAt ? (
          <>
            {t("Last active")}{" "}
            <Time dateTime={oauthAuthentication.lastActiveAt} addSuffix />
          </>
        ) : (
          t("Never used")
        )}{" "}
        &middot;{" "}
      </Text>
      <Text type="tertiary" ellipsis>
        {OAuthScopeHelper.normalizeScopes(oauthAuthentication.scope, t).join(
          ", "
        )}
      </Text>
    </>
  );

  return (
    <ListItem
      key={oauthAuthentication.id}
      image={
        <Avatar
          model={oauthAuthentication.oauthClient}
          size={AvatarSize.Large}
          variant={AvatarVariant.Square}
        />
      }
      title={oauthAuthentication.oauthClient.name}
      subtitle={subtitle}
      actions={
        <OAuthAuthenticationMenu oauthAuthentication={oauthAuthentication} />
      }
    />
  );
};

export default observer(OAuthAuthenticationListItem);
