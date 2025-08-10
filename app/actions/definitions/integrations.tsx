import { TrashIcon } from "outline-icons";
import stores from "~/stores";
import { createAction } from "..";
import { SettingsSection } from "../sections";
import Integration from "~/models/Integration";
import { IntegrationType } from "@shared/types";
import { DisconnectAnalyticsDialog } from "~/components/DisconnectAnalyticsDialog";

export const disconnectAnalyticsIntegrationFactory = (
  integration?: Integration<IntegrationType.Analytics>
) =>
  createAction({
    name: ({ t }) => t("Disconnect analytics"),
    analyticsName: "Disconnect analytics",
    section: SettingsSection,
    icon: <TrashIcon />,
    keywords: "disconnect",
    visible: () => !!integration,
    perform: ({ t, event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      stores.dialogs.openModal({
        title: t("Disconnect analytics"),
        content: <DisconnectAnalyticsDialog integration={integration!} />,
      });
    },
  });
