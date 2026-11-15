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
import fetch, { type Headers } from "@server/utils/fetch";
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

const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar_url: z.string().nullish(),
});

const LabelSchema = z.object({
  name: z.string(),
  color: z.string(),
});

const IssueSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  web_url: z.string(),
  state: z.string(),
  author: UserSchema.nullish(),
  labels: z.array(LabelSchema),
  created_at: z.string(),
});

// Epics are returned without label color details.
const EpicSchema = IssueSchema.extend({
  labels: z.array(z.string()),
});

const MergeRequestSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  web_url: z.string(),
  state: z.string(),
  author: UserSchema,
  draft: z.boolean().nullish(),
  merged_at: z.string().nullish(),
  created_at: z.string(),
});

const NamespaceSchema = z.object({
  id: z.number(),
  full_path: z.string(),
});

const SimpleProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  namespace: NamespaceSchema,
});

const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullish(),
  web_url: z.string(),
  avatar_url: z.string().nullish(),
  visibility: z.string().nullish(),
  owner: z
    .object({ name: z.string(), avatar_url: z.string().nullish() })
    .nullish(),
  topics: z.array(z.string()).nullish(),
  created_at: z.string(),
});

const IssueStatisticsSchema = z.object({
  statistics: z.object({
    counts: z.object({
      opened: z.number(),
      closed: z.number(),
    }),
  }),
});

type Issue = z.infer<typeof IssueSchema>;
type Epic = z.infer<typeof EpicSchema>;
type MergeRequest = z.infer<typeof MergeRequestSchema>;
type SimpleProject = z.infer<typeof SimpleProjectSchema>;
type Project = z.infer<typeof ProjectSchema>;
type IssueStatistics = z.infer<typeof IssueStatisticsSchema>;

interface RequestParams {
  accessToken: string;
  customUrl?: string;
}

interface ResourceParams extends RequestParams {
  path: string;
  id: number;
}

export class GitLab {
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
   * Fetches an issue from a GitLab project.
   *
   * @param params.accessToken - The access token for authentication.
   * @param params.customUrl - Optional custom GitLab URL from integration settings.
   * @param params.path - The project path (owner/repo).
   * @param params.id - The issue IID (internal ID within the project).
   * @returns The issue data.
   * @throws If the issue does not exist.
   */
  public static async getIssue({ path, id, ...params }: ResourceParams) {
    const { data } = await this.request({
      ...params,
      path: `/projects/${encodeURIComponent(path)}/issues?iids[]=${id}&with_labels_details=true`,
      schema: z.array(IssueSchema),
    });

    if (data.length === 0) {
      throw new Error(`Issue ${id} not found in project ${path}`);
    }

    return data[0];
  }

  /**
   * Fetches an epic from a GitLab group.
   *
   * @param params.accessToken - The access token for authentication.
   * @param params.customUrl - Optional custom GitLab URL from integration settings.
   * @param params.path - The full path of the group.
   * @param params.id - The epic IID (internal ID within the group).
   * @returns The epic data.
   */
  public static async getEpic({ path, id, ...params }: ResourceParams) {
    const { data } = await this.request({
      ...params,
      path: `/groups/${encodeURIComponent(path)}/epics/${id}`,
      schema: EpicSchema,
    });
    return data;
  }

  /**
   * Fetches a merge request from a GitLab project.
   *
   * @param params.accessToken - The access token for authentication.
   * @param params.customUrl - Optional custom GitLab URL from integration settings.
   * @param params.path - The project path (owner/repo).
   * @param params.id - The merge request IID (internal ID within the project).
   * @returns The merge request data.
   */
  public static async getMergeRequest({ path, id, ...params }: ResourceParams) {
    const { data } = await this.request({
      ...params,
      path: `/projects/${encodeURIComponent(path)}/merge_requests/${id}`,
      schema: MergeRequestSchema,
    });
    return data;
  }

