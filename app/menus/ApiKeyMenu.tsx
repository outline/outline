import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ApiKey from "~/models/ApiKey";
import TokenRevokeDialog from "~/scenes/Settings/components/TokenRevokeDialog";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import useStores from "~/hooks/useStores";

type Props = {
  /** The apiKey to associate with the menu */
  token: ApiKey;
  /** CSS class name */
  className?: string;
};

function ApiKeyMenu({ token, className }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleRevoke = React.useCallback(() => {
    dialogs.openModal({
      title: t("Revoke token"),
      isCentered: true,
      content: (
        <TokenRevokeDialog onSubmit={dialogs.closeAllModals} token={token} />
      ),
    });
  }, [t, dialogs, token]);

  return (
    <>
      <OverflowMenuButton
        aria-label={t("Show menu")}
        className={className}
        {...menu}
      />
      <ContextMenu {...menu}>
        <MenuItem {...menu} onClick={handleRevoke} dangerous>
          {t("Revoke")}
        </MenuItem>
      </ContextMenu>
    </>
  );
}

export default observer(ApiKeyMenu);
