// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState } from "reakit/Menu";
import Share from "models/Share";
import ContextMenu from "components/ContextMenu";
import MenuItem from "components/ContextMenu/MenuItem";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import CopyToClipboard from "components/CopyToClipboard";
import useStores from "hooks/useStores";

type Props = {
  share: Share,
};

function ShareMenu({ share }: Props) {
  const menu = useMenuState({ modal: true });
  const { ui, shares, policies } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = policies.abilities(share.id);

  const handleGoToDocument = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      history.push(share.documentUrl);
    },
    [history, share]
  );

  const handleRevoke = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();

      try {
        await shares.revoke(share);
        ui.showToast(t("Share link revoked"), { type: "info" });
      } catch (err) {
        ui.showToast(err.message, { type: "error" });
      }
    },
    [t, shares, share, ui]
  );

  const handleCopy = React.useCallback(() => {
    ui.showToast(t("Share link copied"), { type: "info" });
  }, [t, ui]);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Share options")}>
        <CopyToClipboard text={share.url} onCopy={handleCopy}>
          <MenuItem {...menu}>{t("Copy link")}</MenuItem>
        </CopyToClipboard>
        <MenuItem {...menu} onClick={handleGoToDocument}>
          {t("Go to document")}
        </MenuItem>
        {can.revoke && (
          <>
            <hr />
            <MenuItem {...menu} onClick={handleRevoke}>
              {t("Revoke link")}
            </MenuItem>
          </>
        )}
      </ContextMenu>
    </>
  );
}

export default observer(ShareMenu);
