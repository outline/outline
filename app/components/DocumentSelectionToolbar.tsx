import { observer } from "mobx-react";
import * as React from "react";
import { performAction, resolve } from "~/actions";
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
import type { ModelSelection } from "~/components/ModelSelection";
import { useModelSelection } from "~/components/ModelSelectionContext";
import type { ModelSelectionAction } from "~/components/ModelSelectionToolbar";
import ModelSelectionToolbar from "~/components/ModelSelectionToolbar";
import { ActionContext, ActionContextProvider } from "~/hooks/useActionContext";
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
 * Renders the selection toolbar with the standard document actions, feeding the
 * selected documents in as the active models so the shared action definitions
 * operate on the whole selection.
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
    <ActionContextProvider
      value={{ activeModels: selectedDocuments, isButton: true }}
    >
      <Toolbar selection={selection} />
    </ActionContextProvider>
  );
}

const Toolbar = observer(function Toolbar_({
  selection,
}: {
  selection: ModelSelection;
}) {
  const { dialogs } = useStores();
  const context = React.useContext(ActionContext);
  if (!context) {
    return null;
  }

  const actions: ModelSelectionAction[] = toolbarActions.map((action) => ({
    key: action.id,
    label: resolve<string>(action.name, context),
    icon: resolve<React.ReactNode>(action.icon, context),
    dangerous: action.dangerous,
    visible: action.visible ? resolve<boolean>(action.visible, context) : true,
    perform: async () => {
      const openModals = dialogs.modalStack.size;
      await performAction(action, context);

      // `openModal` adds to the stack on a macrotask, so wait one before
      // checking (its timer, scheduled first, runs before ours). If the action
      // opened a dialog, leave the selection alone — cancelling keeps it and it
      // clears once the documents leave the list on confirm; otherwise the
      // action completed inline, so clear it.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
      if (dialogs.modalStack.size <= openModals) {
        selection.clear();
      }
    },
  }));

  return <ModelSelectionToolbar selection={selection} actions={actions} />;
});

export default observer(DocumentSelectionToolbar);
