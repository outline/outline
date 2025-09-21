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
import { useMemo } from "react";
import { useMenuAction } from "~/hooks/useMenuAction";
import { ActionContextProvider } from "~/hooks/useActionContext";

type Props = {
  document: Document;
  revisionId: string;
};

function RevisionMenu({ document }: Props) {
  const { t } = useTranslation();
  const actions = useMemo(
    () => [restoreRevision, ActionV2Separator, copyLinkToRevision],
    []
  );

  const rootAction = useMenuAction(actions);

  return (
    <ActionContextProvider value={{ activeDocumentId: document.id }}>
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("Revision options")}
      >
        <OverflowMenuButton />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(RevisionMenu);
