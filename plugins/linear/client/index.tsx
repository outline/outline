import type { IntegrationSettings, IntegrationType } from "@shared/types";
import { IntegrationService } from "@shared/types";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { LinearUtils } from "../shared/LinearUtils";
import Icon from "./Icon";
import { LinearIssueStatusIcon } from "./IssueStatusIcon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Connect your Linear account to Outline to enable rich, real-time issue previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
  {
    ...config,
    type: Hook.MentionProvider,
    value: {
      service: IntegrationService.Linear,
      isMentionable: (url, integration) => {
        const settings =
          integration.settings as IntegrationSettings<IntegrationType.Embed>;

        // Ensure the installed workspace key matches the URL.
        return (
          url.hostname === "linear.app" &&
          settings.linear?.workspace.key === url.pathname.split("/")[1]
        );
      },
      mentionType: (url) => LinearUtils.mentionType(url),
    },
  },
  {
    ...config,
    type: Hook.IssueStatusIcon,
    value: {
      service: IntegrationService.Linear,
      component: LinearIssueStatusIcon,
    },
  },
]);