  /**
   * Fetches a GitLab project and its issue statistics.
   *
   * @param params.accessToken - The access token for authentication.
   * @param params.customUrl - Optional custom GitLab URL from integration settings.
   * @param params.path - The project path (owner/repo).
   * @returns The project data and its issue statistics, if available.
   */
  public static async getProject({
    path,
    ...params
  }: RequestParams & { path: string }) {
    const projectPath = `/projects/${encodeURIComponent(path)}`;
    const [project, issueStats] = await Promise.all([
      this.request({ ...params, path: projectPath, schema: ProjectSchema }),
      // Statistics can be slow for projects with many issues, so they are optional.
      this.request({
        ...params,
        path: `${projectPath}/issues_statistics`,
        schema: IssueStatisticsSchema,
      }).catch(() => undefined),
    ]);

    return { project: project.data, issueStats: issueStats?.data };
  }

  /**
   * Fetches current user information.
   *
   * @param params.accessToken - Access token received from OAuth flow.
   * @param params.customUrl - Optional custom GitLab URL. Falls back to default.
   * @returns User information including the resolved URL.
   */
  public static async getCurrentUser(params: RequestParams) {
    const url = params.customUrl || GitLabUtils.defaultGitlabUrl;
    const { data } = await this.request({
      ...params,
      path: "/user",
      schema: UserSchema,
    });
    return { ...data, url };
  }

  /**
   * Fetches projects that the user can maintain.
   *
   * @param params.accessToken - Access token for authentication.
   * @param params.teamId - The team ID used to find the GitLab URL.
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
    const projects: SimpleProject[] = [];
    let page: string | null = "1";

    for (let i = 0; i < this.maxPages && page; i++) {
      const res: { data: SimpleProject[]; headers: Headers } =
        await this.request({
          accessToken,
          customUrl,
          // At least Maintainer access to reduce the sheer volume of projects.
          path: `/projects?simple=true&min_access_level=40&per_page=100&page=${page}`,
          schema: z.array(SimpleProjectSchema),
        });
      projects.push(...res.data);
      page = res.headers.get("x-next-page");
    }

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
      const { authentication } = matchedIntegration;
      const accessToken = await authentication.refreshTokenIfNeeded(
        async (refreshToken: string) =>
          GitLab.refreshToken({
            refreshToken,
            customUrl,
            clientId: authentication.clientId ?? undefined,
            clientSecret: authentication.clientSecret ?? undefined,
          })
      );

      // Epics are group-scoped, so they have no project path.
      if (
        resource.type === UnfurlResourceType.Issue &&
        resource.scope === "group"
      ) {
        const epic = await this.getEpic({
          accessToken,
          customUrl,
          path: resource.owner,
          id: resource.id,
        });

        return this.transformIssue(epic);
      }

      const path = `${resource.owner}/${resource.repo}`;

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = await this.getIssue({
          accessToken,
          customUrl,
          path,
          id: resource.id,
        });

        return this.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = await this.getMergeRequest({
          accessToken,
          customUrl,
          path,
          id: resource.id,
        });
        return this.transformMR(mr);
      } else if (resource.type === UnfurlResourceType.Project) {
        const { project, issueStats } = await this.getProject({
          accessToken,
          customUrl,
          path,
        });
        return this.transformProject(project, issueStats);
      }

      return { error: "Resource not found" };
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitLab", toError(err));
      return {
        error: errToString(err) || "Unknown error",
      };
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
  public static async oauthAccess({
    code,
    customUrl,
    clientId,
    clientSecret,
  }: {
    code?: string | null;
    customUrl?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    return this.requestToken(customUrl, {
      code: code ?? "",
      client_id: clientId || this.clientId || "",
      client_secret: clientSecret || this.clientSecret || "",
      grant_type: "authorization_code",
      redirect_uri: GitLabUtils.callbackUrl(),
    });
  }

  /** The time to wait for a response from a GitLab instance. */
  private static timeout = 10 * Second.ms;

  /** The maximum number of pages to fetch from a paginated endpoint. */
  private static maxPages = 10;

  private static clientSecret = env.GITLAB_CLIENT_SECRET;

  private static clientId = env.GITLAB_CLIENT_ID;

