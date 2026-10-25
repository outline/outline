import z from "zod";
import {
  type IntegrationType,
  IntegrationService,
  UnfurlResourceType,
} from "@shared/types";
import { toError, errToString } from "@shared/utils/error";
import { Second } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration, IntegrationAuthentication } from "@server/models";
import type {
  UnfurlIssueOrPR,
  UnfurlProject,
  UnfurlSignature,
} from "@server/types";
import fetch from "@server/utils/fetch";
import { GiteaUtils } from "../shared/GiteaUtils";

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
});

const UserSchema = z.object({
  id: z.number(),
  login: z.string(),
  full_name: z.string().nullish(),
  avatar_url: z.string(),
});

const LabelSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
});

const IssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullish(),
  html_url: z.string(),
  state: z.string(),
  user: UserSchema,
  labels: z.array(LabelSchema).nullish(),
  created_at: z.string(),
});

const PullRequestSchema = IssueSchema.extend({
  merged: z.boolean().nullish(),
  draft: z.boolean().nullish(),
});

const RepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullish(),
  html_url: z.string(),
  avatar_url: z.string().nullish(),
  private: z.boolean().nullish(),
  internal: z.boolean().nullish(),
  owner: UserSchema,
  topics: z.array(z.string()).nullish(),
  open_issues_count: z.number().nullish(),
  created_at: z.string(),
});

type Repository = z.infer<typeof RepositorySchema>;

interface RepositoryParams {
  baseUrl: string;
  accessToken: string;
  owner: string;
  repo: string;
}

export class Gitea {
  /**
   * Fetches the user that owns the access token.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.accessToken - the access token for authentication.
   * @returns the user information.
   */
  public static async getCurrentUser(params: {
    baseUrl: string;
    accessToken: string;
  }) {
    const { data } = await this.request({
      ...params,
      path: "/user",
      schema: UserSchema,
    });
    return data;
  }

  /**
   * Fetches the repositories that the user can access.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.accessToken - the access token for authentication.
   * @returns an array of repositories.
   */
  public static async getRepositories(params: {
    baseUrl: string;
    accessToken: string;
  }) {
    const { data } = await this.request({
      ...params,
      path: "/user/repos?limit=50",
      schema: z.array(RepositorySchema),
    });
    return data;
  }

  /**
   * Fetches an issue from a Gitea repository.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.accessToken - the access token for authentication.
   * @param params.owner - the owner of the repository.
   * @param params.repo - the name of the repository.
   * @param params.id - the issue number.
   * @returns the issue data.
   */
  public static async getIssue({
    id,
    ...params
  }: RepositoryParams & { id: number }) {
    const { data } = await this.request({
      ...params,
      path: `${this.repositoryPath(params)}/issues/${id}`,
      schema: IssueSchema,
    });
    return data;
  }

  /**
   * Fetches a pull request from a Gitea repository.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.accessToken - the access token for authentication.
   * @param params.owner - the owner of the repository.
   * @param params.repo - the name of the repository.
   * @param params.id - the pull request number.
   * @returns the pull request data.
   */
  public static async getPullRequest({
    id,
    ...params
  }: RepositoryParams & { id: number }) {
    const { data } = await this.request({
      ...params,
      path: `${this.repositoryPath(params)}/pulls/${id}`,
      schema: PullRequestSchema,
    });
    return data;
  }

  /**
   * Fetches a Gitea repository and its count of closed issues.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.accessToken - the access token for authentication.
   * @param params.owner - the owner of the repository.
   * @param params.repo - the name of the repository.
   * @returns the repository data and the number of closed issues.
   */
  public static async getRepository(params: RepositoryParams) {
    const path = this.repositoryPath(params);
    const [repository, closed] = await Promise.all([
      this.request({ ...params, path, schema: RepositorySchema }),
      // The issue list is not available when the issue tracker is disabled.
      this.request({
        ...params,
        path: `${path}/issues?state=closed&type=issues&limit=1`,
        schema: z.array(z.object({})),
      }).catch(() => undefined),
    ]);

    return {
      repository: repository.data,
      closedIssues: Number(closed?.headers.get("x-total-count")) || 0,
    };
  }

  /**
   * @param url Gitea resource url.
   * @param actor User attempting to unfurl resource url.
   * @returns An object containing resource details e.g, a Gitea pull request.
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const integrations = (await Integration.findAll({
      where: {
        service: IntegrationService.Gitea,
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

    let matchedIntegration: Integration<IntegrationType.Embed> | undefined;
    let resource: ReturnType<typeof GiteaUtils.parseUrl>;

    for (const integration of integrations) {
      const settings = integration.settings?.gitea;

      // Integrations without an installation have not completed OAuth yet.
      resource = settings?.installation
        ? GiteaUtils.parseUrl(url, settings.url)
        : undefined;
      if (resource) {
        matchedIntegration = integration;
        break;
      }
    }

    const baseUrl = matchedIntegration?.settings?.gitea?.url;
    if (!resource || !matchedIntegration || !baseUrl) {
      return;
    }

    try {
      const { authentication } = matchedIntegration;
      const accessToken = await authentication.refreshTokenIfNeeded(
        async (refreshToken: string) =>
          Gitea.refreshToken({
            baseUrl,
            refreshToken,
            clientId: authentication.clientId,
            clientSecret: authentication.clientSecret,
          })
      );

      const params = {
        baseUrl,
        accessToken,
        owner: resource.owner,
        repo: resource.repo,
      };

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = await this.getIssue({ ...params, id: resource.id });
        return this.transformIssue(issue);
      }

      if (resource.type === UnfurlResourceType.PR) {
        const pr = await this.getPullRequest({ ...params, id: resource.id });
        return this.transformPullRequest(pr);
      }

      const { repository, closedIssues } = await this.getRepository(params);
      return this.transformRepository(repository, closedIssues);
    } catch (err) {
      Logger.warn("Failed to fetch resource from Gitea", toError(err));
      return {
        error: errToString(err) || "Unknown error",
      };
    }
  };

  /**
   * Exchanges an authorization code for an access token.
   *
   * @param params.code - the authorization code from the OAuth callback.
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.clientId - the OAuth client ID of the Gitea application.
   * @param params.clientSecret - the OAuth client secret of the Gitea application.
   * @returns the parsed access token response.
   */
  public static async oauthAccess({
    code,
    baseUrl,
    clientId,
    clientSecret,
  }: {
    code: string;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  }) {
    return this.requestToken(baseUrl, {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: GiteaUtils.callbackUrl(),
    });
  }

