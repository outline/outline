import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import OAuthClient from "~/models/OAuthClient";
import OAuthClientDeleteDialog from "~/scenes/Settings/components/OAuthClientDeleteDialog";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import { OAuthClientEdit } from "~/components/OAuthClient/OAuthClientEdit";
import useStores from "~/hooks/useStores";

type Props = {
  /** The oauthClient to associate with the menu */
  oauthClient: OAuthClient;
};

function OAuthClientMenu({ oauthClient }: Props) {
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

  const handleEdit = React.useCallback(() => {
    dialogs.openModal({
      title: t("Edit Application"),
      content: (
        <OAuthClientEdit
          onSubmit={dialogs.closeAllModals}
          oauthClientId={oauthClient.id}
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
              type: "button",
              title: `${t("Edit")}…`,
              onClick: handleEdit,
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
