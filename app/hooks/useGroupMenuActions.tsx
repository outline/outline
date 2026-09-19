import { useMemo } from "react";
import { ActionSeparator } from "~/actions";
import {
  deleteGroup,
  editGroup,
  groupExternalId,
  groupMembers,
  groupProviderExternalId,
} from "~/actions/definitions/groups";
import { useMenuAction } from "~/hooks/useMenuAction";

interface Options {
  /** Whether to hide the "Members" navigation action. */
  hideMembers?: boolean;
}

/**
 * Hook that constructs the action menu for group management operations. The
 * group is read from the active models in the action context.
 *
 * @param options - optional configuration for the menu.
 * @returns action with children for use in menus.
 */
export function useGroupMenuActions(options?: Options) {
  const actions = useMemo(
    () => [
      ...(options?.hideMembers ? [] : [groupMembers, ActionSeparator]),
      editGroup,
      deleteGroup,
      ActionSeparator,
      groupExternalId,
      groupProviderExternalId,
    ],
    [options?.hideMembers]
  );

  return useMenuAction(actions);
}
