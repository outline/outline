import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import OAuthClient from "~/models/oauth/OAuthClient";
import OAuthClientDeleteDialog from "~/scenes/Settings/components/OAuthClientDeleteDialog";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";

type Props = {
  /** The oauthClient to associate with the menu */
  oauthClient: OAuthClient;
  /** Whether to show the edit button */
  showEdit?: boolean;
};

function OAuthClientMenu({ oauthClient, showEdit }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleDelete = React.useCallback(() => {
    dialogs.openModal({
      title: t("Delete app"),
      content: (
        <OAuthClientDeleteDialog
          onSubmit={dialogs.closeAllModals}
          oauthClient={oauthClient}
        />
      ),
    });
  }, [t, dialogs, oauthClient]);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu}>
        <Template
          {...menu}
          items={[
            {
              type: "route",
              title: `${t("Edit")}…`,
              visible: showEdit,
              to: settingsPath("applications", oauthClient.id),
            },
            {
              type: "separator",
            },
            {
              type: "button",
              dangerous: true,
              title: `${t("Delete")}…`,
              onClick: handleDelete,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(OAuthClientMenu);
