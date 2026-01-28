import type { IntegrationSettings, IntegrationType } from "@shared/types";
import { IntegrationService, MentionType } from "@shared/types";
import type Integration from "~/models/Integration";
import env from "@shared/env";

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
      const gitlabHostname = new URL(env.GITLAB_URL || "https://gitlab.com")
        .hostname;

      return hostname === gitlabHostname;
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
      const type = pathParts[pathParts.length - 2];
      return type === "merge_requests"
        ? MentionType.PullRequest
        : type === "issues"
          ? MentionType.Issue
          : undefined;
    }

    default:
      return;
  }
};
