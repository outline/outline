import fetch from "node-fetch";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication, User } from "@server/models";
import { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import {
  GitLabUtils,
  MR,
  Issue,
  projectsSchema,
  UserInfoResponseSchema,
  AccessTokenResponseSchema,
} from "../shared/GitLabUtils";
import env from "./env";

export class GitLab {
  private static clientSecret = env.GITLAB_CLIENT_SECRET;
  private static clientId = env.GITLAB_CLIENT_ID;

  /**
   * Fetches current user information
   *
   * @param accessToken Access token received from OAuth flow
   * @returns User information
   */
  public static async getCurrentUser(accessToken: string) {
    const userData = await GitLabUtils.apiRequest({
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
    const projects = await GitLabUtils.apiRequest({
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

  /**
   * @param url GitLab resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitLab Merge Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = GitLabUtils.parseUrl(url);
    if (!resource) {
      return;
    }

    // to do: consider any ways to narrow this down
    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitLab,
        teamId: actor.teamId,
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
      const token = await integration.authentication.refreshTokenIfNeeded(
        async (refreshToken: string) => GitLab.refreshToken(refreshToken)
      );

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = await GitLabUtils.getIssue(
          token,
          projectPath,
          resource.id
        );

        return this.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = (await GitLabUtils.getMergeRequest(
          token,
          projectPath,
          resource.id
        )) as MR;
        return this.transformMR(mr);
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

  private static async refreshToken(refreshToken: string) {
    const queryParams = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: GitLabUtils.callbackUrl(),
    });

    const res = await fetch(
      `${GitLabUtils.oauthUrl}/token?${queryParams.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      }
    );
    const resJson = await res.json();
    if (res.status !== 200) {
      Logger.error("failed to refresh access token from GitLab", resJson);
      throw new Error(
        `Error while refreshing access token from GitLab; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(resJson);
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
