import * as React from "react";
import { EditIcon, GroupIcon, TrashIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Group from "~/models/Group";
import {
  DeleteGroupDialog,
  EditGroupDialog,
  ViewGroupMembersDialog,
} from "~/scenes/Settings/components/GroupDialogs";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import {
  ActionSeparator,
  createAction,
  createExternalLinkAction,
} from "~/actions";
import { GroupSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for group management operations.
 * 
 * @param targetGroup - the group to build actions for, or null to skip.
 * @returns action with children for use in menus, or undefined if group is null.
 */
export function useGroupMenuActions(targetGroup: Group | null) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const can = usePolicy(targetGroup ?? ({} as Group));

  const openMembersDialog = React.useCallback(() => {
    if (!targetGroup) {
      return;
    }
    dialogs.openModal({
      title: t("Group members"),
      content: <ViewGroupMembersDialog group={targetGroup} />,
    });
  }, [t, targetGroup, dialogs]);

  const openEditDialog = React.useCallback(() => {
    if (!targetGroup) {
      return;
    }
    dialogs.openModal({
      title: t("Edit group"),
      content: (
        <EditGroupDialog group={targetGroup} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, targetGroup, dialogs]);

  const openDeleteDialog = React.useCallback(() => {
    if (!targetGroup) {
      return;
    }
    dialogs.openModal({
      title: t("Delete group"),
      content: (
        <DeleteGroupDialog group={targetGroup} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, targetGroup, dialogs]);

  const actionList = React.useMemo(
    () =>
      !targetGroup
        ? []
        : [
            createAction({
              name: `${t("Members")}…`,
              icon: <GroupIcon />,
              section: GroupSection,
              visible: !!(targetGroup && can.read),
              perform: openMembersDialog,
            }),
            ActionSeparator,
            createAction({
              name: `${t("Edit")}…`,
              icon: <EditIcon />,
              section: GroupSection,
              visible: !!(targetGroup && can.update),
              perform: openEditDialog,
            }),
            createAction({
              name: `${t("Delete")}…`,
              icon: <TrashIcon />,
              section: GroupSection,
              visible: !!(targetGroup && can.delete),
              dangerous: true,
              perform: openDeleteDialog,
            }),
            ActionSeparator,
            createExternalLinkAction({
              name: targetGroup.externalId ?? "",
              section: GroupSection,
              visible: !!targetGroup.externalId,
              disabled: true,
              url: "",
            }),
          ],
    [
      t,
      targetGroup,
      can.read,
      can.update,
      can.delete,
      openMembersDialog,
      openEditDialog,
      openDeleteDialog,
    ]
  );

  return useMenuAction(actionList);
}
