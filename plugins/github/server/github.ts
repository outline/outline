import {
  createOAuthUserAuth,
  createAppAuth,
  type OAuthWebFlowAuthOptions,
  type InstallationAuthOptions,
} from "@octokit/auth-app";
import { Endpoints, OctokitResponse } from "@octokit/types";
import { Octokit } from "octokit";
import pluralize from "pluralize";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, User } from "@server/models";
import { UnfurlIssueAndPR, UnfurlSignature } from "@server/types";
import { GitHubUtils } from "../shared/GitHubUtils";
import env from "./env";

type PR =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type Issue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

const requestPlugin = (octokit: Octokit) => ({
  requestRepos: () =>
    octokit.paginate.iterator(
      octokit.rest.apps.listReposAccessibleToInstallation,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    ),

  requestPR: async (params: NonNullable<ReturnType<typeof GitHub.parseUrl>>) =>
    octokit.request(`GET /repos/{owner}/{repo}/pulls/{pull_number}`, {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.id,
      headers: {
        Accept: "application/vnd.github.text+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestIssue: async (
    params: NonNullable<ReturnType<typeof GitHub.parseUrl>>
  ) =>
    octokit.request(`GET /repos/{owner}/{repo}/issues/{issue_number}`, {
      owner: params.owner,
      repo: params.repo,
      issue_number: params.id,
      headers: {
        Accept: "application/vnd.github.text+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  /**
   * Fetches app installations accessible to the user
   *
   * @returns {Array} Containing details of all app installations done by user
   */
  requestAppInstallations: async () =>
    octokit.paginate("GET /user/installations"),

  /**
   * Fetches details of a GitHub resource, e.g, a pull request or an issue
   *
   * @param resource Contains identifiers which are used to construct resource endpoint, e.g, `/repos/{params.owner}/{params.repo}/pulls/{params.id}`
   * @returns Response containing resource details
   */
  requestResource: async function requestResource(
    resource: ReturnType<typeof GitHub.parseUrl>
  ): Promise<OctokitResponse<Issue | PR> | undefined> {
    switch (resource?.type) {
      case UnfurlResourceType.PR:
        return this.requestPR(resource) as Promise<OctokitResponse<PR>>;
      case UnfurlResourceType.Issue:
        return this.requestIssue(resource) as Promise<OctokitResponse<Issue>>;
      default:
        return;
    }
  },

  /**
   * Uninstalls the GitHub app from a given target
   *
   * @param installationId Id of the target from where to uninstall
   */
  requestAppUninstall: async (installationId: number) =>
    octokit.request("DELETE /app/installations/{id}", {
      id: installationId,
    }),
});

const CustomOctokit = Octokit.plugin(requestPlugin);

export class GitHub {
  private static appId = env.GITHUB_APP_ID;
  private static appKey = env.GITHUB_APP_PRIVATE_KEY
    ? Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString("ascii")
    : undefined;

  private static clientId = env.GITHUB_CLIENT_ID;
  private static clientSecret = env.GITHUB_CLIENT_SECRET;

  private static appOctokit: Octokit;

  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  /**
   * Parses a given URL and returns resource identifiers for GitHub specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `owner`, `repo`, `type` and `id`.
   */
  public static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "github.com") {
      return;
    }

    const parts = pathname.split("/");
    const owner = parts[1];
    const repo = parts[2];
    const type = parts[3]
      ? (pluralize.singular(parts[3]) as UnfurlResourceType)
      : undefined;
    const id = Number(parts[4]);

    if (!type || !GitHub.supportedResources.includes(type)) {
      return;
    }

    return { owner, repo, type, id, url };
  }

  private static authenticateAsApp = () => {
    if (!GitHub.appOctokit) {
      GitHub.appOctokit = new CustomOctokit({
        authStrategy: createAppAuth,
        auth: {
          appId: GitHub.appId,
          privateKey: GitHub.appKey,
          clientId: GitHub.clientId,
          clientSecret: GitHub.clientSecret,
        },
      });
    }

    return GitHub.appOctokit;
  };

  /**
   * [Authenticates as a GitHub user](https://github.com/octokit/auth-app.js/?tab=readme-ov-file#authenticate-as-installation)
   *
   * @param code Temporary code received in callback url after user authorizes
   * @param state A string received in callback url to protect against CSRF
   * @returns {Octokit} User-authenticated octokit instance
   */
  public static authenticateAsUser = async (
    code: string,
    state?: string | null
  ) =>
    GitHub.authenticateAsApp().auth({
      type: "oauth-user",
      code,
      state,
      factory: (options: OAuthWebFlowAuthOptions) =>
        new CustomOctokit({
          authStrategy: createOAuthUserAuth,
          auth: options,
        }),
    }) as Promise<InstanceType<typeof CustomOctokit>>;

  /**
   * [Authenticates as a GitHub app installation](https://github.com/octokit/auth-app.js/?tab=readme-ov-file#authenticate-as-installation)
   *
   * @param installationId Id of an installation
   * @returns {Octokit} Installation-authenticated octokit instance
   */
  public static authenticateAsInstallation = async (installationId: number) =>
    GitHub.authenticateAsApp().auth({
      type: "installation",
      installationId,
      factory: (options: InstallationAuthOptions) =>
        new CustomOctokit({
          authStrategy: createAppAuth,
          auth: options,
        }),
    }) as Promise<InstanceType<typeof CustomOctokit>>;

  /**
   *
   * @param url GitHub resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitHub Pull Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = GitHub.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitHub,
        teamId: actor.teamId,
        "settings.github.installation.account.name": resource.owner,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const client = await GitHub.authenticateAsInstallation(
        integration.settings.github!.installation.id
      );

      const res = await client.requestResource(resource);
      if (!res) {
        return { error: "Resource not found" };
      }

      return GitHub.transformData(res.data, resource.type);
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitHub", err);
      return { error: err.message || "Unknown error" };
    }
  };

  private static transformData(data: Issue | PR, type: UnfurlResourceType) {
    if (type === UnfurlResourceType.Issue) {
      const issue = data as Issue;
      return {
        type: UnfurlResourceType.Issue,
        url: issue.html_url,
        id: `#${issue.number}`,
        title: issue.title,
        description: issue.body_text ?? null,
        author: {
          name: issue.user?.login ?? "",
          avatarUrl: issue.user?.avatar_url ?? "",
        },
        labels: issue.labels.map((label: { name: string; color: string }) => ({
          name: label.name,
          color: `#${label.color}`,
        })),
        state: {
          name: issue.state,
          color: GitHubUtils.getColorForStatus(issue.state),
        },
        createdAt: issue.created_at,
        transformed_unfurl: true,
      } satisfies UnfurlIssueAndPR;
    }

    const pr = data as PR;
    const prState = pr.merged ? "merged" : pr.state;
    return {
      type: UnfurlResourceType.PR,
      url: pr.html_url,
      id: `#${pr.number}`,
      title: pr.title,
      description: pr.body,
      author: {
        name: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      state: {
        name: prState,
        color: GitHubUtils.getColorForStatus(prState, !!pr.draft),
        draft: pr.draft,
      },
      createdAt: pr.created_at,
      transformed_unfurl: true,
    } satisfies UnfurlIssueAndPR;
  }
}
