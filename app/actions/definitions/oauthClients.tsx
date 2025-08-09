import { PlusIcon } from "outline-icons";
import stores from "~/stores";
import { OAuthClientNew } from "~/components/OAuthClient/OAuthClientNew";
import { createActionV2 } from "..";
import { SettingsSection } from "../sections";

export const createOAuthClient = createActionV2({
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
