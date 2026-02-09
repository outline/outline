import * as React from "react";
import type Share from "~/models/Share";
import usePolicy from "~/hooks/usePolicy";
import { ActionSeparator } from "~/actions";
import {
  copyShareUrlFactory,
  goToShareSourceFactory,
  revokeShareFactory,
} from "~/actions/definitions/shares";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for share management operations.
 * 
 * @param targetShare - the share to build actions for, or null to skip.
 * @returns action with children for use in menus, or undefined if share is null.
 */
export function useShareMenuActions(targetShare: Share | null) {
  const can = usePolicy(targetShare ?? ({} as Share));

  const actionList = React.useMemo(
    () =>
      !targetShare
        ? []
        : [
            copyShareUrlFactory({ share: targetShare }),
            goToShareSourceFactory({ share: targetShare }),
            ActionSeparator,
            revokeShareFactory({ share: targetShare, can }),
          ],
    [targetShare, can]
  );

  return useMenuAction(actionList);
}
