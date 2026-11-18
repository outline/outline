import type { IntegrationSettings, IntegrationType } from "@shared/types";
import { IntegrationService } from "@shared/types";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { GitLabUtils } from "../shared/GitLabUtils";
import Icon from "./components/Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Connect your GitLab account to Outline to enable rich, real-time issue, merge request, and project previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
  {
    ...config,
    type: Hook.MentionProvider,
    value: {
      service: IntegrationService.GitLab,
      isMentionable: (url, integration) => {
        const settings =
          integration.settings as IntegrationSettings<IntegrationType.Embed>;
        let hostname: string | undefined;
        try {
          hostname = settings.gitlab?.url
            ? new URL(settings.gitlab.url).hostname
            : undefined;
        } catch {
          return false;
        }

        return url.hostname === "gitlab.com" || url.hostname === hostname;
      },
      // The host is already checked by isMentionable.
      mentionType: (url) => GitLabUtils.mentionType(url, url.origin),
    },
  },
]);
