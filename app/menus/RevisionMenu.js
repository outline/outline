// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState } from "reakit/Menu";
import Document from "models/Document";
import Revision from "models/Revision";
import ContextMenu from "components/ContextMenu";
import MenuItem from "components/ContextMenu/MenuItem";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Separator from "components/ContextMenu/Separator";
import CopyToClipboard from "components/CopyToClipboard";
import useStores from "hooks/useStores";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  revision: Revision,
  iconColor?: string,
  className?: string,
|};

function RevisionMenu({ document, revision, className, iconColor }: Props) {
  const { ui } = useStores();
  const menu = useMenuState({ modal: true });
  const { t } = useTranslation();
  const history = useHistory();

  const handleRestore = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      await document.restore({ revisionId: revision.id });
      ui.showToast(t("Document restored"), { type: "success" });
      history.push(document.url);
    },
    [history, ui, t, document, revision]
  );

  const handleCopy = React.useCallback(() => {
    ui.showToast(t("Link copied"), { type: "info" });
  }, [ui, t]);

  const url = `${window.location.origin}${documentHistoryUrl(
    document,
    revision.id
  )}`;

  return (
    <>
      <OverflowMenuButton
        className={className}
        iconColor={iconColor}
        aria-label={t("Show menu")}
        {...menu}
      />
      <ContextMenu {...menu} aria-label={t("Revision options")}>
        <MenuItem {...menu} onClick={handleRestore}>
          {t("Restore version")}
        </MenuItem>
        <Separator />
        <CopyToClipboard text={url} onCopy={handleCopy}>
          <MenuItem {...menu}>{t("Copy link")}</MenuItem>
        </CopyToClipboard>
      </ContextMenu>
    </>
  );
}

export default observer(RevisionMenu);
