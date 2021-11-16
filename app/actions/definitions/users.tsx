import { PlusIcon } from "outline-icons";
import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import stores from "stores";
import Invite from "scenes/Invite";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions' or its corresponding ... Remove this comment to see the full error message
import { createAction } from "actions";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions/sections' or its corre... Remove this comment to see the full error message
import { UserSection } from "actions/sections";

export const inviteUser = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => `${t("Invite people")}…`,
  icon: <PlusIcon />,
  keywords: "team member user",
  section: UserSection,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'stores' implicitly has an 'any' t... Remove this comment to see the full error message
  visible: ({ stores }) =>
    stores.policies.abilities(stores.auth.team?.id || "").inviteUser,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  perform: ({ t }) => {
    stores.dialogs.openModal({
      title: t("Invite people"),
      content: <Invite onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});

export const rootUserActions = [inviteUser];
