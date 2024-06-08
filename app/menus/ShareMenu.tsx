import { observer } from "mobx-react";
import { ArrowIcon, CopyIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState } from "reakit/Menu";
import { toast } from "sonner";
import Share from "~/models/Share";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import CopyToClipboard from "~/components/CopyToClipboard";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  share: Share;
};

function ShareMenu({ share }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { shares } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(share);

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
        toast.message(t("Share link revoked"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [t, shares, share]
  );

  const handleCopy = React.useCallback(() => {
    toast.success(t("Share link copied"));
  }, [t]);

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
