import fetch, { RequestInit } from "node-fetch";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication, User } from "@server/models";
import { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { GitLabUtils } from "../shared/GitLabUtils";
import env from "./env";
import z from "zod";

type MR = {
  iid: number;
  title: string;
  description: string;
  web_url: string;
  state: string;
  draft: boolean;
  merged_at: string | null;
  created_at: string;
  author: {
    username: string;
    avatar_url: string;
  };
  labels: string[];
};

type Issue = {
  iid: number;
  title: string;
  description: string;
  web_url: string;
  state: string;
  created_at: string;
  author: {
    username: string;
    avatar_url: string;
  };
  labels: { name: string; color: string }[];
};

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  created_at: z.number(),
});

const UserInfoResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().url(),
});

const projectsSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    namespace: z.object({
      id: z.number(),
      full_path: z.string(),
    }),
  })
);

const ApplicationSchema = z.object({
  id: z.number(),
  application_id: z.string(),
  application_name: z.string(),
  callback_url: z.string().url(),
  confidential: z.boolean(),
});

export class GitLab {
  private static clientId = env.GITLAB_CLIENT_ID;
  private static clientSecret = env.GITLAB_CLIENT_SECRET;

  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  /**
   * Parses a given URL and returns resource identifiers for GitLab specific URLs
   *
   * @param url URL to parse
   * @returns Containing resource identifiers - `owner`, `repo`, `type` and `id`.
   */
  public static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "gitlab.com") {
      return;
    }

    // GitLab URLs: /owner/repo/-/issues/123 or /owner/repo/-/merge_requests/123
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 4) {
      return;
    }

    const owner = parts[0];
    const repo = parts[1];

    // Find the resource type index
    let typeIndex = -1;
    let type: UnfurlResourceType | undefined;

    if (parts.includes("issues")) {
      typeIndex = parts.indexOf("issues");
      type = UnfurlResourceType.Issue;
    } else if (parts.includes("merge_requests")) {
      typeIndex = parts.indexOf("merge_requests");
      type = UnfurlResourceType.PR;
    }

    if (typeIndex === -1 || !type) {
      return;
    }

    const id = Number(parts[typeIndex + 1]);

    if (!type || !GitLab.supportedResources.includes(type)) {
      return;
    }

    return { owner, repo, type, id, url };
  }

  /**
   * Makes an authenticated API request to GitLab
   *
   * @param accessToken Access token for authentication
   * @param endpoint API endpoint path
   * @returns Response data from GitLab API
   */
  private static async apiRequest({
    accessToken,
    endpoint,
    params,
    query,
  }: {
    accessToken: string;
    endpoint: string;
    params?: RequestInit;
    query?: Record<string, string | number | boolean>;
  }): Promise<any> {
    const url = new URL(`${GitLabUtils.apiBaseUrl}${endpoint}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    try {
      const response = await fetch(url.toString(), {
        ...params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...params?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitLab API error: ${response.status} ${response.statusText} (${endpoint})`
        );
      }

      return response.json();
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Failed to fetch from GitLab API: ${endpoint}`);
    }
  }

  /**
   * Fetches current user information
   *
   * @param accessToken Access token received from OAuth flow
   * @returns User information
   */
  public static async getCurrentUser(accessToken: string) {
    const userData = await GitLab.apiRequest({
      accessToken,
      endpoint: "/user",
    });

    return UserInfoResponseSchema.parse(userData);
  }

  /**
   * Fetches projects accessible to the user
   *
   * @param accessToken Access token for authentication
   * @returns Array of projects
   */
  public static async getProjects(accessToken: string) {
    const projects = await GitLab.apiRequest({
      accessToken,
      endpoint: "/projects",
      query: {
        simple: true,
        per_page: 100,
        min_access_level: 40, // At least Maintanier access to reduce the sheer volume of projects
      },
    });

    return projectsSchema.parse(projects);
  }

  public static async validateApplication({
    accessToken,
    applicationId,
  }: {
    accessToken: string;
    applicationId: string;
  }) {
    const applications = await GitLab.apiRequest({
      accessToken,
      endpoint: "/applications",
    });

    const application = applications.find(
      (app: any) => app.application_id === applicationId
    );

    return ApplicationSchema.parse(application);
  }

  /**
   * Fetches an issue from a GitLab project
   *
   * @param accessToken Access token for authentication
   * @param projectPath Project path (owner/repo)
   * @param issueId Issue IID
   * @returns Issue data
   */
  public static async getIssue(
    accessToken: string,
    projectPath: string,
    issueId: number
  ) {
    const encodedPath = encodeURIComponent(projectPath);
    const issue = GitLab.apiRequest({
      accessToken,
      endpoint: `/projects/${encodedPath}/issues/${issueId}`,
    });

    return issue;
  }

  /**
   * Fetches a merge request from a GitLab project
   *
   * @param accessToken Access token for authentication
   * @param projectPath Project path (owner/repo)
   * @param mrId Merge request IID
   * @returns Merge request data
   */
  public static async getMergeRequest(
    accessToken: string,
    projectPath: string,
    mrId: number
  ) {
    const encodedPath = encodeURIComponent(projectPath);
    return GitLab.apiRequest({
      accessToken,
      endpoint: `/projects/${encodedPath}/merge_requests/${mrId}`,
    });
  }

  /**
   * @param url GitLab resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitLab Merge Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = GitLab.parseUrl(url);
    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitLab,
        teamId: actor.teamId,
        "settings.gitlab.installation.account.name": resource.owner,
      },
      include: [
        {
          model: IntegrationAuthentication,
          as: "authentication",
          required: true,
        },
      ],
    })) as Integration<IntegrationType.Embed>;

    if (!integration || !integration.authentication) {
      return;
    }

    try {
      const projectPath = `${resource.owner}/${resource.repo}`;
      const token = integration.authentication.token;

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = (await GitLab.getIssue(
          token,
          projectPath,
          resource.id
        )) as Issue;
        return GitLab.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = (await GitLab.getMergeRequest(
          token,
          projectPath,
          resource.id
        )) as MR;
        return GitLab.transformMR(mr);
      }

      return { error: "Resource not found" };
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitLab", err);
      return { error: err.message || "Unknown error" };
    }
  };

  public static oauthAccess = async (code?: string | null) => {
    const res = await fetch(GitLabUtils.oauthUrl + "/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: GitLabUtils.callbackUrl(),
      }),
    });

    if (res.status !== 200) {
      throw new Error(
        `Error while validating oauth code from GitLab; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  };

  static async refreshToken(refreshToken: string) {
    const res = await fetch(GitLabUtils.oauthUrl + "/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        redirect_uri: GitLabUtils.callbackUrl(),
      }),
    });

    if (res.status !== 200) {
      throw new Error(
        `Error while refreshing access token from GitLab; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }

  private static transformIssue(issue: Issue) {
    return {
      type: UnfurlResourceType.Issue,
      url: issue.web_url,
      id: `#${issue.iid}`,
      title: issue.title,
      description: issue.description ?? null,
      author: {
        name: issue.author?.username ?? "",
        avatarUrl: issue.author?.avatar_url ?? "",
      },
      labels: issue.labels.map((label) => ({
        name: label.name,
        color: `#${label.color}`,
      })),
      state: {
        name: issue.state,
        color: GitLabUtils.getColorForStatus(issue.state),
      },
      createdAt: issue.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static transformMR(mr: MR) {
    const mrState = mr.merged_at ? "merged" : mr.state;
    return {
      type: UnfurlResourceType.PR,
      url: mr.web_url,
      id: `!${mr.iid}`,
      title: mr.title,
      description: mr.description,
      author: {
        name: mr.author.username,
        avatarUrl: mr.author.avatar_url,
      },
      state: {
        name: mrState,
        color: GitLabUtils.getColorForStatus(mrState, !!mr.draft),
        draft: mr.draft,
      },
      createdAt: mr.created_at,
    } satisfies UnfurlIssueOrPR;
  }
}
