import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { InputIcon, SearchIcon } from "outline-icons";
import { ActionV2Separator, createActionV2 } from "~/actions";
import {
  restoreDocument,
  unsubscribeDocument,
  subscribeDocument,
  restoreDocumentToCollection,
  starDocument,
  unstarDocument,
  editDocument,
  shareDocument,
  createNestedDocument,
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
import Document from "~/models/Document";
import usePolicy from "./usePolicy";
import useCurrentUser from "./useCurrentUser";
import { useTemplateMenuActions } from "./useTemplateMenuActions";
import { useMenuAction } from "./useMenuAction";

type Props = {
  /** Document for which the actions are generated */
  document: Document;
  /** Invoked when the "Find and replace" menu item is clicked */
  onFindAndReplace?: () => void;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Callback when a template is selected to apply its content to the document */
  onSelectTemplate?: (template: Document) => void;
};

export function useDocumentMenuAction({
  document,
  onFindAndReplace,
  onRename,
  onSelectTemplate,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const user = useCurrentUser();

  const can = usePolicy(document);

  const templateMenuActions = useTemplateMenuActions({
    document,
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
      createActionV2({
        name: `${t("Find and replace")}…`,
        section: ActiveDocumentSection,
        icon: <SearchIcon />,
        visible: !!onFindAndReplace && isMobile,
        perform: () => onFindAndReplace?.(),
      }),
      ActionV2Separator,
      editDocument,
      createActionV2({
        name: `${t("Rename")}…`,
        section: ActiveDocumentSection,
        icon: <InputIcon />,
        visible: !!can.update && !user.separateEditMode && !!onRename,
        perform: () => requestAnimationFrame(() => onRename?.()),
      }),
      shareDocument,
      createNestedDocument,
      importDocument,
      createTemplateFromDocument,
      duplicateDocument,
      publishDocument,
      unpublishDocument,
      archiveDocument,
      moveDocument,
      moveTemplate,
      applyTemplateFactory({ actions: templateMenuActions }),
      pinDocument,
      createDocumentFromTemplate,
      ActionV2Separator,
      openDocumentComments,
      openDocumentHistory,
      openDocumentInsights,
      downloadDocument,
      copyDocument,
      printDocument,
      searchInDocument,
      ActionV2Separator,
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
