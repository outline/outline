import { observer } from "mobx-react";
import * as React from "react";
import { performAction, resolve } from "~/actions";
import type { ModelSelection } from "~/components/ModelSelection";
import { useModelSelection } from "~/components/ModelSelectionContext";
import type { ModelSelectionAction } from "~/components/ModelSelectionToolbar";
import ModelSelectionToolbar from "~/components/ModelSelectionToolbar";
import { ActionContext, ActionContextProvider } from "~/hooks/useActionContext";
import useStores from "~/hooks/useStores";
import type Model from "~/models/base/Model";
import type { Action } from "~/types";

type Props = {
  /** The models the actions should operate on, usually the current selection. */
  models: Model[];
  /** The action definitions offered for the selection. */
  actions: Action[];
};

/**
 * Renders the bulk selection toolbar for the given action definitions, feeding
 * the selected models in as the active models so that the same definitions used
 * by menus operate on the whole selection.
 *
 * @param props The component props.
 * @returns the toolbar element, or null when no list selection is in scope.
 */
export function ModelSelectionActionToolbar({ models, actions }: Props) {
  const selection = useModelSelection();

  if (!selection) {
    return null;
  }

  return (
    <ActionContextProvider value={{ activeModels: models, isButton: true }}>
      <Toolbar selection={selection} actions={actions} />
    </ActionContextProvider>
  );
}

const Toolbar = observer(function Toolbar_({
  selection,
  actions,
}: {
  selection: ModelSelection;
  actions: Action[];
}) {
  const { dialogs } = useStores();
  const context = React.useContext(ActionContext);
  if (!context) {
    return null;
  }

  const toolbarActions: ModelSelectionAction[] = actions.map((action) => ({
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
      // clears once the models leave the list on confirm; otherwise the action
      // completed inline, so clear it.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
      if (dialogs.modalStack.size <= openModals) {
        selection.clear();
      }
    },
  }));

  return (
    <ModelSelectionToolbar selection={selection} actions={toolbarActions} />
  );
});
