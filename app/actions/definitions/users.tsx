import { PlusIcon } from "outline-icons";
import * as React from "react";
import { UserRole } from "@shared/types";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import stores from "~/stores";
import User from "~/models/User";
import Invite from "~/scenes/Invite";
import {
  UserChangeRoleDialog,
  UserDeleteDialog,
} from "~/components/UserDialogs";
import { createAction } from "~/actions";
import { UserSection } from "~/actions/sections";

export const inviteUser = createAction({
  name: ({ t }) => `${t("Invite people")}…`,
  analyticsName: "Invite people",
  icon: <PlusIcon />,
  keywords: "team member workspace user",
  section: UserSection,
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").inviteUser,
  perform: ({ t }) => {
    stores.dialogs.openModal({
      title: t("Invite to workspace"),
      content: <Invite onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});

export const updateUserRoleActionFactory = (user: User, role: UserRole) =>
  createAction({
    name: ({ t }) =>
      UserRoleHelper.isRoleHigher(role, user!.role)
        ? `${t("Promote to {{ role }}", {
            role: UserRoleHelper.displayName(role, t),
          })}…`
        : `${t("Demote to {{ role }}", {
            role: UserRoleHelper.displayName(role, t),
          })}…`,
    analyticsName: "Update user role",
    section: UserSection,
    visible: () => {
      const can = stores.policies.abilities(user.id);

      return UserRoleHelper.isRoleHigher(role, user.role)
        ? can.promote
        : UserRoleHelper.isRoleLower(role, user.role)
        ? can.demote
        : false;
    },
    perform: ({ t }) => {
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
