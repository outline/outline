import fetch from "node-fetch";
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
  private static clientSecret = env.GITLAB_CLIENT_SECRET;

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

  public static async validateApplication({
    accessToken,
    applicationId,
  }: {
    accessToken: string;
    applicationId: string;
  }) {
    const applications = await GitLabUtils.apiRequest({
      accessToken,
      endpoint: "/applications",
    });

    const application = applications.find(
      (app: any) => app.application_id === applicationId
    );

    return ApplicationSchema.parse(application);
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

    // to do: consider any ways to make this more accurate
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
        const issue = (await GitLabUtils.getIssue(
          token,
          projectPath,
          resource.id
        )) as Issue;
        return GitLab.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = (await GitLabUtils.getMergeRequest(
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
        client_id: env.GITLAB_CLIENT_ID,
        client_secret: env.GITLAB_CLIENT_SECRET,
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
    const res = await fetch(GitLabUtils.oauthUrl + "/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITLAB_CLIENT_ID,
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
