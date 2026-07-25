import { useMemo } from "react";
import type Group from "~/models/Group";
import { ActionSeparator, createExternalLinkAction } from "~/actions";
import {
  deleteGroupActionFactory,
  editGroupActionFactory,
  groupMembersActionFactory,
} from "~/actions/definitions/groups";
import { GroupSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

interface Options {
  /** Whether to hide the "Members" navigation action. */
  hideMembers?: boolean;
}

/**
 * Hook that constructs the action menu for group management operations.
 *
 * @param targetGroup - the group to build actions for, or null to skip.
 * @param options - optional configuration for the menu.
 * @returns action with children for use in menus.
 */
export function useGroupMenuActions(
  targetGroup: Group | null,
  options?: Options
) {
  const actions = useMemo(
    () =>
      !targetGroup
        ? []
        : [
            ...(options?.hideMembers
              ? []
              : [groupMembersActionFactory(targetGroup), ActionSeparator]),
            editGroupActionFactory(targetGroup),
            deleteGroupActionFactory(targetGroup),
            ActionSeparator,
            // Read-only rows surfacing the group's external identifiers.
            createExternalLinkAction({
              name: targetGroup.externalId ?? "",
              section: GroupSection,
              visible: !!targetGroup.externalId,
              disabled: true,
              url: "",
            }),
            createExternalLinkAction({
              name: `External ID: ${targetGroup.externalGroup?.externalId ?? ""}`,
              section: GroupSection,
              visible: !!targetGroup.externalGroup?.externalId,
              disabled: true,
              url: "",
            }),
          ],
    [targetGroup, options?.hideMembers]
  );

  return useMenuAction(actions);
}
