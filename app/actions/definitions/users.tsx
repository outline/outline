import { PlusIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import Invite from "~/scenes/Invite";
import { createAction } from "~/actions";
import { UserSection } from "~/actions/sections";

export const inviteUser = createAction({
  name: ({ t }) => `${t("Invite people")}…`,
  analyticsName: "Invite people",
  icon: <PlusIcon />,
  keywords: "team member workspace user",
  section: UserSection,
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
