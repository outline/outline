import { useMemo } from "react";
import { ActionSeparator } from "~/actions";
import {
  copyLinkToRevision,
  restoreRevision,
} from "~/actions/definitions/revisions";
import { useMenuAction } from "./useMenuAction";

/**
 * Hook to generate menu actions for a revision.
 *
 * @returns action with children representing the menu items.
 */
export function useRevisionMenuAction() {
  const actions = useMemo(
    () => [restoreRevision, ActionSeparator, copyLinkToRevision],
    []
  );

  return useMenuAction(actions);
}
