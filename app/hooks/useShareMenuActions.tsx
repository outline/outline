import { useMemo } from "react";
import { ActionSeparator } from "~/actions";
import {
  copyShareUrl,
  goToShareSource,
  revokeShare,
  setShareExpiry,
} from "~/actions/definitions/shares";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for share management operations. The
 * share is read from the active models in the action context.
 *
 * @returns action with children for use in menus.
 */
export function useShareMenuActions() {
  const actions = useMemo(
    () => [
      copyShareUrl,
      goToShareSource,
      setShareExpiry,
      ActionSeparator,
      revokeShare,
    ],
    []
  );

  return useMenuAction(actions);
}
