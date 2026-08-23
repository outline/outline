import { observer } from "mobx-react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type { NavigationNode } from "@shared/types";
import { NotebookPermission } from "@shared/types";
import type Notebook from "~/models/Notebook";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import useStores from "~/hooks/useStores";
import { AuthorizationError } from "~/utils/errors";
type Props = {
  /** The navigation node to move, must represent a note. */
  item: NavigationNode;
  /** The notebook to move the note to. */
  notebook: Notebook;
  /** The parent note to move the note under. */
  parentNoteId?: string | null;
  /** The index to move the note to. */
  index?: number | null;
};
function ConfirmMoveDialog({ notebook, item, ...rest }: Props) {
  const { notes, dialogs, notebooks } = useStores();
  const { t } = useTranslation();
  const prevNotebook = notebooks.get(item.notebookId!);
  const accessMapping: Record<Partial<NotebookPermission> | "null", string> = {
    [NotebookPermission.Admin]: t("manage access"),
    [NotebookPermission.ReadWrite]: t("view and edit access"),
    [NotebookPermission.Read]: t("view only access"),
    null: t("no access"),
  };
  const handleSubmit = async () => {
    try {
      await notes.move({
        noteId: item.id,
        notebookId: notebook.id,
        ...rest,
      });
    } catch (err) {
      if (err instanceof AuthorizationError) {
        toast.error(
          t(
            "You do not have permission to move {{ documentName }} to the {{ notebookName }} notebook",
            {
              noteName: item.title,
              notebookName: notebook.name,
            }
          )
        );
      } else {
        toast.error(errToString(err));
      }
    } finally {
      dialogs.closeAllModals();
    }
  };
  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Move document")}
      savingText={`${t("Moving")}…`}
    >
      <Trans
        defaults="Moving the document <em>{{ title }}</em> to the {{ newNotebookName }} notebook will change permission for all workspace members from <em>{{ prevPermission }}</em> to <em>{{ newPermission }}</em>."
        values={{
          title: item.title,
          prevNotebookName: prevNotebook?.name,
          newNotebookName: notebook.name,
          prevPermission: accessMapping[prevNotebook?.permission || "null"],
          newPermission: accessMapping[notebook.permission || "null"],
        }}
        components={{
          em: <strong />,
        }}
      />
    </ConfirmationDialog>
  );
}
export default observer(ConfirmMoveDialog);
