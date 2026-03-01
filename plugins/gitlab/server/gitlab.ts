import { Gitlab } from "@gitbeaker/rest";
import type {
  IssueSchemaWithExpandedLabels,
  MergeRequestSchema,
} from "@gitbeaker/rest";
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
import fetch from "@server/utils/fetch";
import { validateUrlNotPrivate } from "@server/utils/url";
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

export class GitLab {
  private static clientSecret = env.GITLAB_CLIENT_SECRET;
  private static clientId = env.GITLAB_CLIENT_ID;

  /**
   * Fetches the custom GitLab URL for a team from the first matching
   * integration, falling back to the default.
   *
   * @param teamId - The team ID to fetch settings for.
   * @returns The GitLab URL to use.
   */
  public static async getGitLabUrl(teamId: string) {
    const integration = await Integration.findOne({
      where: { service: IntegrationService.GitLab, teamId },
    });

    const url = (integration?.settings as { gitlab?: { url?: string } })?.gitlab
      ?.url;

    return url || GitLabUtils.defaultGitlabUrl;
  }

  /**
   * Creates a Gitbeaker client instance.
   *
   * @param accessToken - The access token for authentication.
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @returns A configured Gitbeaker client.
   */
  public static async createClient(accessToken: string, customUrl?: string) {
    const host = customUrl || GitLabUtils.defaultGitlabUrl;

    // Validate the URL to prevent SSRF as GitLab instance does not use our
    // fetch wrapper which has built-in SSRF protection.
    await validateUrlNotPrivate(host);

    return new Gitlab({
      host,
      oauthToken: accessToken,
    });
  }

  /**
   * Fetches an issue from a GitLab project.
   *
   * @param accessToken - The access token for authentication.
   * @param projectPath - The project path (owner/repo).
   * @param issueIid - The issue IID (internal ID within the project).
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @returns The issue data.
   */
  public static async getIssue(
    accessToken: string,
    projectPath: string,
    issueIid: number,
    customUrl?: string
  ) {
    const client = await this.createClient(accessToken, customUrl);

    const issues = await client.Issues.all({
      projectId: projectPath,
      iids: [issueIid],
      withLabelsDetails: true,
    });

    if (!issues || issues.length === 0) {
      throw new Error(`Issue ${issueIid} not found in project ${projectPath}`);
    }

    return issues[0];
  }

  /**
   * Fetches a merge request from a GitLab project.
   *
   * @param accessToken - The access token for authentication.
   * @param projectPath - The project path (owner/repo).
   * @param mrIid - The merge request IID (internal ID within the project).
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @returns The merge request data.
   */
  public static async getMergeRequest(
    accessToken: string,
    projectPath: string,
    mrIid: number,
    customUrl?: string
  ) {
    const client = await this.createClient(accessToken, customUrl);
    const mr = await client.MergeRequests.show(projectPath, mrIid);
    return mr;
  }

  /**
   * Fetches current user information.
   *
   * @param params.accessToken - Access token received from OAuth flow.
   * @param params.customUrl - Optional custom GitLab URL. Falls back to default.
   * @returns User information including the resolved URL.
   */
  public static async getCurrentUser({
    accessToken,
    customUrl,
  }: {
    accessToken: string;
    customUrl?: string;
  }) {
    const url = customUrl || GitLabUtils.defaultGitlabUrl;
    const client = await this.createClient(accessToken, url);

    const userData = await client.Users.showCurrentUser({
      showExpanded: false,
    });
    return { ...userData, url };
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
    const client = await this.createClient(accessToken, customUrl);

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
      Logger.debug(
        "plugins",
        `No GitLab integrations found for team ${actor.teamId}`
      );
      return;
    }

    // Try to parse the URL against each integration's custom URL
    let matchedIntegration: Integration<IntegrationType.Embed> | undefined;
    let resource: ReturnType<typeof GitLabUtils.parseUrl>;

    for (const integration of integrations) {
      const customUrl = integration.settings?.gitlab?.url;
      resource = GitLabUtils.parseUrl(url, customUrl);
      if (resource) {
        matchedIntegration = integration;
        break;
      }
    }

    if (!resource) {
      Logger.debug(
        "plugins",
        `Could not parse GitLab resource from URL: ${url}`
      );
      return;
    }

    if (!matchedIntegration?.authentication) {
      Logger.debug(
        "plugins",
        `No authentication found for matched integration`
      );
      return;
    }

    try {
      const customUrl = matchedIntegration.settings?.gitlab?.url;
      const projectPath = `${resource.owner}/${resource.repo}`;
      const { authentication } = matchedIntegration;
      const token = await authentication.refreshTokenIfNeeded(
        async (refreshToken: string) =>
          GitLab.refreshToken({
            refreshToken,
            customUrl,
            clientId: authentication.clientId ?? undefined,
            clientSecret: authentication.clientSecret ?? undefined,
          })
      );

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = await this.getIssue(
          token,
          projectPath,
          resource.id,
          customUrl
        );

        return this.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = await this.getMergeRequest(
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

  /**
   * Exchanges an authorization code for an access token.
   *
   * @param params.code - The authorization code from the OAuth callback.
   * @param params.customUrl - Optional custom GitLab URL. Falls back to default.
   * @param params.clientId - Optional custom client ID (falls back to env var).
   * @param params.clientSecret - Optional custom client secret (falls back to env var).
   * @returns The parsed access token response.
   */
  public static oauthAccess = async ({
    code,
    customUrl,
    clientId,
    clientSecret,
  }: {
    code?: string | null;
    customUrl?: string;
    clientId?: string;
    clientSecret?: string;
  }) => {
    const url = customUrl || GitLabUtils.defaultGitlabUrl;
    const res = await fetch(GitLabUtils.getOauthUrl(url) + "/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: clientId || this.clientId,
        client_secret: clientSecret || this.clientSecret,
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
    clientId,
    clientSecret,
  }: {
    refreshToken: string;
    customUrl?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    const queryParams = new URLSearchParams({
      client_id: clientId || this.clientId!,
      client_secret: clientSecret || this.clientSecret!,
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
        color: label.color,
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
