import { observer } from "mobx-react";
import { removeGroupUser } from "~/actions/definitions/groupUsers";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type Group from "~/models/Group";
import type User from "~/models/User";
import type { Action } from "~/types";

/**
 * The group member actions offered in the bulk selection toolbar. These are the
 * same action definitions used by the group member menu — they operate on the
 * active models, which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [removeGroupUser];

type Props = {
  /** The group the selected members belong to. */
  group: Group;
};

/**
 * Renders the selection toolbar with the bulk actions available for the members
 * of a group.
 *
 * @param props The component props.
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function GroupMemberSelectionToolbar({ group }: Props) {
  const selection = useModelSelection();
  const { users } = useStores();

  if (!selection) {
    return null;
  }

  const selectedUsers = selection.selectedIds
    .map((id) => users.get(id))
    .filter((user): user is User => !!user);

  return (
    <ModelSelectionActionToolbar
      models={[group, ...selectedUsers]}
      actions={toolbarActions}
    />
  );
}

export default observer(GroupMemberSelectionToolbar);
