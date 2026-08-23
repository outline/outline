import { useMemo } from "react";
import { useMenuAction } from "./useMenuAction";
import { ActionSeparator } from "~/actions";
import {
  deleteNotebook,
  duplicateNotebook,
  editNotebook,
  editNotebookPermissions,
  starNotebook,
  unstarNotebook,
  searchInNotebook,
  createTemplate,
  archiveNotebook,
  restoreNotebook,
  subscribeNotebook,
  unsubscribeNotebook,
  createNote,
  exportNotebook,
  importNote,
  openNotebookInSplit,
  sortNotebook,
} from "~/actions/definitions/notebooks";
import { renameActionFactory } from "~/actions/definitions/common";
import { ActiveNotebookSection } from "~/actions/sections";
type Props = {
  /** Notebook ID for which the actions are generated */
  notebookId: string;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
};
export function useNotebookMenuAction({ notebookId, onRename }: Props) {
  const actions = useMemo(
    () => [
      restoreNotebook,
      starNotebook,
      unstarNotebook,
      subscribeNotebook,
      unsubscribeNotebook,
      ActionSeparator,
      createNote,
      importNote,
      ActionSeparator,
      renameActionFactory({
        section: ActiveNotebookSection,
        modelId: notebookId,
        onRename,
      }),
      editNotebook,
      editNotebookPermissions,
      createTemplate,
      duplicateNotebook,
      sortNotebook,
      exportNotebook,
      archiveNotebook,
      openNotebookInSplit,
      searchInNotebook,
      ActionSeparator,
      deleteNotebook,
    ],
    [notebookId, onRename]
  );
  return useMenuAction(actions);
}
