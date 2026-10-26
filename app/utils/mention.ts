import type { IntegrationSettings, IntegrationType } from "@shared/types";
import { IntegrationService, MentionType } from "@shared/types";
import type Integration from "~/models/Integration";

const gitlabSystemPaths = new Set([
  "explore",
  "help",
  "admin",
  "dashboard",
  "users",
  "groups",
  "projects",
  "snippets",
  "search",
  "-",
]);

const giteaSystemPaths = new Set([
  "-",
  ".well-known",
  "admin",
  "api",
  "assets",
  "attachments",
  "avatars",
  "explore",
  "issues",
  "login",
  "milestones",
  "notifications",
  "org",
  "pulls",
  "repo",
  "user",
]);

/**
 * Returns the path segments of a URL relative to a connected Gitea instance,
 * which can be served from a sub-path.
 *
 * @param url the URL to split.
 * @param integration the Gitea integration.
 * @returns the path segments, or undefined if the URL is not on the instance.
 */
const giteaPathParts = (
  url: URL,
  integration: Integration
): string[] | undefined => {
  const settings =
    integration.settings as IntegrationSettings<IntegrationType.Embed>;
  if (!settings.gitea?.installation) {
    return undefined;
  }

  let base: URL;
  try {
    base = new URL(settings.gitea.url);
  } catch {
    return undefined;
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  if (
    url.host !== base.host ||
    (basePath && !url.pathname.startsWith(`${basePath}/`))
  ) {
    return undefined;
  }

  return url.pathname.slice(basePath.length).split("/").filter(Boolean);
};

/**
 * Checks whether a URL can be converted to a mention for the given
 * integration.
 *
 * @param options the URL and integration to check against.
 * @returns true if the URL can be mentioned through the integration.
 */
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

    case IntegrationService.Gitea: {
      return !!giteaPathParts(url, integration);
    }

    default:
      return false;
  }
};

/**
 * Determines the type of mention a URL represents for the given integration,
 * such as an issue, pull request, or project.
 *
 * @param options the URL and integration to evaluate.
 * @returns the mention type, or undefined if the URL is not recognized.
 */
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
          : type === "projects"
            ? MentionType.Project
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
        /\/-\/(issues|work_items)\/\d+/.test(pathname) ||
        (/\/-\/(issues|work_items)\/?$/.test(pathname) && hasShowParam)
      ) {
        return MentionType.Issue;
      }
      if (!pathname.includes("/-/")) {
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && !gitlabSystemPaths.has(parts[0])) {
          return MentionType.Project;
        }
      }
      return undefined;
    }

    case IntegrationService.Gitea: {
      const parts = giteaPathParts(url, integration);
      if (!parts || parts.length < 2 || giteaSystemPaths.has(parts[0])) {
        return undefined;
      }
      if (parts.length === 2) {
        return MentionType.Project;
      }
      if (!/^\d+$/.test(parts[3] ?? "")) {
        return undefined;
      }
      return parts[2] === "pulls"
        ? MentionType.PullRequest
        : parts[2] === "issues"
          ? MentionType.Issue
          : undefined;
    }

    default:
      return;
  }
};
