import type { IntegrationSettings, IntegrationType } from "@shared/types";
import { IntegrationService } from "@shared/types";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { GiteaUtils } from "../shared/GiteaUtils";
import Icon from "./components/Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Connect your Gitea or Forgejo instance to Outline to enable rich, real-time issue, pull request, and repository previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
  {
    ...config,
    type: Hook.MentionProvider,
    value: {
      service: IntegrationService.Gitea,
      isMentionable: (url, integration) => {
        const settings =
          integration.settings as IntegrationSettings<IntegrationType.Embed>;
        return (
          !!settings.gitea?.installation &&
          !!GiteaUtils.pathParts(url, settings.gitea.url)
        );
      },
      mentionType: (url, integration) => {
        const settings =
          integration.settings as IntegrationSettings<IntegrationType.Embed>;
        return settings.gitea?.installation
          ? GiteaUtils.mentionType(url, settings.gitea.url)
          : undefined;
      },
    },
  },
]);
