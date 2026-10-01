import { useMemo } from "react";
import type Tag from "~/models/Tag";
import { ActionSeparator } from "~/actions";
import {
  changeTagColorActionFactory,
  deleteTagActionFactory,
  mergeTagActionFactory,
  renameTagActionFactory,
} from "~/actions/definitions/tags";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for tag management operations.
 *
 * @param tag - the tag to build actions for.
 * @returns action with children for use in menus.
 */
export function useTagMenuActions(tag: Tag) {
  const actions = useMemo(
    () => [
      renameTagActionFactory(tag),
      changeTagColorActionFactory(tag),
      mergeTagActionFactory(tag),
      ActionSeparator,
      deleteTagActionFactory(tag),
    ],
    [tag]
  );

  return useMenuAction(actions);
}
