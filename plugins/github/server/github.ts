import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import find from "lodash/find";
import { App, Octokit } from "octokit";
import pluralize from "pluralize";
import {
  IntegrationService,
  IntegrationType,
  Unfurl,
  UnfurlResponse,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, User } from "@server/models";
import { GitHubUtils } from "../shared/GitHubUtils";
import env from "./env";

/**
 * It exposes a GitHub REST client for accessing APIs which
 * particulary require the client to authenticate as a GitHub App
 */
class GitHubApp {
  /** Required to authenticate as GitHub App */
  private static id = env.GITHUB_APP_ID;
  private static key = env.GITHUB_APP_PRIVATE_KEY
    ? Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString("ascii")
    : undefined;

  /** GitHub App instance */
  private app: App;

  constructor() {
    if (GitHubApp.id && GitHubApp.key) {
      this.app = new App({
        appId: GitHubApp.id!,
        privateKey: GitHubApp.key!,
      });
    }
  }

  /**
   * Given an `installationId`, removes that GitHub App installation
   * @param installationId
   */
  public async deleteInstallation(installationId: number) {
    await this.app.octokit.request(
      "DELETE /app/installations/{installation_id}",
      {
        installation_id: installationId,
      }
    );
  }

  /**
   *
   * @param url GitHub resource url - could be a url of a pull request or an issue
   * @param installationId Id corresponding to the GitHub App installation
   * @returns {object} An object container the resource details - could be a pull request
   * details or an issue details
   */
  unfurl = async (url: string, actor: User): Promise<Unfurl | undefined> => {
    const { owner, repo, resourceType, resourceId } = GitHubUtils.parseUrl(url);

    if (!owner) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitHub,
        teamId: actor.teamId,
        "settings.github.installation.account.name": owner,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const octokit = await this.app.getInstallationOctokit(
        integration.settings.github!.installation.id
      );
      const { data } = await octokit.request(
        `GET /repos/{owner}/{repo}/${pluralize(resourceType)}/{ref}`,
        {
          owner,
          repo,
          ref: resourceId,
          headers: {
            Accept: "application/vnd.github.text+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const status = data.merged ? "merged" : data.state;

      return {
        url,
        type: pluralize.singular(resourceType) as UnfurlResponse["type"],
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
            name: status,
            color: GitHubUtils.getColorForStatus(status),
          },
        },
      };
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitHub", err);
      return;
    }
  };
}

export const githubApp = new GitHubApp();

/**
 * It exposes a GitHub REST client for accessing APIs which
 * particularly require the client to authenticate as a user
 * through the user access token
 */
export class GitHubUser {
  private static clientId = env.GITHUB_CLIENT_ID;
  private static clientSecret = env.GITHUB_CLIENT_SECRET;
  private static clientType = "github-app";

  /** GitHub client for accessing its APIs */
  private client: Octokit;

  constructor(options: { code: string; state?: string | null }) {
    this.client = new Octokit({
      authStrategy: createOAuthUserAuth,
      auth: {
        clientId: GitHubUser.clientId,
        clientSecret: GitHubUser.clientSecret,
        clientType: GitHubUser.clientType,
        code: options.code,
        state: options.state,
      },
    });
  }

  /**
   * @param installationId Identifies a GitHub App installation
   * @returns {object} An object containing details about the GitHub App installation,
   * e.g, installation target, account which installed the app etc.
   */
  public async getInstallation(installationId: number) {
    const installations = await this.client.paginate("GET /user/installations");
    const installation = find(installations, (i) => i.id === installationId);
    if (!installation) {
      Logger.warn("installationId mismatch!");
      throw Error("Invalid installationId!");
    }
    return installation;
  }
}
