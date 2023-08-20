/* eslint-disable @typescript-eslint/no-var-requires */
import path from "path";
import { glob } from "glob";
import Router from "koa-router";
import find from "lodash/find";
import sortBy from "lodash/sortBy";
import env from "@server/env";
import Team from "@server/models/Team";

export type AuthenticationProviderConfig = {
  id: string;
  name: string;
  enabled: boolean;
  router: Router;
};

export default class AuthenticationHelper {
  private static providersCache: AuthenticationProviderConfig[];

  /**
   * Returns the enabled authentication provider configurations for the current
   * installation.
   *
   * @returns A list of authentication providers
   */
  public static get providers() {
    if (this.providersCache) {
      return this.providersCache;
    }

    const authenticationProviderConfigs: AuthenticationProviderConfig[] = [];
    const rootDir = env.ENVIRONMENT === "test" ? "" : "build";

    glob
      .sync(path.join(rootDir, "plugins/*/server/auth/!(*.test).[jt]s"))
      .forEach((filePath: string) => {
        const { default: authProvider, name } = require(path.join(
          process.cwd(),
          filePath
        ));
        const id = filePath.replace("build/", "").split("/")[1];
        const config = require(path.join(
          process.cwd(),
          rootDir,
          "plugins",
          id,
          "plugin.json"
        ));

        // Test the all required env vars are set for the auth provider
        const enabled = (config.requiredEnvVars ?? []).every(
          (name: string) => !!env[name]
        );

        if (enabled) {
          authenticationProviderConfigs.push({
            id,
            name: name ?? config.name,
            enabled,
            router: authProvider,
          });
        }
      });

    this.providersCache = sortBy(authenticationProviderConfigs, "id");
    return this.providersCache;
  }

  /**
   * Returns the enabled authentication provider configurations for a team,
   * if given otherwise all enabled providers are returned.
   *
   * @param team The team to get enabled providers for
   * @returns A list of authentication providers
   */
  public static providersForTeam(team?: Team) {
    const isCloudHosted = env.isCloudHosted();

    return AuthenticationHelper.providers
      .sort((config) => (config.id === "email" ? 1 : -1))
      .filter((config) => {
        // Guest sign-in is an exception as it does not have an authentication
        // provider using passport, instead it exists as a boolean option.
        if (config.id === "email") {
          return team?.emailSigninEnabled;
        }

        // If no team return all possible authentication providers except email.
        if (!team) {
          return true;
        }

        const authProvider = find(team.authenticationProviders, {
          name: config.id,
        });

        // If cloud hosted then the auth provider must be enabled for the team,
        // If self-hosted then it must not be actively disabled, otherwise all
        // providers are considered.
        return (
          (!isCloudHosted && authProvider?.enabled !== false) ||
          (isCloudHosted && authProvider?.enabled)
        );
      });
  }
}