  /**
   * Makes an authenticated GET request to the GitLab API.
   *
   * @param params.accessToken - The access token for authentication.
   * @param params.customUrl - Optional custom GitLab URL from integration settings.
   * @param params.path - The API path, starting with a slash.
   * @param params.schema - The schema to parse the response body with.
   * @returns The parsed body and the response headers.
   * @throws If the response status is not successful.
   */
  private static async request<T extends z.ZodType>({
    accessToken,
    customUrl,
    path,
    schema,
  }: RequestParams & { path: string; schema: T }) {
    const baseUrl = customUrl || GitLabUtils.defaultGitlabUrl;
    const res = await fetch(`${baseUrl}/api/v4${path}`, {
      timeout: this.timeout,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(
        `Error while requesting ${path} from GitLab; status: ${res.status}`
      );
    }

    // Read the body at once, a body left unread while awaiting other requests
    // can be closed early.
    return { data: schema.parse(await res.json()), headers: res.headers };
  }

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
    return this.requestToken(customUrl, {
      refresh_token: refreshToken,
      client_id: clientId || this.clientId || "",
      client_secret: clientSecret || this.clientSecret || "",
      grant_type: "refresh_token",
      redirect_uri: GitLabUtils.callbackUrl(),
    });
  }

  private static async requestToken(
    customUrl: string | undefined,
    body: Record<string, string>
  ) {
    const res = await fetch(`${GitLabUtils.getOauthUrl(customUrl)}/token`, {
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
        `Error while requesting access token from GitLab; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }

  private static transformIssue(issue: Issue | Epic) {
    const labels: (string | z.infer<typeof LabelSchema>)[] = issue.labels;

    return {
      type: UnfurlResourceType.Issue,
      url: issue.web_url,
      id: `#${issue.iid}`,
      title: issue.title,
      description: GitLabUtils.sanitizeGitLabMarkdown(issue.description),
      author: {
        name: issue.author?.username ?? "",
        avatarUrl: issue.author?.avatar_url ?? "",
      },
      labels: labels.map((label) =>
        typeof label === "string"
          ? { name: label, color: GitLabUtils.defaultLabelColor }
          : { name: label.name, color: label.color }
      ),
      state: {
        name: issue.state,
        color: GitLabUtils.getColorForStatus(issue.state),
      },
      createdAt: issue.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static transformMR(mr: MergeRequest) {
    const mrState = mr.merged_at ? "merged" : mr.state;
    const draft = !!mr.draft;

    return {
      type: UnfurlResourceType.PR,
      url: mr.web_url,
      id: `!${mr.iid}`,
      title: mr.title,
      description: GitLabUtils.sanitizeGitLabMarkdown(mr.description) ?? "",
      author: {
        name: mr.author.username,
        avatarUrl: mr.author.avatar_url ?? "",
      },
      state: {
        name: mrState,
        color: GitLabUtils.getColorForStatus(mrState, draft),
        draft,
      },
      createdAt: mr.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static transformProject(
    project: Project,
    issueStats?: IssueStatistics
  ) {
    const visibility = project.visibility ?? "private";
    const { owner } = project;
    const counts = issueStats?.statistics.counts;
    let progress: number | undefined;

    if (counts) {
      const total = counts.opened + counts.closed;
      progress = total > 0 ? counts.closed / total : 0;
    }

    return {
      type: UnfurlResourceType.Project,
      url: project.web_url,
      id: String(project.id),
      name: project.name,
      color: GitLabUtils.getColorForProject(project.id),
      avatarUrl: project.avatar_url || undefined,
      description: GitLabUtils.sanitizeGitLabMarkdown(project.description),
      lead: owner
        ? {
            name: owner.name,
            avatarUrl: owner.avatar_url ?? "",
          }
        : null,
      state: {
        type: visibility,
        name: visibility.charAt(0).toUpperCase() + visibility.slice(1),
        color: GitLabUtils.getColorForVisibility(visibility),
      },
      labels: (project.topics ?? []).map((topic) => ({
        name: topic,
        color: GitLabUtils.defaultLabelColor,
      })),
      progress,
      createdAt: project.created_at,
      targetDate: null,
    } satisfies UnfurlProject;
  }
}
