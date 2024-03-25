import {
  createOAuthUserAuth,
  createAppAuth,
  type OAuthWebFlowAuthOptions,
  type InstallationAuthOptions,
} from "@octokit/auth-app";
import { Octokit } from "octokit";
import pluralize from "pluralize";
import { IntegrationService, IntegrationType, Unfurl } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, User } from "@server/models";
import { GitHubUtils } from "../shared/GitHubUtils";
import env from "./env";

enum Resource {
  PR = "pull",
  Issue = "issue",
}

type PreviewData = {
  [Resource.PR]: {
    url: string;
    type: Resource.PR;
    title: string;
    description: string;
    author: { name: string; avatarUrl: string };
    createdAt: string;
    meta: {
      identifier: string;
      status: { name: string; color: string };
    };
  };
  [Resource.Issue]: {
    url: string;
    type: Resource.Issue;
    title: string;
    description: string;
    author: { name: string; avatarUrl: string };
    createdAt: string;
    meta: {
      identifier: string;
      labels: Array<{ name: string; color: string }>;
      status: { name: string; color: string };
    };
  };
};

export class GitHub {
  private static appId = env.GITHUB_APP_ID;
  private static appKey = env.GITHUB_APP_PRIVATE_KEY
    ? Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString("ascii")
    : undefined;

  private static clientId = env.GITHUB_CLIENT_ID;
  private static clientSecret = env.GITHUB_CLIENT_SECRET;

  private static appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: GitHub.appId,
      privateKey: GitHub.appKey,
      clientId: GitHub.clientId,
      clientSecret: GitHub.clientSecret,
    },
  });

  private static supportedResources = Object.values(Resource);

  private static requestPR = async (
    params: Record<string, string>,
    octokit: Octokit
  ) =>
    octokit.request(`GET /repos/{owner}/{repo}/pulls/{id}`, {
      owner: params.owner,
      repo: params.repo,
      id: params.id,
      headers: {
        Accept: "application/vnd.github.text+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

  private static requestIssue = async (
    params: Record<string, string>,
    octokit: Octokit
  ) =>
    octokit.request(`GET /repos/{owner}/{repo}/issues/{id}`, {
      owner: params.owner,
      repo: params.repo,
      id: params.id,
      headers: {
        Accept: "application/vnd.github.text+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

  private static transformPRData = (
    resource: ReturnType<typeof GitHub.parseUrl>,
    data: Record<string, any>
  ): PreviewData[Resource.PR] => ({
    url: resource!.url,
    type: Resource.PR,
    title: data.title,
    description: data.body,
    author: {
      name: data.user.login,
      avatarUrl: data.user.avatar_url,
    },
    createdAt: data.created_at,
    meta: {
      identifier: `#${data.number}`,
      status: {
        name: data.merged ? "merged" : data.state,
        color: GitHubUtils.getColorForStatus(
          data.merged ? "merged" : data.state
        ),
      },
    },
  });

  private static transformIssueData = (
    resource: ReturnType<typeof GitHub.parseUrl>,
    data: Record<string, any>
  ): PreviewData[Resource.Issue] => ({
    url: resource!.url,
    type: Resource.Issue,
    title: data.title,
    description: data.body_text,
    author: {
      name: data.user.login,
      avatarUrl: data.user.avatar_url,
    },
    createdAt: data.created_at,
    meta: {
      identifier: `#${data.number}`,
      labels: data.labels.map((label: { name: string; color: string }) => ({
        name: label.name,
        color: `#${label.color}`,
      })),
      status: {
        name: data.state,
        color: GitHubUtils.getColorForStatus(data.state),
      },
    },
  });

  private static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "github.com") {
      return;
    }

    const parts = pathname.split("/");
    const owner = parts[1];
    const repo = parts[2];
    const type = pluralize.singular(parts[3]) as Resource;
    const id = parts[4];

    if (!GitHub.supportedResources.includes(type)) {
      Logger.warn(`Unsupported GitHub resource type: ${type}`);
      return;
    }

    return { owner, repo, type, id, url };
  }

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
    GitHub.appOctokit.auth({
      type: "oauth-user",
      code,
      state,
      factory: (options: OAuthWebFlowAuthOptions) =>
        new Octokit({
          authStrategy: createOAuthUserAuth,
          auth: options,
        }),
    }) as Promise<Octokit>;

  /**
   * [Authenticates as a GitHub app installation](https://github.com/octokit/auth-app.js/?tab=readme-ov-file#authenticate-as-installation)
   *
   * @param installationId Id of an installation
   * @returns {Octokit} Installation-authenticated octokit instance
   */
  public static authenticateAsInstallation = async (installationId: number) =>
    GitHub.appOctokit.auth({
      type: "installation",
      installationId,
      factory: (options: InstallationAuthOptions) =>
        new Octokit({
          authStrategy: createAppAuth,
          auth: options,
        }),
    }) as Promise<Octokit>;

  /**
   * Fetches app installations accessible to the user
   *
   * @param octokit User-authenticated Octokit instance for making REST calls to GitHub
   * @returns {Array} Containing details of all app installations done by user
   */
  public static requestAppInstallations = async (octokit: Octokit) =>
    octokit.paginate("GET /user/installations");

  /**
   * Uninstalls the GitHub app from a given target
   *
   * @param installationId Id of the target from where to uninstall
   * @param octokit Installation-authenticated Octokit instance for making REST calls to GitHub
   */
  public static requestAppUninstall = async (
    installationId: number,
    octokit: Octokit
  ) =>
    octokit.request("DELETE /app/installations/{id}", {
      id: installationId,
    });

  /**
   * Fetches details of a GitHub resource, e.g, a pull request or an issue
   *
   * @param params Path params used to construct resource endpoint, e.g, `/repos/{params.owner}/{params.repo}/pulls/{params.id}`
   * @param octokit Authenticated Octokit instance for making REST calls to GitHub
   * @returns Response containing resource details
   */
  public static requestResource = async (
    resource: ReturnType<typeof GitHub.parseUrl>,
    octokit: Octokit
  ) => {
    switch (resource?.type) {
      case Resource.PR:
        return GitHub.requestPR(resource, octokit);
      case Resource.Issue:
        return GitHub.requestIssue(resource, octokit);
      default:
        return { data: undefined };
    }
  };

  /**
   * Transforms resource data obtained from GitHub to our own pre-defined preview data
   * which will be consumed by our API clients
   *
   * @param resourceType Resource type for which to transform the data, e.g, an issue
   * @param data Resource data obtained from GitHub via REST calls
   * @returns {PreviewData} Transformed data suitable for our API clients
   */
  public static transformResourceData = (
    resource: ReturnType<typeof GitHub.parseUrl>,
    data: Record<string, any>
  ) => {
    switch (resource?.type) {
      case Resource.PR:
        return GitHub.transformPRData(resource, data);
      case Resource.Issue:
        return GitHub.transformIssueData(resource, data);
      default:
        return;
    }
  };

  /**
   *
   * @param url GitHub resource url
   * @param actor User attempting to unfurl resource url
   * @returns {object} An object containing resource details e.g, a GitHub Pull Request details
   */
  public static unfurl = async (
    url: string,
    actor: User
  ): Promise<Unfurl | undefined> => {
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
      const { data } = await GitHub.requestResource(resource, client);
      if (!data) {
        return;
      }
      return GitHub.transformResourceData(resource, data);
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitHub", err);
      return;
    }
  };
}
