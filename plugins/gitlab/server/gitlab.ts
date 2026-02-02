import { Sequelize } from "sequelize";
import pluralize from "pluralize";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration } from "@server/models";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { getGitLabConfig } from "./config";

interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  author: {
    username: string;
    name: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  web_url: string;
}

interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: string;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  author: {
    username: string;
    name: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  web_url: string;
  work_in_progress: boolean;
}

interface GitLabProject {
  id: number;
  path_with_namespace: string;
  name: string;
}

export class GitLab {
  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  /**
   * Parses a given URL and returns resource identifiers for GitLab specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `namespace`, `project`, `type` and `id`.
   */
  public static parseUrl(url: string) {
    try {
      const urlObj = new URL(url);
      // Поддерживаем как gitlab.com, так и self-hosted инстансы – хост проверяется позже
      const gitlabHost = new URL("https://gitlab.com").hostname;

      // Support both gitlab.com and self-hosted instances
      if (urlObj.hostname !== gitlabHost && urlObj.hostname !== "gitlab.com") {
        return;
      }

      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length < 4) {
        return;
      }

      const namespace = parts[0];
      const project = parts[1];
      const type = parts[2]
        ? (pluralize.singular(parts[2]) as UnfurlResourceType)
        : undefined;
      const id = Number(parts[3]);

      if (!type || !GitLab.supportedResources.includes(type)) {
        return;
      }

      if (isNaN(id)) {
        return;
      }

      return { namespace, project, type, id, url };
    } catch (_err) {
      // Invalid URL format
      return;
    }
  }

  /**
   * Gets an access token from GitLab using the integration's stored token
   */
  private static async getAccessToken(
    integration: Integration<IntegrationType.Embed>
  ): Promise<string | null> {
    const auth = await integration.$get("authentication");
    if (!auth || !auth.token) {
      return null;
    }

    return auth.token;
  }

  /**
   * Fetches a GitLab issue or merge request
   */
  private static async fetchResource(
    namespace: string,
    project: string,
    type: UnfurlResourceType,
    id: number,
    accessToken: string,
    gitlabUrl: string
  ): Promise<GitLabIssue | GitLabMergeRequest | null> {
    const projectPath = encodeURIComponent(`${namespace}/${project}`);
    const endpoint =
      type === UnfurlResourceType.Issue
        ? `/api/v4/projects/${projectPath}/issues/${id}`
        : `/api/v4/projects/${projectPath}/merge_requests/${id}`;

    try {
      const response = await fetch(`${gitlabUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`GitLab API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Logger.warn("Failed to fetch resource from GitLab", error);
      return null;
    }
  }

  /**
   * Transforms GitLab issue data to Outline format
   */
  private static transformIssue(issue: GitLabIssue): UnfurlIssueOrPR {
    return {
      type: UnfurlResourceType.Issue,
      url: issue.web_url,
      id: `#${issue.iid}`,
      title: issue.title,
      description: issue.description ?? null,
      author: {
        name: issue.author.username || issue.author.name,
        avatarUrl: issue.author.avatar_url || "",
      },
      labels: issue.labels.map((label) => ({
        name: label.name,
        color: `#${label.color}`,
      })),
      state: {
        name: issue.state,
        color: GitLab.getColorForStatus(issue.state),
      },
      createdAt: issue.created_at,
    };
  }

  /**
   * Transforms GitLab merge request data to Outline format
   */
  private static transformMergeRequest(
    mr: GitLabMergeRequest
  ): UnfurlIssueOrPR {
    const state = mr.merged_at ? "merged" : mr.state;
    return {
      type: UnfurlResourceType.PR,
      url: mr.web_url,
      id: `!${mr.iid}`,
      title: mr.title,
      description: mr.description ?? null,
      author: {
        name: mr.author.username || mr.author.name,
        avatarUrl: mr.author.avatar_url || "",
      },
      state: {
        name: state,
        color: GitLab.getColorForStatus(state, mr.work_in_progress),
        draft: mr.work_in_progress,
      },
      createdAt: mr.created_at,
    };
  }

  /**
   * Gets color for issue/MR status
   */
  private static getColorForStatus(
    state: string,
    isDraft = false
  ): string {
    if (isDraft) {
      return "#6B7280"; // Gray for draft
    }

    switch (state.toLowerCase()) {
      case "opened":
      case "open":
        return "#10B981"; // Green
      case "closed":
        return "#EF4444"; // Red
      case "merged":
        return "#8B5CF6"; // Purple
      default:
        return "#6B7280"; // Gray
    }
  }

  /**
   * Unfurls a GitLab URL
   *
   * @param url GitLab resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitLab Issue or Merge Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    // Early return if URL doesn't match GitLab pattern (before any DB queries)
    const resource = GitLab.parseUrl(url);

    if (!resource) {
      return;
    }

    const config = await getGitLabConfig(actor.teamId);

    if (!config.GITLAB_URL || !config.GITLAB_CLIENT_ID || !config.GITLAB_CLIENT_SECRET) {
      // Интеграция не настроена для этой команды – просто не делаем unfurl
      return;
    }

    // Find integration for the team
    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitLab,
        teamId: actor.teamId,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const accessToken = await GitLab.getAccessToken(integration);
      if (!accessToken) {
        return { error: "No access token available" };
      }

      const data = await GitLab.fetchResource(
        resource.namespace,
        resource.project,
        resource.type,
        resource.id,
        accessToken,
        config.GITLAB_URL
      );

      if (!data) {
        return { error: "Resource not found" };
      }

      if (resource.type === UnfurlResourceType.Issue) {
        return GitLab.transformIssue(data as GitLabIssue);
      }

      return GitLab.transformMergeRequest(data as GitLabMergeRequest);
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitLab", err);
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  };
}
