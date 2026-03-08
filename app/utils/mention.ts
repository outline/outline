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
      let gitlabHostname: string | undefined;
      try {
        gitlabHostname = settings.gitlab?.url
          ? new URL(settings.gitlab.url).hostname
          : undefined;
      } catch {
        // Invalid URL stored in settings
        return false;
      }

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
      return type === "issue"
        ? MentionType.Issue
        : type === "project"
          ? MentionType.Project
          : undefined;
    }

    case IntegrationService.GitLab: {
      const hasShowParam = url.searchParams.has("show");

      if (
        /\/-\/merge_requests\/\d+/.test(pathname) ||
        (/\/-\/merge_requests\/?$/.test(pathname) && hasShowParam)
      ) {
        return MentionType.PullRequest;
      }
      if (
        /\/-\/issues\/\d+/.test(pathname) ||
        (/\/-\/issues\/?$/.test(pathname) && hasShowParam)
      ) {
        return MentionType.Issue;
      }
      return undefined;
    }

    default:
      return;
  }
};
