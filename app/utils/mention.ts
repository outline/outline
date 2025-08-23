import {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
  MentionType,
} from "@shared/types";
import Integration from "~/models/Integration";
import clientEnv from "@shared/env";

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

    case IntegrationService.Bitbucket: {
      return (
        hostname === "bitbucket.org" &&
        pathParts.length >= 4 &&
        (pathParts[3] === "issues" || pathParts[3] === "pull-requests")
      );
    }

    default:
      return false;
  }
};

// Special function for Bitbucket URLs that don't require a database integration
export const isBitbucketURLMentionable = (url: URL): boolean => {
  const { hostname, pathname } = url;
  const pathParts = pathname.split("/");

  return (
    hostname === "bitbucket.org" &&
    pathParts.length >= 4 &&
    (pathParts[3] === "issues" || pathParts[3] === "pull-requests")
  );
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

    case IntegrationService.Bitbucket: {
      const type = pathParts[3];
      return type === "pull-requests"
        ? MentionType.PullRequest
        : type === "issues"
          ? MentionType.Issue
          : undefined;
    }

    default:
      return;
  }
};

// Special function for Bitbucket URLs that don't require a database integration
export const determineBitbucketMentionType = (
  url: URL
): MentionType | undefined => {
  const { pathname } = url;
  const pathParts = pathname.split("/");

  const type = pathParts[3];
  return type === "pull-requests"
    ? MentionType.PullRequest
    : type === "issues"
      ? MentionType.Issue
      : undefined;
};

// Special function for Jira URLs that don't require a database integration
export const isJiraURLMentionable = (url: URL): boolean => {
  const { hostname, pathname } = url;
  const pathParts = pathname.split("/");

  // Get Jira domain from environment variable (client-side compatible)
  const jiraUrl = clientEnv.JIRA_URL;

  if (!jiraUrl) {
    return false;
  }

  try {
    const jiraDomain = new URL(jiraUrl).hostname;

    // Check for /browse/[issue-key] pattern
    if (
      hostname === jiraDomain &&
      pathParts.length >= 3 &&
      pathParts[1] === "browse" &&
      /^[A-Z]+-\d+$/.test(pathParts[2])
    ) {
      return true;
    }

    // Check for /projects/[project]/issues/[issue-key] pattern
    if (
      hostname === jiraDomain &&
      pathParts.length >= 4 &&
      pathParts[1] === "projects" &&
      pathParts[3] === "issues" &&
      /^[A-Z]+-\d+$/.test(pathParts[4])
    ) {
      return true;
    }

    return false;
  } catch (_error) {
    return false;
  }
};

export const determineJiraMentionType = (_url: URL): MentionType | undefined => {
  // Jira URLs are always issues, not pull requests
  return MentionType.JiraIssue;
};
