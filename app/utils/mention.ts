import type { IntegrationSettings, IntegrationType } from "@shared/types";
import { IntegrationService, MentionType } from "@shared/types";
import type Integration from "~/models/Integration";

export const isURLMentionable = ({
  url,
  integration,
}: {
  url: URL;
  integration: Integration;
}): boolean => {
  const { hostname, pathname } = url;

  switch (integration.service) {
    case IntegrationService.GitHub: {
      return hostname === "github.com";
    }

    case IntegrationService.Linear: {
      const pathParts = pathname.split("/");
      const settings =
        integration.settings as IntegrationSettings<IntegrationType.Embed>;

      return (
        hostname === "linear.app" &&
        settings.linear?.workspace.key === pathParts[1] // ensure installed workspace key matches with the provided url.
      );
    }

    case IntegrationService.GitLab: {
      const settings =
        integration.settings as IntegrationSettings<IntegrationType.Embed>;
      const gitlabHostname = settings.gitlab?.url
        ? new URL(settings.gitlab?.url).hostname
        : undefined;

      return hostname === "gitlab.com" || hostname === gitlabHostname;
    }

    default:
      return false;
  }
};

export const determineMentionType = ({
  url,
  integration,
}: {
  url: URL;
  integration: Integration;
}): MentionType | undefined => {
  const { pathname } = url;
  const pathParts = pathname.split("/");

  switch (integration.service) {
    case IntegrationService.GitHub: {
      const type = pathParts[3];
      return type === "pull"
        ? MentionType.PullRequest
        : type === "issues"
          ? MentionType.Issue
          : undefined;
    }

    case IntegrationService.Linear: {
      const type = pathParts[2];
      return type === "issue" ? MentionType.Issue : undefined;
    }

    case IntegrationService.GitLab: {
      return pathname.includes("merge_requests")
        ? MentionType.PullRequest
        : pathname.includes("issues")
          ? MentionType.Issue
          : undefined;
    }

    default:
      return;
  }
};
