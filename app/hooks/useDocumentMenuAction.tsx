import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "outline-icons";
import { ActionSeparator, createAction, createRootMenuAction } from "~/actions";
import {
  restoreDocument,
  unsubscribeDocument,
  subscribeDocument,
  restoreDocumentToCollection,
  starDocument,
  unstarDocument,
  editDocument,
  shareDocument,
  createNewDocument,
  createNewDocumentInAlphabeticalCollection,
  importDocument,
  createTemplateFromDocument,
  duplicateDocument,
  publishDocument,
  unpublishDocument,
  archiveDocument,
  moveDocument,
  applyTemplateActionFactory,
  pinDocument,
  openDocumentComments,
  openDocumentHistory,
  openDocumentInsights,
  openDocumentInDesktop,
  openDocumentInSplit,
  downloadDocument,
  copyDocument,
  presentDocument,
  printDocument,
  searchInDocument,
  deleteDocument,
  leaveDocument,
  permanentlyDeleteDocument,
  toggleDocumentStats,
} from "~/actions/definitions/documents";
import { renameActionFactory } from "~/actions/definitions/common";
import { ActiveDocumentSection } from "~/actions/sections";
import useMobile from "./useMobile";
import type Template from "~/models/Template";
import { useTemplateMenuActions } from "./useTemplateMenuActions";

type Props = {
  /** Document ID for which the actions are generated */
  documentId: string;
  /** Invoked when the "Find and replace" menu item is clicked */
  onFindAndReplace?: () => void;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Callback when a template is selected to apply its content to the document */
  onSelectTemplate?: (template: Template) => void;
};

export function useDocumentMenuAction({
  documentId,
  onFindAndReplace,
  onRename,
  onSelectTemplate,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();

  const templateMenuActions = useTemplateMenuActions({
    documentId,
    onSelectTemplate,
  });

  return useCallback(
    () =>
      createRootMenuAction([
        restoreDocument,
        restoreDocumentToCollection,
        starDocument,
        unstarDocument,
        subscribeDocument,
        unsubscribeDocument,
        createAction({
          name: `${t("Find and replace")}…`,
          section: ActiveDocumentSection,
          icon: <SearchIcon />,
          visible: !!onFindAndReplace && isMobile,
          perform: () => onFindAndReplace?.(),
        }),
        ActionSeparator,
        editDocument,
        renameActionFactory({
          section: ActiveDocumentSection,
          modelId: documentId,
          onRename,
        }),
        shareDocument,
        createTemplateFromDocument,
        duplicateDocument,
        publishDocument,
        unpublishDocument,
        archiveDocument,
        moveDocument,
        applyTemplateActionFactory({ actions: templateMenuActions }),
        importDocument,
        createNewDocument,
        createNewDocumentInAlphabeticalCollection,
        pinDocument,
        ActionSeparator,
        openDocumentComments,
        openDocumentHistory,
        openDocumentInsights,
        toggleDocumentStats,
        openDocumentInSplit,
        openDocumentInDesktop,
        presentDocument,
        downloadDocument,
        copyDocument,
        printDocument,
        searchInDocument,
        ActionSeparator,
        deleteDocument,
        permanentlyDeleteDocument,
        leaveDocument,
      ]),
    [t, isMobile, templateMenuActions, documentId, onFindAndReplace, onRename]
  );
}
