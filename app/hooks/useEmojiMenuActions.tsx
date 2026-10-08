import { useMemo } from "react";
import type Emoji from "~/models/Emoji";
import {
  deleteEmojiActionFactory,
  replaceEmojiActionFactory,
} from "~/actions/definitions/emojis";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for emoji management operations.
 *
 * @param targetEmoji - the emoji to build actions for, or null to skip.
 * @returns action with children for use in menus.
 */
export function useEmojiMenuActions(targetEmoji: Emoji | null) {
  const actions = useMemo(
    () =>
      targetEmoji
        ? [
            replaceEmojiActionFactory(targetEmoji),
            deleteEmojiActionFactory(targetEmoji),
          ]
        : [],
    [targetEmoji]
  );

  return useMenuAction(actions);
}
