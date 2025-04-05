/* eslint-disable @typescript-eslint/no-var-requires */
import find from "lodash/find";
import env from "@server/env";
import Team from "@server/models/Team";
import { Hook, PluginManager } from "@server/utils/PluginManager";

export default class AuthenticationHelper {
  public static methodToScope = {
    list: "read",
    info: "read",
    search: "read",
    documents: "read",
  };

  /**
   * Returns the enabled authentication provider configurations for the current
   * installation.
   *
   * @returns A list of authentication providers
   */
  public static get providers() {
    return PluginManager.getHooks(Hook.AuthProvider);
  }

  /**
   * Returns the enabled authentication provider configurations for a team,
   * if given otherwise all enabled providers are returned.
   *
   * @param team The team to get enabled providers for
   * @returns A list of authentication providers
   */
  public static providersForTeam(team?: Team) {
    const isCloudHosted = env.isCloudHosted;

    return AuthenticationHelper.providers
      .sort((hook) => (hook.value.id === "email" ? 1 : -1))
      .filter((hook) => {
        // Email sign-in is an exception as it does not have an authentication
        // provider using passport, instead it exists as a boolean option.
        if (hook.value.id === "email") {
          return team?.emailSigninEnabled;
        }

        // If no team return all possible authentication providers except email.
        if (!team) {
          return true;
        }

        const authProvider = find(team.authenticationProviders, {
          name: hook.value.id,
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

  public static canAccess = (path: string, scopes: string[]) => {
    // strip any query string from the path
    path = path.split("?")[0];

    const resource = path.split("/").pop() ?? "";
    const [namespace, method] = resource.split(".");

    return scopes.some((scope) => {
      const [scopeNamespace, scopeMethod] = scope
        .replace("/api/", "")
        .split(/[:\.]/g);
      const isRouteScope = scope.startsWith("/api/");
      const isAccessScope = scope.includes(":");

      if (isRouteScope) {
        return (
          (namespace === scopeNamespace || scopeNamespace === "*") &&
          (method === scopeMethod || scopeMethod === "*")
        );
      }

      if (isAccessScope) {
        return (
          namespace === scopeNamespace &&
          (scopeMethod === "write" ||
            this.methodToScope[method as keyof typeof this.methodToScope] ===
              scopeMethod)
        );
      }

      return false;
    });
  };
}
