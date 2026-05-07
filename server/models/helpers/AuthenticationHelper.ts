/* oxlint-disable @typescript-eslint/no-var-requires */
import { find } from "es-toolkit/compat";
import env from "@server/env";
import type Team from "@server/models/Team";
import User from "@server/models/User";
import UserPasskey from "@server/models/UserPasskey";
import { Hook, PluginManager } from "@server/utils/PluginManager";

export default class AuthenticationHelper {
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
   * @returns A promise resolving to a list of authentication providers
   */
  public static async providersForTeam(team?: Team) {
    const isCloudHosted = env.isCloudHosted;

    // Only check passkeys count if the team has passkeys enabled, to avoid
    // an unnecessary database query in the common case.
    let teamHasPasskeys = false;
    if (team?.passkeysEnabled) {
      const count = await UserPasskey.count({
        include: [
          {
            model: User,
            where: { teamId: team.id },
            required: true,
          },
        ],
      });
      teamHasPasskeys = count > 0;
    }

    return AuthenticationHelper.providers
      .sort((hook) =>
        hook.value.id === "email" || hook.value.id === "passkeys" ? 1 : -1
      )
      .filter((hook) => {
        // Email sign-in is an exception as it does not have an authentication
        // provider using passport, instead it exists as a boolean option.
        if (hook.value.id === "email") {
          return team?.emailSigninEnabled;
        }

        // Passkeys is an exception as it does not have an authentication
        // provider using passport, instead it exists as a boolean option.
        // Only include passkeys if there is at least one passkey registered
        // for the team, to avoid showing an unusable sign-in option.
        if (hook.value.id === "passkeys") {
          return team?.passkeysEnabled && teamHasPasskeys;
        }

        // If no team return all possible authentication providers except email and passkeys.
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
}
