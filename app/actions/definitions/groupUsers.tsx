import { PlusIcon } from "outline-icons";
import { toast } from "sonner";
import type { GroupPermission } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { GroupPermissionHelper } from "@shared/utils/GroupPermissionHelper";
import stores from "~/stores";
import Group from "~/models/Group";
import User from "~/models/User";
import { AddPeopleToGroupDialog } from "~/scenes/Settings/components/GroupDialogs";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { createAction, createActionWithChildren } from "~/actions";
import { dialogActionFactory } from "~/actions/definitions/common";
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
 * Creates an action that sets the active group member's permission.
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
    selected: (context) => getMembership(context)?.permission === permission,
    perform: async ({ getActiveModel }) => {
      const group = getActiveModel(Group);
      const user = getActiveModel(User);
      if (!group || !user) {
        return;
      }

      try {
        await stores.groupUsers.update({
          groupId: group.id,
          userId: user.id,
          permission,
        });
      } catch (err) {
        toast.error(errToString(err));
      }
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
  name: ({ t, currentUserId, getActiveModel }) =>
    currentUserId === getActiveModel(User)?.id
      ? t("Leave group")
      : t("Remove user"),
  analyticsName: "Remove group member",
  section: GroupSection,
  dangerous: true,
  visible: (context) => canManageMembers(context) && !!getMembership(context),
  perform: async ({ t, currentUserId, getActiveModel }) => {
    const group = getActiveModel(Group);
    const user = getActiveModel(User);
    if (!group || !user) {
      return;
    }

    try {
      await stores.groupUsers.delete({
        groupId: group.id,
        userId: user.id,
      });

      if (currentUserId === user.id) {
        toast.success(t("You have left the group"));
        return;
      }

      toast.success(
        t(`{{userName}} was removed from the group`, {
          userName: user.name,
        }),
        {
          icon: <Avatar model={user} size={AvatarSize.Toast} />,
        }
      );
    } catch (err) {
      toast.error(errToString(err));
    }
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

const getMembership = ({ getActiveModel }: ActionContext) => {
  const group = getActiveModel(Group);
  const user = getActiveModel(User);
  return group && user
    ? stores.groupUsers.membership(group.id, user.id)
    : undefined;
};
