import { observer } from "mobx-react";
import { RestoreIcon, LinkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState } from "reakit/Menu";
import Document from "~/models/Document";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Separator from "~/components/ContextMenu/Separator";
import CopyToClipboard from "~/components/CopyToClipboard";
import MenuIconWrapper from "~/components/MenuIconWrapper";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useToasts from "~/hooks/useToasts";
import { documentHistoryUrl } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  revisionId: string;
  className?: string;
};

function RevisionMenu({ document, revisionId, className }: Props) {
  const { showToast } = useToasts();
  const team = useCurrentTeam();
  const menu = useMenuState({
    modal: true,
  });
  const { t } = useTranslation();
  const history = useHistory();

  const handleRestore = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      if (team.collaborativeEditing) {
        history.push(document.url, {
          restore: true,
          revisionId,
        });
      } else {
        await document.restore({
          revisionId,
        });
        showToast(t("Document restored"), {
          type: "success",
        });
        history.push(document.url);
      }
    },
    [history, showToast, t, team.collaborativeEditing, document, revisionId]
  );

  const handleCopy = React.useCallback(() => {
    showToast(t("Link copied"), {
      type: "info",
    });
  }, [showToast, t]);

  const url = `${window.location.origin}${documentHistoryUrl(
    document,
    revisionId
  )}`;

  return (
    <>
      <OverflowMenuButton
        className={className}
        iconColor="currentColor"
        aria-label={t("Show menu")}
        {...menu}
      />
      <ContextMenu {...menu} aria-label={t("Revision options")}>
        <MenuItem {...menu} onClick={handleRestore}>
          <MenuIconWrapper>
            <RestoreIcon />
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
