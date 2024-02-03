import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ApiKey from "~/models/ApiKey";
import ApiKeyRevokeDialog from "~/scenes/Settings/components/ApiKeyRevokeDialog";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import useStores from "~/hooks/useStores";

type Props = {
  /** The apiKey to associate with the menu */
  apiKey: ApiKey;
};

function ApiKeyMenu({ apiKey }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleRevoke = React.useCallback(() => {
    dialogs.openModal({
      title: t("Revoke token"),
      content: (
        <ApiKeyRevokeDialog onSubmit={dialogs.closeAllModals} apiKey={apiKey} />
      ),
    });
  }, [t, dialogs, apiKey]);

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

export default observer(ApiKeyMenu);
