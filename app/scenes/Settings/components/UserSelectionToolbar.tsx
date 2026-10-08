import { observer } from "mobx-react";
import {
  activateUser,
  deleteUser,
  resendInvite,
  revokeInvite,
  suspendUser,
} from "~/actions/definitions/users";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type User from "~/models/User";
import type { Action } from "~/types";

/**
 * The user actions offered in the bulk selection toolbar. These are the same
 * action definitions used by the user menu — they operate on the active models,
 * which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [
  resendInvite,
  activateUser,
  suspendUser,
  revokeInvite,
  deleteUser,
];

/**
 * Renders the selection toolbar with the bulk actions available for users.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function UserSelectionToolbar() {
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
      models={selectedUsers}
      actions={toolbarActions}
    />
  );
}

export default observer(UserSelectionToolbar);
