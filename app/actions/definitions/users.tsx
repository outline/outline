import { PlusIcon } from "outline-icons";
import { toast } from "sonner";
import { UserRole } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import stores from "~/stores";
import type User from "~/models/User";
import Invite from "~/scenes/Invite";
import {
  UserChangeAvatarDialog,
  UserChangeEmailDialog,
  UserChangeNameDialog,
  UserChangeRoleDialog,
  UserDeleteDialog,
  UserSuspendDialog,
} from "~/components/UserDialogs";
import { createAction, createActionWithChildren } from "~/actions";
import { dialogActionFactory } from "~/actions/definitions/common";
import { UserSection } from "~/actions/sections";

export const inviteUser = dialogActionFactory({
  analyticsName: "Invite people",
  section: UserSection,
  name: (t) => `${t("Invite people")}…`,
  title: (t) => t("Invite to workspace"),
  content: (onSubmit) => <Invite onSubmit={onSubmit} />,
  icon: <PlusIcon />,
  keywords: "team member workspace user",
  width: "500px",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").inviteUser,
});

/**
 * Creates an action that sets the given user's role, marked as selected when
 * it is the role they already have.
 *
 * @param user - the user to update.
 * @param role - the role to assign.
 * @returns an action for use in menus.
 */
export const updateUserRoleActionFactory = (user: User, role: UserRole) =>
  createAction({
    name: ({ t }) => UserRoleHelper.displayName(role, t),
    analyticsName: "Update user role",
    section: UserSection,
    selected: () => user.role === role,
    visible: () => {
      if (user.role === role) {
        return true;
      }

      const can = stores.policies.abilities(user.id);
      return UserRoleHelper.isRoleHigher(role, user.role)
        ? can.promote
        : can.demote;
    },
    perform: ({ t }) => {
      if (user.role === role) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Update role"),
        content: (
          <UserChangeRoleDialog
            user={user}
            role={role}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
    },
  });

export const changeUserRoleActionFactory = (user: User) =>
  createActionWithChildren({
    name: ({ t }) => t("Change role"),
    analyticsName: "Change user role",
    section: UserSection,
    visible: () => {
      const can = stores.policies.abilities(user.id);
      return can.demote || can.promote;
    },
    children: [UserRole.Admin, UserRole.Member, UserRole.Viewer].map((role) =>
      updateUserRoleActionFactory(user, role)
    ),
  });

export const changeUserAvatarActionFactory = (user: User) =>
  dialogActionFactory({
    analyticsName: "Change user avatar",
    section: UserSection,
    title: (t) => t("Change profile picture"),
    content: (onSubmit) => (
      <UserChangeAvatarDialog user={user} onSubmit={onSubmit} />
    ),
    visible: () => stores.policies.abilities(user.id).update,
  });

export const changeUserNameActionFactory = (user: User) =>
  dialogActionFactory({
    analyticsName: "Change user name",
    section: UserSection,
    title: (t) => t("Change name"),
    content: (onSubmit) => (
      <UserChangeNameDialog user={user} onSubmit={onSubmit} />
    ),
    visible: () => stores.policies.abilities(user.id).update,
  });

export const changeUserEmailActionFactory = (user: User) =>
  dialogActionFactory({
    analyticsName: "Change user email",
    section: UserSection,
    title: (t) => t("Change email"),
    content: (onSubmit) => (
      <UserChangeEmailDialog user={user} onSubmit={onSubmit} />
    ),
    visible: () => stores.policies.abilities(user.id).update,
  });

export const suspendUserActionFactory = (user: User) =>
  dialogActionFactory({
    analyticsName: "Suspend user",
    section: UserSection,
    title: (t) => t("Suspend user"),
    content: (onSubmit) => (
      <UserSuspendDialog user={user} onSubmit={onSubmit} />
    ),
    dangerous: true,
    visible: () => !user.isInvited && !user.isSuspended,
  });

export const resendInviteActionFactory = (user: User) =>
  createAction({
    name: ({ t }) => t("Resend invite"),
    analyticsName: "Resend invite",
    section: UserSection,
    visible: () => stores.policies.abilities(user.id).resendInvite,
    perform: async ({ t }) => {
      try {
        await stores.users.resendInvite(user);
        toast.success(
          t("Invite was resent to {{ userName }}", { userName: user.name })
        );
      } catch (err) {
        toast.error(errToString(err));
      }
    },
  });

export const revokeInviteActionFactory = (user: User) =>
  createAction({
    name: ({ t }) => `${t("Revoke invite")}…`,
    analyticsName: "Revoke invite",
    section: UserSection,
    dangerous: true,
    visible: () => user.isInvited,
    perform: () => stores.users.delete(user),
  });

export const activateUserActionFactory = (user: User) =>
  createAction({
    name: ({ t }) => t("Activate user"),
    analyticsName: "Activate user",
    section: UserSection,
    visible: () => !user.isInvited && user.isSuspended,
    perform: () => stores.users.activate(user),
  });

export const deleteUserActionFactory = (userId: string) =>
  createAction({
    name: ({ t }) => `${t("Delete user")}…`,
    analyticsName: "Delete user",
    keywords: "leave",
    dangerous: true,
    section: UserSection,
    visible: () => stores.policies.abilities(userId).delete,
    perform: ({ t }) => {
      const user = stores.users.get(userId);
      if (!user) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Delete user"),
        content: (
          <UserDeleteDialog
            user={user}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
    },
  });

export const rootUserActions = [inviteUser];
