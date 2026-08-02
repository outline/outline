import type { IntegrationSettings, IntegrationType } from "../types";
import { IntegrationService, MentionType } from "../types";

/**
 * The minimal integration shape required to resolve mentions from a URL, so
 * that both the client model and the server model can be passed in.
 */
export interface MentionableIntegration {
  service: IntegrationService;
  settings?: unknown;
}

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
  integration: MentionableIntegration;
}): boolean => {
  const { hostname, pathname } = url;

  switch (integration.service) {
    case IntegrationService.GitHub: {
      return hostname === "github.com";
    }

    case IntegrationService.Linear: {
      const pathParts = pathname.split("/");
      const settings = embedSettings(integration);

      return (
        hostname === "linear.app" &&
        settings.linear?.workspace.key === pathParts[1] // ensure installed workspace key matches with the provided url.
      );
    }

    case IntegrationService.GitLab: {
      const settings = embedSettings(integration);
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
  integration: MentionableIntegration;
}): MentionType | undefined =>
  determineMentionTypeForService({ url, service: integration.service });

/**
 * Determines the type of mention a URL represents without any integration
 * context, using well-known hostnames. Any URL that isn't recognized as
 * belonging to a service falls back to a generic URL mention.
 *
 * @param url the URL to evaluate.
 * @returns the mention type.
 */
export const determineMentionTypeFromURL = (url: URL): MentionType => {
  const service = wellKnownServices[url.hostname];

  return (
    (service ? determineMentionTypeForService({ url, service }) : undefined) ??
    MentionType.URL
  );
};

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

/** Hostnames that identify a service without needing a connected integration. */
const wellKnownServices: Record<string, IntegrationService> = {
  "github.com": IntegrationService.GitHub,
  "gitlab.com": IntegrationService.GitLab,
  "linear.app": IntegrationService.Linear,
};

function embedSettings(
  integration: MentionableIntegration
): IntegrationSettings<IntegrationType.Embed> {
  return (integration.settings ??
    {}) as IntegrationSettings<IntegrationType.Embed>;
}

function determineMentionTypeForService({
  url,
  service,
}: {
  url: URL;
  service: IntegrationService;
}): MentionType | undefined {
  const { pathname } = url;
  const pathParts = pathname.split("/");

  switch (service) {
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

    default:
      return;
  }
}
