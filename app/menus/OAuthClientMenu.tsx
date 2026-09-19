import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type OAuthClient from "~/models/oauth/OAuthClient";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionSeparator } from "~/actions";
import {
  deleteOAuthClientActionFactory,
  editOAuthClientActionFactory,
} from "~/actions/definitions/oauthClients";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  /** The oauthClient to associate with the menu */
  oauthClient: OAuthClient;
  /** Whether to show the edit button */
  showEdit?: boolean;
};

function OAuthClientMenu({ oauthClient, showEdit }: Props) {
  const { t } = useTranslation();

  const actions = useMemo(
    () => [
      editOAuthClientActionFactory({ oauthClient, visible: showEdit }),
      ActionSeparator,
      deleteOAuthClientActionFactory({ oauthClient }),
    ],
    [oauthClient, showEdit]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Show menu")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(OAuthClientMenu);
