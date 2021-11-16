import { PlusIcon } from "outline-icons";
import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import stores from "stores";
import Invite from "scenes/Invite";
import { createAction } from "actions";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions/sections' or its corre... Remove this comment to see the full error message
import { UserSection } from "actions/sections";

export const inviteUser = createAction({
  name: ({ t }) => `${t("Invite people")}…`,
  icon: <PlusIcon />,
  keywords: "team member user",
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
