import { observer } from "mobx-react";
import {
  archiveDocument,
  deleteDocument,
  pinDocumentToCollection,
  restoreDocument,
  starDocument,
  unpinDocument,
  unpublishDocument,
  unstarDocument,
} from "~/actions/definitions/documents";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";
import type { Action } from "~/types";

/**
 * The document actions offered in the bulk selection toolbar. These are the
 * same action definitions used by document menus — they operate on the active
 * models, which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [
  starDocument,
  unstarDocument,
  pinDocumentToCollection,
  unpinDocument,
  archiveDocument,
  unpublishDocument,
  restoreDocument,
  deleteDocument,
];

/**
 * Renders the selection toolbar with the standard document actions.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function DocumentSelectionToolbar() {
  const selection = useModelSelection();
  const { documents } = useStores();

  if (!selection) {
    return null;
  }

  const selectedDocuments = selection.selectedIds
    .map((id) => documents.get(id))
    .filter((document): document is Document => !!document);

  return (
    <ModelSelectionActionToolbar
      models={selectedDocuments}
      actions={toolbarActions}
    />
  );
}

export default observer(DocumentSelectionToolbar);
