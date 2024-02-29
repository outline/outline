import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import find from "lodash/find";
import { Octokit } from "octokit";
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

  /** GitHub client for accessing its APIs */
  public client: Octokit;

  constructor({ code, state }: { code: string; state?: string | null }) {
    this.client = new Octokit({
      authStrategy: createOAuthUserAuth,
      auth: {
        clientId: GitHub.clientId,
        clientSecret: GitHub.clientSecret,
        clientType: GitHub.clientType,
        code,
        state,
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
}
