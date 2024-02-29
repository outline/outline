import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import find from "lodash/find";
import { App, Octokit } from "octokit";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import Logger from "@server/logging/Logger";
import env from "./env";

export class GitHub {
  /**
   * GitHub settings url
   */
  public static url = integrationSettingsPath("github");

  public static clientId = env.GITHUB_CLIENT_ID;
  public static clientSecret = env.GITHUB_CLIENT_SECRET;
  public static clientType = "github-app";
  public static appId = env.GITHUB_APP_ID;
  public static appPrivateKey = env.GITHUB_APP_PRIVATE_KEY
    ? Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString("ascii")
    : undefined;

  /** GitHub client for accessing its APIs when authenticated as the GitHub user */
  private userClient: Octokit;

  /** GitHub client for accessing its APIs when authenticated as the GitHub app */
  private appClient: Octokit;

  constructor(options?: { code: string; state?: string | null }) {
    if (options) {
      this.userClient = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
          clientId: GitHub.clientId,
          clientSecret: GitHub.clientSecret,
          clientType: GitHub.clientType,
          code: options.code,
          state: options.state,
        },
      });
    } else {
      if (GitHub.appId && GitHub.appPrivateKey) {
        const { octokit } = new App({
          appId: GitHub.appId,
          privateKey: GitHub.appPrivateKey,
        });
        this.appClient = octokit;
      }
    }
  }

  /**
   * @param installationId Identifies a GitHub App installation
   * @returns {object} An object containing details about the GitHub App installation,
   * e.g, installation target, account which installed the app etc.
   */
  public async getInstallation(installationId: number) {
    const installations = await this.userClient.paginate(
      "GET /user/installations"
    );
    const installation = find(
      installations,
      (installation) => installation.id === installationId
    );
    if (!installation) {
      Logger.warn("installationId mismatch!");
      throw Error("Invalid installationId!");
    }
    return installation;
  }

  public async deleteInstallation(installationId: number) {
    await this.appClient.request(
      "DELETE /app/installations/{installation_id}",
      {
        installation_id: installationId,
      }
    );
  }
}
