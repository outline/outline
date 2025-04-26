import {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
  MentionType,
} from "@shared/types";
import Integration from "~/models/Integration";

export const isURLMentionable = ({
  url,
  integration,
}: {
  url: URL;
  integration: Integration;
}): boolean => {
  const { hostname, pathname } = url;
  const pathParts = pathname.split("/");

  switch (integration.service) {
    case IntegrationService.GitHub: {
      const settings =
        integration.settings as IntegrationSettings<IntegrationType.Embed>;

      return (
        hostname === "github.com" &&
        settings.github?.installation.account.name === pathParts[1] // ensure installed org/account name matches with the provided url.
      );
    }

    case IntegrationService.Linear: {
      const settings =
        integration.settings as IntegrationSettings<IntegrationType.Embed>;

      return (
        hostname === "linear.app" &&
        settings.linear?.workspace.key === pathParts[1] // ensure installed workspace key matches with the provided url.
      );
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

    default:
      return;
  }
};
