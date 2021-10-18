// @flow
import { PlusIcon } from "outline-icons";
import * as React from "react";
import stores from "stores";
import Invite from "scenes/Invite";
import { createAction } from "actions";

export const inviteUser = createAction({
  name: ({ t }) => `${t("Invite people")}…`,
  icon: <PlusIcon />,
  keywords: "team member user",
  section: ({ t }) => t("Members"),
  visible: ({ stores }) =>
    stores.policies.abilities(stores.auth.team?.id || "").inviteUser,
  perform: ({ t }) => {
    stores.dialogs.openModal({
      title: t("Invite people"),
      content: <Invite onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});

export const rootUserActions = [inviteUser];
