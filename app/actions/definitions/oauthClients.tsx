import { PlusIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import { OAuthClientNew } from "~/components/OAuthClient/OAuthClientNew";
import { createAction } from "..";
import { SettingsSection } from "../sections";

export const createOAuthClient = createAction({
  name: ({ t }) => t("New App"),
  analyticsName: "New App",
  section: SettingsSection,
  icon: <PlusIcon />,
  keywords: "create",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createOAuthClient,
  perform: ({ t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("New Application"),
      content: <OAuthClientNew onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});
