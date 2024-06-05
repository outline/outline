import { PlusIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import APIKeyNew from "~/scenes/APIKeyNew";
import { createAction } from "..";
import { SettingsSection } from "../sections";

export const createApiKey = createAction({
  name: ({ t }) => t("New API key"),
  analyticsName: "New API key",
  section: SettingsSection,
  icon: <PlusIcon />,
  keywords: "create",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createApiKey,
  perform: ({ t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("New API key"),
      content: <APIKeyNew onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});
