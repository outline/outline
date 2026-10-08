import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { revokeOAuthAuthenticationActionFactory } from "~/actions/definitions/oauthAuthentications";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  /** The OAuthAuthentication to associate with the menu */
  oauthAuthentication: OAuthAuthentication;
};

function OAuthAuthenticationMenu({ oauthAuthentication }: Props) {
  const { t } = useTranslation();

  const actions = useMemo(
    () => [revokeOAuthAuthenticationActionFactory({ oauthAuthentication })],
    [oauthAuthentication]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Show menu")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(OAuthAuthenticationMenu);
