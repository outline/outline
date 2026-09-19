import { TrashIcon } from "outline-icons";
import { createAction } from "..";
import { dialogActionFactory } from "./common";
import { SettingsSection } from "../sections";
import type Integration from "~/models/Integration";
import { DisconnectAnalyticsDialog } from "~/scenes/Settings/components/DisconnectAnalyticsDialog";
import type { IntegrationType } from "@shared/types";
import { settingsPath } from "@shared/utils/routeHelpers";
import history from "~/utils/history";

export const disconnectIntegrationActionFactory = (integration?: Integration) =>
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

export const disconnectAnalyticsIntegrationActionFactory = (
  integration?: Integration<IntegrationType.Analytics>
) =>
  dialogActionFactory({
    analyticsName: "Disconnect analytics",
    section: SettingsSection,
    name: (t) => t("Disconnect analytics"),
    title: (t) => t("Disconnect analytics"),
    content: () =>
      integration ? (
        <DisconnectAnalyticsDialog integration={integration} />
      ) : null,
    icon: <TrashIcon />,
    keywords: "disconnect",
    stopEvent: true,
    visible: () => !!integration,
  });
