import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "outline-icons";
import { ActionSeparator, createAction, createRootMenuAction } from "~/actions";
import {
  restoreNote,
  unsubscribeNote,
  subscribeNote,
  restoreNoteToNotebook,
  starNote,
  unstarNote,
  editNote,
  shareNote,
  createNewNote,
  createNewNoteInAlphabeticalNotebook,
  importNote,
  createTemplateFromNote,
  duplicateNote,
  publishNote,
  unpublishNote,
  archiveNote,
  moveNote,
  applyTemplateActionFactory,
  pinNote,
  openNoteComments,
  openNoteHistory,
  openNoteInsights,
  openNoteInDesktop,
  openNoteInSplit,
  downloadNote,
  copyNote,
  presentNote,
  printNote,
  searchInNote,
  deleteNote,
  leaveNote,
  permanentlyDeleteNote,
} from "~/actions/definitions/documents";
import { renameActionFactory } from "~/actions/definitions/common";
import { ActiveNoteSection } from "~/actions/sections";
import useMobile from "./useMobile";
import type Template from "~/models/Template";
import { useTemplateMenuActions } from "./useTemplateMenuActions";
type Props = {
  /** Document ID for which the actions are generated */
  noteId: string;
  /** Invoked when the "Find and replace" menu item is clicked */
  onFindAndReplace?: () => void;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Callback when a template is selected to apply its content to the document */
  onSelectTemplate?: (template: Template) => void;
};
export function useNoteMenuAction({
  noteId,
  onFindAndReplace,
  onRename,
  onSelectTemplate,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const templateMenuActions = useTemplateMenuActions({
    noteId,
    onSelectTemplate,
  });
  return useCallback(
    () =>
      createRootMenuAction([
        restoreNote,
        restoreNoteToNotebook,
        starNote,
        unstarNote,
        subscribeNote,
        unsubscribeNote,
        createAction({
          name: `${t("Find and replace")}…`,
          section: ActiveNoteSection,
          icon: <SearchIcon />,
          visible: !!onFindAndReplace && isMobile,
          perform: () => onFindAndReplace?.(),
        }),
        ActionSeparator,
        editNote,
        renameActionFactory({
          section: ActiveNoteSection,
          modelId: noteId,
          onRename,
        }),
        shareNote,
        createTemplateFromNote,
        duplicateNote,
        publishNote,
        unpublishNote,
        archiveNote,
        moveNote,
        applyTemplateActionFactory({ actions: templateMenuActions }),
        importNote,
        createNewNote,
        createNewNoteInAlphabeticalNotebook,
        pinNote,
        ActionSeparator,
        openNoteComments,
        openNoteHistory,
        openNoteInsights,
        openNoteInSplit,
        openNoteInDesktop,
        presentNote,
        downloadNote,
        copyNote,
        printNote,
        searchInNote,
        ActionSeparator,
        deleteNote,
        permanentlyDeleteNote,
        leaveNote,
      ]),
    [t, isMobile, templateMenuActions, noteId, onFindAndReplace, onRename]
  );
}
