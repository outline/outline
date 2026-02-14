import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { InputIcon, SearchIcon } from "outline-icons";
import { ActionSeparator, createAction } from "~/actions";
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
  importDocument,
  createTemplateFromDocument,
  duplicateDocument,
  publishDocument,
  unpublishDocument,
  archiveDocument,
  moveDocument,
  moveTemplate,
  applyTemplateFactory,
  pinDocument,
  createDocumentFromTemplate,
  openDocumentComments,
  openDocumentHistory,
  openDocumentInsights,
  downloadDocument,
  copyDocument,
  printDocument,
  searchInDocument,
  deleteDocument,
  leaveDocument,
  permanentlyDeleteDocument,
} from "~/actions/definitions/documents";
import { ActiveDocumentSection } from "~/actions/sections";
import useMobile from "./useMobile";
import type Document from "~/models/Document";
import usePolicy from "./usePolicy";
import useCurrentUser from "./useCurrentUser";
import { useTemplateMenuActions } from "./useTemplateMenuActions";
import { useMenuAction } from "./useMenuAction";

type Props = {
  /** Document ID for which the actions are generated */
  documentId: string;
  /** Invoked when the "Find and replace" menu item is clicked */
  onFindAndReplace?: () => void;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Callback when a template is selected to apply its content to the document */
  onSelectTemplate?: (template: Document) => void;
};

export function useDocumentMenuAction({
  documentId,
  onFindAndReplace,
  onRename,
  onSelectTemplate,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const user = useCurrentUser();
  const can = usePolicy(documentId);

  const templateMenuActions = useTemplateMenuActions({
    documentId,
    onSelectTemplate,
  });

  const actions = useMemo(
    () => [
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
      createAction({
        name: `${t("Rename")}…`,
        section: ActiveDocumentSection,
        icon: <InputIcon />,
        visible: !!can.update && !user.separateEditMode && !!onRename,
        perform: () => requestAnimationFrame(() => onRename?.()),
      }),
      shareDocument,
      createTemplateFromDocument,
      duplicateDocument,
      publishDocument,
      unpublishDocument,
      archiveDocument,
      moveDocument,
      moveTemplate,
      applyTemplateFactory({ actions: templateMenuActions }),
      importDocument,
      createNewDocument,
      pinDocument,
      createDocumentFromTemplate,
      ActionSeparator,
      openDocumentComments,
      openDocumentHistory,
      openDocumentInsights,
      downloadDocument,
      copyDocument,
      printDocument,
      searchInDocument,
      ActionSeparator,
      deleteDocument,
      permanentlyDeleteDocument,
      leaveDocument,
    ],
    [
      t,
      isMobile,
      templateMenuActions,
      can.update,
      user.separateEditMode,
      onFindAndReplace,
      onRename,
    ]
  );

  return useMenuAction(actions);
}
