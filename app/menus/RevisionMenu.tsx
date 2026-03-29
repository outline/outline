import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionSeparator } from "~/actions";
import {
  copyLinkToRevision,
  downloadRevision,
  restoreRevision,
} from "~/actions/definitions/revisions";
import { useMemo } from "react";
import { useMenuAction } from "~/hooks/useMenuAction";
import { ActionContextProvider } from "~/hooks/useActionContext";

type Props = {
  document: Document;
  revisionId: string;
};

function RevisionMenu({ document, revisionId }: Props) {
  const { t } = useTranslation();
  const actions = useMemo(
    () => [
      restoreRevision,
      ActionSeparator,
      copyLinkToRevision(revisionId),
      downloadRevision(revisionId),
    ],
    [revisionId]
  );

  const rootAction = useMenuAction(actions);

  return (
    <ActionContextProvider value={{ activeModels: [document] }}>
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
