import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type Note from "~/models/Note";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionSeparator } from "~/actions";
import {
  copyLinkToRevisionActionFactory,
  downloadRevisionActionFactory,
  restoreRevision,
} from "~/actions/definitions/revisions";
import { useMemo } from "react";
import { useMenuAction } from "~/hooks/useMenuAction";
import { ActionContextProvider } from "~/hooks/useActionContext";
type Props = {
  note: Note;
  revisionId: string;
};
function RevisionMenu({ note, revisionId }: Props) {
  const { t } = useTranslation();
  const actions = useMemo(
    () => [
      restoreRevision,
      ActionSeparator,
      copyLinkToRevisionActionFactory(revisionId),
      downloadRevisionActionFactory(revisionId),
    ],
    [revisionId]
  );
  const rootAction = useMenuAction(actions);
  return (
    <ActionContextProvider value={{ activeModels: [note] }}>
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
