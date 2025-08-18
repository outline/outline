import { z } from "zod";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration } from "@server/models";
import User from "@server/models/User";
import { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { GitLabUtils } from "../shared/GitLabUtils";
import env from "./env";

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  created_at: z.number(),
});

const GitLabProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path_with_namespace: z.string(),
  avatar_url: z.string().optional(),
});

const GitLabIssueSchema = z.object({
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  created_at: z.string(),
  author: z.object({
    id: z.number(),
    name: z.string(),
    avatar_url: z.string().nullable(),
  }),
  labels: z.array(z.string()).optional(),
});

const GitLabMergeRequestSchema = z.object({
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  created_at: z.string(),
  author: z.object({
    id: z.number(),
    name: z.string(),
    avatar_url: z.string().nullable(),
  }),
  labels: z.array(z.string()).optional(),
  draft: z.boolean().optional(),
});

export class GitLab {
  private static supportedUnfurls = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  static async oauthAccess(code: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    const body = new URLSearchParams();
    body.set("code", code);
    body.set("client_id", env.GITLAB_CLIENT_ID!);
    body.set("client_secret", env.GITLAB_CLIENT_SECRET!);
    body.set("redirect_uri", GitLabUtils.callbackUrl());
    body.set("grant_type", "authorization_code");

    const res = await fetch(GitLabUtils.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    if (res.status !== 200) {
      throw new Error(
        `Error while exchanging oauth code from GitLab; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }

  static async revokeAccess(accessToken: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    const body = new URLSearchParams();
    body.set("client_id", env.GITLAB_CLIENT_ID!);
    body.set("client_secret", env.GITLAB_CLIENT_SECRET!);
    body.set("token", accessToken);

    await fetch(GitLabUtils.revokeUrl, {
      method: "POST",
      headers,
      body,
    });
  }

  static async getInstalledProject(accessToken: string) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    // Get the first project the user has access to
    // In a real implementation, we would want to let the user select which project to connect
    const res = await fetch(
      "https://gitlab.com/api/v4/projects?membership=true&per_page=1",
      {
        headers,
      }
    );

    if (res.status !== 200) {
      throw new Error(
        `Error while fetching GitLab projects; status: ${res.status}`
      );
    }

    const projects = await res.json();
    if (!projects.length) {
      throw new Error("No GitLab projects found");
    }

    return GitLabProjectSchema.parse(projects[0]);
  }

  /**
   *
   * @param url GitLab resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitLab issue or merge request details
   */
  static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = GitLab.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.scope("withAuthentication").findOne({
      where: {
        service: IntegrationService.GitLab,
        teamId: actor.teamId,
        "settings.gitlab.project.path_with_namespace": resource.projectPath,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${integration.authentication.token}`,
        Accept: "application/json",
      };

      let apiUrl: string;
      let resourceSchema: z.ZodObject<z.ZodRawShape>;
      let resourceType: UnfurlResourceType;

      if (resource.type === "issues") {
        apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(resource.projectPath)}/issues/${resource.id}`;
        resourceSchema = GitLabIssueSchema;
        resourceType = UnfurlResourceType.Issue;
      } else if (resource.type === "merge_requests") {
        apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(resource.projectPath)}/merge_requests/${resource.id}`;
        resourceSchema = GitLabMergeRequestSchema;
        resourceType = UnfurlResourceType.PR;
      } else {
        return;
      }

      const res = await fetch(apiUrl, { headers });

      if (res.status !== 200) {
        return { error: `Resource not found (${res.status})` };
      }

      const data = resourceSchema.parse(await res.json());

      // Fetch labels if they exist
      let labels = [];
      if (data.labels && data.labels.length > 0) {
        labels = data.labels.map((label) => ({
          name: label,
          color: "#428BCA", // Default GitLab blue
        }));
      }

      return {
        type: resourceType,
        url,
        id: `#${data.iid}`,
        title: data.title,
        description: data.description,
        author: {
          name: data.author.name,
          avatarUrl: data.author.avatar_url || "",
        },
        labels,
        state: {
          name: data.state,
          color: data.state === "opened" ? "#1aaa55" : "#db3b21", // Green for open, red for closed
          draft:
            resourceType === UnfurlResourceType.PR ? data.draft : undefined,
        },
        createdAt: data.created_at,
      } satisfies UnfurlIssueOrPR;
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitLab", err);
      return { error: err.message || "Unknown error" };
    }
  };

  /**
   * Parses a given URL and returns resource identifiers for GitLab specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `projectPath`, `type`, and `id`.
   */
  private static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "gitlab.com") {
      return;
    }

    const parts = pathname.split("/");
    // Remove empty first element
    parts.shift();

    // GitLab URLs are in the format: /namespace/project/-/issues/1 or /namespace/project/-/merge_requests/1
    // The namespace can have multiple levels (e.g., /group/subgroup/project/-/issues/1)
    if (parts.length < 4) {
      return;
    }

    // Find the index of "-" which separates project path from resource type
    const separatorIndex = parts.indexOf("-");
    if (separatorIndex === -1 || separatorIndex === parts.length - 1) {
      return;
    }

    const projectPath = parts.slice(0, separatorIndex).join("/");
    const type = parts[separatorIndex + 1];
    const id = parts[separatorIndex + 2];

    if (
      !type ||
      !id ||
      !GitLab.supportedUnfurls.includes(type as UnfurlResourceType)
    ) {
      return;
    }

    return { projectPath, type, id };
  }
}
