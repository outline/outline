// @flow
import { observer } from "mobx-react";
import HistoryIcon from "outline-icons/lib/components/HistoryIcon";
import LinkIcon from "outline-icons/lib/components/LinkIcon";
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
import MenuIconWrapper from "components/MenuIconWrapper";
import useToasts from "hooks/useToasts";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  revision: Revision,
  iconColor?: string,
  className?: string,
|};

function RevisionMenu({ document, revision, className, iconColor }: Props) {
  const { showToast } = useToasts();
  const menu = useMenuState({ modal: true });
  const { t } = useTranslation();
  const history = useHistory();

  const handleRestore = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      await document.restore({ revisionId: revision.id });
      showToast(t("Document restored"), { type: "success" });
      history.push(document.url);
    },
    [history, showToast, t, document, revision]
  );

  const handleCopy = React.useCallback(() => {
    showToast(t("Link copied"), { type: "info" });
  }, [showToast, t]);

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
          <MenuIconWrapper>
            <HistoryIcon />
          </MenuIconWrapper>
          {t("Restore version")}
        </MenuItem>
        <Separator />
        <CopyToClipboard text={url} onCopy={handleCopy}>
          <MenuItem {...menu}>
            <MenuIconWrapper>
              <LinkIcon />
            </MenuIconWrapper>
            {t("Copy link")}
          </MenuItem>
        </CopyToClipboard>
      </ContextMenu>
    </>
  );
}

export default observer(RevisionMenu);
