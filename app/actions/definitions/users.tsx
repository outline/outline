import {
  DoneIcon,
  EmailIcon,
  PlusIcon,
  TrashIcon,
  UserRemoveIcon,
} from "outline-icons";
import { toast } from "sonner";
import { UserRole } from "@shared/types";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import stores from "~/stores";
import User from "~/models/User";
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
import {
  dialogActionFactory,
  everyActiveModel,
  performBatchOnActiveModels,
} from "~/actions/definitions/common";
import { UserSection } from "~/actions/sections";
import type { ActionContext } from "~/types";

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
 * Creates an action that sets the role of the active users, marked as selected
 * when it is the role they already have.
 *
 * @param role - the role to assign.
 * @returns an action for use in menus.
 */
const updateUserRoleActionFactory = (role: UserRole) =>
  createAction({
    name: ({ t }) => UserRoleHelper.displayName(role, t),
    analyticsName: "Update user role",
    section: UserSection,
    selected: (context) =>
      everyActiveModel(context, User, (user) => user.role === role),
    visible: (context) =>
      everyActiveModel(context, User, (user) => {
        if (user.role === role) {
          return true;
        }

        const can = context.stores.policies.abilities(user.id);
        return UserRoleHelper.isRoleHigher(role, user.role)
          ? can.promote
          : can.demote;
      }),
    perform: ({ getActiveModels, stores: rootStore, t }) => {
      const users = getActiveModels(User).filter((user) => user.role !== role);
      if (!users.length) {
        return;
      }

      rootStore.dialogs.openModal({
        title: t("Update role"),
        content: (
          <UserChangeRoleDialog
            users={users}
            role={role}
            onSubmit={rootStore.dialogs.closeAllModals}
          />
        ),
      });
    },
  });

export const changeUserRole = createActionWithChildren({
  name: ({ t }) => t("Change role"),
  analyticsName: "Change user role",
  section: UserSection,
  visible: (context) =>
    everyActiveModel(context, User, (user) => {
      const can = context.stores.policies.abilities(user.id);
      return can.demote || can.promote;
    }),
  children: [UserRole.Admin, UserRole.Member, UserRole.Viewer].map((role) =>
    updateUserRoleActionFactory(role)
  ),
});

export const changeUserAvatar = dialogActionFactory({
  analyticsName: "Change user avatar",
  section: UserSection,
  title: (t) => t("Change profile picture"),
  content: (onSubmit, context) => {
    const user = singleActiveUser(context);
    return user ? (
      <UserChangeAvatarDialog user={user} onSubmit={onSubmit} />
    ) : null;
  },
  visible: (context) => canUpdateSingleUser(context),
});

export const changeUserName = dialogActionFactory({
  analyticsName: "Change user name",
  section: UserSection,
  title: (t) => t("Change name"),
  content: (onSubmit, context) => {
    const user = singleActiveUser(context);
    return user ? (
      <UserChangeNameDialog user={user} onSubmit={onSubmit} />
    ) : null;
  },
  visible: (context) => canUpdateSingleUser(context),
});

export const changeUserEmail = dialogActionFactory({
  analyticsName: "Change user email",
  section: UserSection,
  title: (t) => t("Change email"),
  content: (onSubmit, context) => {
    const user = singleActiveUser(context);
    return user ? (
      <UserChangeEmailDialog user={user} onSubmit={onSubmit} />
    ) : null;
  },
  visible: (context) => canUpdateSingleUser(context),
});

export const suspendUser = dialogActionFactory({
  analyticsName: "Suspend user",
  section: UserSection,
  name: (t) => `${t("Suspend user")}…`,
  title: (t, { getActiveModels }) =>
    getActiveModels(User).length === 1
      ? t("Suspend user")
      : t("Suspend {{ count }} user", {
          count: getActiveModels(User).length,
        }),
  content: (onSubmit, { getActiveModels }) => (
    <UserSuspendDialog users={getActiveModels(User)} onSubmit={onSubmit} />
  ),
  icon: <UserRemoveIcon />,
  iconInContextMenu: false,
  dangerous: true,
  visible: (context) =>
    everyActiveModel(
      context,
      User,
      (user) =>
        !user.isInvited &&
        !user.isSuspended &&
        context.stores.policies.abilities(user.id).suspend
    ),
});

export const activateUser = createAction({
  name: ({ t }) => t("Activate user"),
  analyticsName: "Activate user",
  section: UserSection,
  icon: <DoneIcon />,
  iconInContextMenu: false,
  visible: (context) =>
    everyActiveModel(
      context,
      User,
      (user) =>
        !user.isInvited &&
        user.isSuspended &&
        context.stores.policies.abilities(user.id).activate
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      User,
      (user) => context.stores.users.activate(user),
      (users, succeeded, t) =>
        users.length === 1
          ? undefined
          : t("{{ count }} user activated", { count: succeeded })
    ),
});

export const resendInvite = createAction({
  name: ({ t }) => t("Resend invite"),
  analyticsName: "Resend invite",
  section: UserSection,
  icon: <EmailIcon />,
  iconInContextMenu: false,
  visible: (context) =>
    everyActiveModel(
      context,
      User,
      (user) => context.stores.policies.abilities(user.id).resendInvite
    ),
  perform: async (context) => {
    const users = context.getActiveModels(User);
    const succeeded = await performBatchOnActiveModels(
      context,
      User,
      (user) => context.stores.users.resendInvite(user),
      (models, count, t) =>
        models.length === 1
          ? t("Invite was resent to {{ userName }}", {
              userName: models[0].name,
            })
          : t("{{ count }} invite resent", { count })
    );

    if (succeeded < users.length) {
      toast.error(
        context.t("Could not resend {{ count }} invite", {
          count: users.length - succeeded,
        })
      );
    }
  },
});

export const revokeInvite = createAction({
  name: ({ t }) => `${t("Revoke invite")}…`,
  analyticsName: "Revoke invite",
  section: UserSection,
  icon: <UserRemoveIcon />,
  iconInContextMenu: false,
  dangerous: true,
  visible: (context) =>
    everyActiveModel(context, User, (user) => user.isInvited),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      User,
      (user) => context.stores.users.delete(user),
      (users, succeeded, t) =>
        users.length === 1
          ? undefined
          : t("{{ count }} invite revoked", { count: succeeded })
    ),
});

export const deleteUser = dialogActionFactory({
  analyticsName: "Delete user",
  section: UserSection,
  name: (t) => `${t("Delete user")}…`,
  title: (t, { getActiveModels }) =>
    getActiveModels(User).length === 1
      ? t("Delete user")
      : t("Delete {{ count }} user", { count: getActiveModels(User).length }),
  content: (onSubmit, { getActiveModels }) => (
    <UserDeleteDialog users={getActiveModels(User)} onSubmit={onSubmit} />
  ),
  icon: <TrashIcon />,
  iconInContextMenu: false,
  keywords: "leave",
  dangerous: true,
  visible: (context) =>
    everyActiveModel(
      context,
      User,
      (user) => context.stores.policies.abilities(user.id).delete
    ),
});

export const rootUserActions = [inviteUser];

/** The active user, when a single one is active. */
const singleActiveUser = ({ getActiveModels }: ActionContext) => {
  const users = getActiveModels(User);
  return users.length === 1 ? users[0] : undefined;
};

const canUpdateSingleUser = (context: ActionContext) => {
  const user = singleActiveUser(context);
  return !!user && context.stores.policies.abilities(user.id).update;
};
