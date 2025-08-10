import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionV2Separator } from "~/actions";
import {
  copyLinkToRevision,
  restoreRevision,
} from "~/actions/definitions/revisions";
import useActionContext from "~/hooks/useActionContext";
import { useMemo } from "react";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  document: Document;
  revisionId: string;
};

function RevisionMenu({ document }: Props) {
  const { t } = useTranslation();
  const context = useActionContext({
    isContextMenu: true,
    activeDocumentId: document.id,
  });

  const actions = useMemo(
    () => [restoreRevision, ActionV2Separator, copyLinkToRevision],
    []
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu
      action={rootAction}
      context={context}
      align="end"
      ariaLabel={t("Revision options")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(RevisionMenu);