  /**
   * Exchanges a refresh token for a new access token.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.refreshToken - the refresh token.
   * @param params.clientId - the OAuth client ID of the Gitea application.
   * @param params.clientSecret - the OAuth client secret of the Gitea application.
   * @returns the parsed access token response.
   * @throws if the client credentials are missing or the request fails.
   */
  public static async refreshToken({
    baseUrl,
    refreshToken,
    clientId,
    clientSecret,
  }: {
    baseUrl: string;
    refreshToken: string;
    clientId: string | null;
    clientSecret: string | null;
  }) {
    if (!clientId || !clientSecret) {
      throw new Error("Gitea integration is missing client credentials");
    }

    return this.requestToken(baseUrl, {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });
  }

  /** The time to wait for a response from a Gitea instance. */
  private static timeout = 10 * Second.ms;

  /**
   * Makes an authenticated GET request to the Gitea API.
   *
   * @param params.baseUrl - the URL of the Gitea instance.
   * @param params.accessToken - the access token for authentication.
   * @param params.path - the API path, starting with a slash.
   * @param params.schema - the schema to parse the response body with.
   * @returns the parsed body and the response headers.
   * @throws if the response status is not successful.
   */
  private static async request<T extends z.ZodType>({
    baseUrl,
    accessToken,
    path,
    schema,
  }: {
    baseUrl: string;
    accessToken: string;
    path: string;
    schema: T;
  }) {
    const res = await fetch(`${GiteaUtils.getApiUrl(baseUrl)}${path}`, {
      timeout: this.timeout,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(
        `Error while requesting ${path} from Gitea; status: ${res.status}`
      );
    }

    // Read the body at once, a body left unread while awaiting other requests
    // can be closed early.
    return { data: schema.parse(await res.json()), headers: res.headers };
  }

  private static repositoryPath({ owner, repo }: RepositoryParams) {
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }

  private static async requestToken(
    baseUrl: string,
    body: Record<string, string>
  ) {
    const res = await fetch(`${GiteaUtils.getOauthUrl(baseUrl)}/access_token`, {
      method: "POST",
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status !== 200) {
      throw new Error(
        `Error while requesting access token from Gitea; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }

  private static transformIssue(issue: z.infer<typeof IssueSchema>) {
    return {
      type: UnfurlResourceType.Issue,
      url: issue.html_url,
      id: `#${issue.number}`,
      title: issue.title,
      description: issue.body || null,
      author: {
        name: issue.user.login,
        avatarUrl: issue.user.avatar_url,
      },
      labels: (issue.labels ?? []).map((label) => ({
        name: label.name,
        color: GiteaUtils.normalizeColor(label.color),
      })),
      state: {
        name: issue.state,
        color: GiteaUtils.getColorForStatus(issue.state),
      },
      createdAt: issue.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static transformPullRequest(pr: z.infer<typeof PullRequestSchema>) {
    const state = pr.merged ? "merged" : pr.state;
    const draft = !!pr.draft;

    return {
      type: UnfurlResourceType.PR,
      url: pr.html_url,
      id: `#${pr.number}`,
      title: pr.title,
      description: pr.body ?? "",
      author: {
        name: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      state: {
        name: state,
        color: GiteaUtils.getColorForStatus(state, draft),
        draft,
      },
      createdAt: pr.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static transformRepository(repo: Repository, closedIssues: number) {
    const visibility = repo.private
      ? "private"
      : repo.internal
        ? "internal"
        : "public";
    const total = (repo.open_issues_count ?? 0) + closedIssues;

    return {
      type: UnfurlResourceType.Project,
      url: repo.html_url,
      id: String(repo.id),
      name: repo.name,
      color: GiteaUtils.getColorForRepository(repo.id),
      avatarUrl: repo.avatar_url || undefined,
      description: repo.description || null,
      lead: {
        name: repo.owner.full_name || repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
      state: {
        type: visibility,
        name: visibility.charAt(0).toUpperCase() + visibility.slice(1),
        color: GiteaUtils.getColorForVisibility(visibility),
      },
      labels: (repo.topics ?? []).map((topic) => ({
        name: topic,
        color: GiteaUtils.defaultLabelColor,
      })),
      progress: total > 0 ? closedIssues / total : 0,
      createdAt: repo.created_at,
      targetDate: null,
    } satisfies UnfurlProject;
  }
}
