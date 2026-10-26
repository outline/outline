import { IntegrationService } from "@shared/types";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { GitHubUtils } from "../shared/GitHubUtils";
import Icon from "./Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Connect your GitHub account to Outline to enable rich, real-time issue and pull request previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
  {
    ...config,
    type: Hook.MentionProvider,
    value: {
      service: IntegrationService.GitHub,
      isMentionable: (url) => url.hostname === "github.com",
      mentionType: (url) => GitHubUtils.mentionType(url),
    },
  },
]);
