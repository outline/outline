import { PlusIcon, UserRemoveIcon } from "outline-icons";
import type { GroupPermission } from "@shared/types";
import { GroupPermissionHelper } from "@shared/utils/GroupPermissionHelper";
import stores from "~/stores";
import Group from "~/models/Group";
import User from "~/models/User";
import { AddPeopleToGroupDialog } from "~/scenes/Settings/components/GroupDialogs";
import { createAction, createActionWithChildren } from "~/actions";
import {
  dialogActionFactory,
  everyActiveModel,
  performBatchOnActiveModels,
} from "~/actions/definitions/common";
import { GroupSection } from "~/actions/sections";
import type { ActionContext } from "~/types";

export const addGroupUsers = dialogActionFactory({
  analyticsName: "Add people to group",
  section: GroupSection,
  name: (t) => `${t("Add people")}…`,
  title: (t, { getActiveModel }) =>
    t(`Add people to {{groupName}}`, {
      groupName: getActiveModel(Group)?.name ?? "",
    }),
  content: (onSubmit, { getActiveModel }) => {
    const group = getActiveModel(Group);
    return group ? <AddPeopleToGroupDialog group={group} /> : null;
  },
  icon: <PlusIcon />,
  visible: (context) => canManageMembers(context),
});

/**
 * Creates an action that sets the permission of the active group members.
 *
 * @param permission - the permission to assign.
 * @returns an action for use in menus.
 */
export const updateGroupUserPermissionActionFactory = (
  permission: GroupPermission
) =>
  createAction({
    name: ({ t }) => GroupPermissionHelper.displayName(permission, t),
    analyticsName: "Update group member permission",
    section: GroupSection,
    selected: (context) =>
      everyActiveModel(
        context,
        User,
        (user) => getMembership(context, user)?.permission === permission
      ),
    perform: (context) => {
      const group = context.getActiveModel(Group);
      if (!group) {
        return;
      }

      return performBatchOnActiveModels(
        context,
        User,
        (user) =>
          stores.groupUsers.update({
            groupId: group.id,
            userId: user.id,
            permission,
          }),
        (users, succeeded, t) =>
          users.length === 1
            ? undefined
            : t("{{ count }} member updated", { count: succeeded })
      );
    },
  });

export const changeGroupUserPermission = createActionWithChildren({
  name: ({ t }) => t("Change role"),
  analyticsName: "Change group member permission",
  section: GroupSection,
  visible: (context) => canManageMembers(context),
  children: GroupPermissionHelper.permissions.map((permission) =>
    updateGroupUserPermissionActionFactory(permission)
  ),
});

export const removeGroupUser = createAction({
  name: ({ t, currentUserId, getActiveModels }) => {
    const users = getActiveModels(User);
    if (users.length === 1) {
      return currentUserId === users[0].id
        ? t("Leave group")
        : t("Remove user");
    }
    return t("Remove users");
  },
  analyticsName: "Remove group member",
  section: GroupSection,
  icon: <UserRemoveIcon />,
  iconInContextMenu: false,
  dangerous: true,
  visible: (context) =>
    canManageMembers(context) &&
    everyActiveModel(context, User, (user) => !!getMembership(context, user)),
  perform: (context) => {
    const group = context.getActiveModel(Group);
    if (!group) {
      return;
    }

    return performBatchOnActiveModels(
      context,
      User,
      (user) =>
        stores.groupUsers.delete({
          groupId: group.id,
          userId: user.id,
        }),
      (users, succeeded, t) => {
        if (users.length > 1) {
          return t("{{ count }} member removed from the group", {
            count: succeeded,
          });
        }
        return context.currentUserId === users[0].id
          ? t("You have left the group")
          : t(`{{userName}} was removed from the group`, {
              userName: users[0].name,
            });
      }
    );
  },
});

const canManageMembers = ({ getActiveModel }: ActionContext) => {
  const group = getActiveModel(Group);
  return (
    !!group &&
    stores.policies.abilities(group.id).update &&
    !group.isExternallyManaged
  );
};

const getMembership = ({ getActiveModel }: ActionContext, user: User) => {
  const group = getActiveModel(Group);
  return group ? stores.groupUsers.membership(group.id, user.id) : undefined;
};
