import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import OAuthClient from "~/models/oauth/OAuthClient";
import OAuthClientDeleteDialog from "~/scenes/Settings/components/OAuthClientDeleteDialog";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import {
  ActionV2Separator,
  createActionV2,
  createInternalLinkActionV2,
} from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";

const Section = "OAuth";

type Props = {
  /** The oauthClient to associate with the menu */
  oauthClient: OAuthClient;
  /** Whether to show the edit button */
  showEdit?: boolean;
};

function OAuthClientMenu({ oauthClient, showEdit }: Props) {
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleDelete = useCallback(() => {
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

  const actions = useMemo(
    () => [
      createInternalLinkActionV2({
        name: `${t("Edit")}…`,
        section: Section,
        visible: showEdit,
        to: settingsPath("applications", oauthClient.id),
      }),
      ActionV2Separator,
      createActionV2({
        name: `${t("Delete")}…`,
        section: Section,
        dangerous: true,
        perform: handleDelete,
      }),
    ],
    [t, showEdit, oauthClient.id, handleDelete]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Show menu")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(OAuthClientMenu);
