import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import useStores from "~/hooks/useStores";

type Props = {
  /** The OAuthAuthentication to associate with the menu */
  oauthAuthentication: OAuthAuthentication;
};

function OAuthAuthenticationMenu({ oauthAuthentication }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleRevoke = React.useCallback(() => {
    dialogs.openModal({
      title: t("Revoke {{ appName }}", {
        appName: oauthAuthentication.oauthClient.name,
      }),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            await oauthAuthentication.deleteAll();
            dialogs.closeAllModals();
          }}
          submitText={t("Revoke")}
          savingText={`${t("Revoking")}…`}
          danger
        >
          {t("Are you sure you want to revoke access?")}
        </ConfirmationDialog>
      ),
    });
  }, [t, dialogs, oauthAuthentication]);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu}>
        <MenuItem {...menu} onClick={handleRevoke} dangerous>
          {t("Revoke")}
        </MenuItem>
      </ContextMenu>
    </>
  );
}

export default observer(OAuthAuthenticationMenu);
