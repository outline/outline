import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import useStores from "~/hooks/useStores";
import { createActionV2 } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  /** The OAuthAuthentication to associate with the menu */
  oauthAuthentication: OAuthAuthentication;
};

function OAuthAuthenticationMenu({ oauthAuthentication }: Props) {
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleRevoke = useCallback(() => {
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

  const actions = useMemo(
    () => [
      createActionV2({
        name: t("Revoke"),
        section: "OAuth",
        dangerous: true,
        perform: handleRevoke,
      }),
    ],
    [t, handleRevoke]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Show menu")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(OAuthAuthenticationMenu);
