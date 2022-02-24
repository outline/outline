import { observer } from "mobx-react";
import { ArrowIcon, CopyIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState } from "reakit/Menu";
import Share from "~/models/Share";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import CopyToClipboard from "~/components/CopyToClipboard";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  share: Share;
};

function ShareMenu({ share }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { shares } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(share.id);

  const handleGoToDocument = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      history.push(share.documentUrl);
    },
    [history, share]
  );

  const handleRevoke = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      try {
        await shares.revoke(share);
        showToast(t("Share link revoked"), {
          type: "info",
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [t, shares, share, showToast]
  );

  const handleCopy = React.useCallback(() => {
    showToast(t("Share link copied"), {
      type: "info",
    });
  }, [t, showToast]);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Share options")}>
        <CopyToClipboard text={share.url} onCopy={handleCopy}>
          <MenuItem {...menu} icon={<CopyIcon />}>
            {t("Copy link")}
          </MenuItem>
        </CopyToClipboard>
        <MenuItem {...menu} onClick={handleGoToDocument} icon={<ArrowIcon />}>
          {t("Go to document")}
        </MenuItem>
        {can.revoke && (
          <>
            <hr />
            <MenuItem
              {...menu}
              onClick={handleRevoke}
              icon={<TrashIcon />}
              dangerous
            >
              {t("Revoke link")}
            </MenuItem>
          </>
        )}
      </ContextMenu>
    </>
  );
}

export default observer(ShareMenu);
