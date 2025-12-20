import { TrashIcon } from "outline-icons";
import stores from "~/stores";
import { createAction } from "..";
import { SettingsSection } from "../sections";
import type Integration from "~/models/Integration";
import { DisconnectAnalyticsDialog } from "~/scenes/Settings/components/DisconnectAnalyticsDialog";
import type { IntegrationType } from "@shared/types";
import { settingsPath } from "@shared/utils/routeHelpers";
import history from "~/utils/history";

export const disconnectIntegrationFactory = (integration?: Integration) =>
  createAction({
    name: ({ t }) => t("Disconnect"),
    analyticsName: "Disconnect integration",
    section: SettingsSection,
    icon: <TrashIcon />,
    keywords: "disconnect",
    visible: () => !!integration,
    perform: async ({ event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      await integration?.delete();
      history.push(settingsPath("integrations"));
    },
  });

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
