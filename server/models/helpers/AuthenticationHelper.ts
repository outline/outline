import { find } from "lodash";
import Team from "@server/models/Team";
import isCloudHosted from "@server/utils/isCloudHosted";
import providerConfigs from "../../routes/auth/providers";

export default class AuthenticationHelper {
  /**
   * Returns the enabled authentication providers for a team, if given otherwise
   * all enabled providers are returned.
   *
   * @param team The team to get enabled providers for
   * @returns A list of authentication providers
   */
  static providersForTeam(team?: Team) {
    return providerConfigs
      .sort((config) => (config.id === "email" ? 1 : -1))
      .filter((config) => {
        // guest sign-in is an exception as it does not have an authentication
        // provider using passport, instead it exists as a boolean option on the team
        if (config.id === "email") {
          return team?.emailSigninEnabled;
        }
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
