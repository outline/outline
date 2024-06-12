import { PlusIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import { createAction } from "..";
import { SettingsSection } from "../sections";

export const createDataAttribute = createAction({
  name: ({ t }) => t("New attribute"),
  analyticsName: "New attribute",
  section: SettingsSection,
  icon: <PlusIcon />,
  keywords: "create",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createDataAttribute,
  perform: ({ t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("New attribute"),
      // content: TODO
    });
  },
});
