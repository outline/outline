import fetch from "node-fetch";
import z from "zod";
import {
  type IntegrationType,
  IntegrationService,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration, IntegrationAuthentication } from "@server/models";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { GitLabUtils } from "../shared/GitLabUtils";
import env from "./env";
import type {
  IssueSchemaWithExpandedLabels,
  MergeRequestSchema,
} from "@gitbeaker/rest";

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  created_at: z.number(),
});

export class GitLab {
  private static clientSecret = env.GITLAB_CLIENT_SECRET;
  private static clientId = env.GITLAB_CLIENT_ID;

  public static async getGitLabUrl(teamId: string) {
    const integrations = await Integration.findOne({
      where: { service: IntegrationService.GitLab, teamId },
    });

    const customUrl = (integrations?.settings as { gitlab: { url: string } })
      ?.gitlab?.url;

    return customUrl || GitLabUtils.defaultGitlabUrl;
  }

  /**
   * Fetches current user information.
   *
   * @param accessToken - Access token received from OAuth flow.
   * @returns User information.
   */
  public static async getCurrentUser({
    accessToken,
    teamId,
  }: {
    accessToken: string;
    teamId: string;
  }) {
    const customUrl = await this.getGitLabUrl(teamId);
    const client = GitLabUtils.createClient(accessToken, customUrl);

    const userData = await client.Users.showCurrentUser({
      showExpanded: false,
    });
    return { ...userData, url: customUrl };
  }

  /**
   * Fetches projects accessible to the user.
   *
   * @param accessToken - Access token for authentication.
   * @returns Array of projects.
   */
  public static async getProjects({
    accessToken,
    teamId,
  }: {
    accessToken: string;
    teamId: string;
  }) {
    const customUrl = await this.getGitLabUrl(teamId);
    const client = GitLabUtils.createClient(accessToken, customUrl);

    const projects = await client.Projects.all({
      simple: true,
      perPage: 100,
      minAccessLevel: 40, // At least Maintainer access to reduce the sheer volume of projects
    });
    return projects;
  }

  /**
   * @param url GitLab resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitLab Merge Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const integrations = (await Integration.findAll({
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
    })) as Integration<IntegrationType.Embed>[];

    if (integrations.length === 0) {
      return;
    }

    // All integrations share the same URL configuration
    const customUrl = integrations[0].settings?.gitlab?.url;
    const resource = GitLabUtils.parseUrl(url, customUrl);

    if (!resource) {
      return;
    }

    // Find integration that has access to this owner
    const matchedIntegration = integrations.find((integration) => {
      const issueSources = integration.issueSources as
        | Array<{
            owner: { name: string };
          }>
        | undefined;
      return issueSources?.some(
        (source) => source.owner.name === resource.owner
      );
    });

    if (!matchedIntegration || !matchedIntegration.authentication) {
      return;
    }

    try {
      const projectPath = `${resource.owner}/${resource.repo}`;
      const token =
        await matchedIntegration.authentication.refreshTokenIfNeeded(
          async (refreshToken: string) =>
            GitLab.refreshToken({ refreshToken, customUrl })
        );

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = await GitLabUtils.getIssue(
          token,
          projectPath,
          resource.id,
          customUrl
        );

        return this.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = await GitLabUtils.getMergeRequest(
          token,
          projectPath,
          resource.id,
          customUrl
        );
        return this.transformMR(mr);
      }

      return { error: "Resource not found" };
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitLab", err);
      return { error: err.message || "Unknown error" };
    }
  };

  public static oauthAccess = async ({
    code,
    teamId,
  }: {
    code?: string | null;
    teamId: string;
  }) => {
    const customUrl = await this.getGitLabUrl(teamId);
    const res = await fetch(GitLabUtils.getOauthUrl(customUrl) + "/token", {
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

  private static async refreshToken({
    refreshToken,
    customUrl,
  }: {
    refreshToken: string;
    customUrl?: string;
  }) {
    const queryParams = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: GitLabUtils.callbackUrl(),
    });

    const res = await fetch(
      `${GitLabUtils.getOauthUrl(customUrl)}/token?${queryParams.toString()}`,
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

  private static transformIssue(issue: IssueSchemaWithExpandedLabels) {
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

  private static transformMR(mr: MergeRequestSchema) {
    const mrState = mr.merged_at ? "merged" : mr.state;
    return {
      type: UnfurlResourceType.PR,
      url: mr.web_url,
      id: `!${mr.iid}`,
      title: mr.title,
      description: mr.description ?? "",
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
