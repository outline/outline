import { observer } from "mobx-react";
import { deleteGroup } from "~/actions/definitions/groups";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type Group from "~/models/Group";
import type { Action } from "~/types";

/**
 * The group actions offered in the bulk selection toolbar. These are the same
 * action definitions used by the group menu — they operate on the active
 * models, which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [deleteGroup];

/**
 * Renders the selection toolbar with the bulk actions available for groups.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function GroupSelectionToolbar() {
  const selection = useModelSelection();
  const { groups } = useStores();

  if (!selection) {
    return null;
  }

  const selectedGroups = selection.selectedIds
    .map((id) => groups.get(id))
    .filter((group): group is Group => !!group);

  return (
    <ModelSelectionActionToolbar
      models={selectedGroups}
      actions={toolbarActions}
    />
  );
}

export default observer(GroupSelectionToolbar);
