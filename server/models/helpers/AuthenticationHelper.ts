import { filter } from "es-toolkit/compat";
import env from "@server/env";
import type AuthenticationProvider from "@server/models/AuthenticationProvider";
import type Team from "@server/models/Team";
import User from "@server/models/User";
import UserPasskey from "@server/models/UserPasskey";
import type { Plugin } from "@server/utils/PluginManager";
import { Hook, PluginManager } from "@server/utils/PluginManager";

/** A sign-in option presented for a team. */
export interface SignInOption {
  /** The plugin that handles sign-in. */
  plugin: Plugin<Hook.AuthProvider>;
  /** The provider to sign in with, for providers configured by an admin. */
  authenticationProvider?: AuthenticationProvider;
}

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
   * Returns the human-readable display name for an authentication provider.
   *
   * @param id The authentication provider id, eg "google".
   * @returns The display name if known, otherwise the provided id.
   */
  public static getProviderName(id: string): string {
    const provider = AuthenticationHelper.providers.find(
      (hook) => hook.value.id === id
    );
    return provider?.name ?? id;
  }

  /**
   * Returns whether an authentication provider allows sign-in to an existing
   * account by email from a tenant that the team is not connected to.
   *
   * @param id The authentication provider id, eg "google".
   * @returns True if the provider allows matching by email.
   */
  public static allowsEmailMatch(id: string): boolean {
    return AuthenticationHelper.providers.some(
      (hook) => hook.value.id === id && hook.value.allowEmailMatch === true
    );
  }

  /**
   * Returns the enabled authentication provider configurations for a team,
   * if given otherwise all enabled providers are returned.
   *
   * @param team The team to get enabled providers for
   * @returns A promise resolving to a list of sign-in options
   */
  public static async providersForTeam(team?: Team): Promise<SignInOption[]> {
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

    const configs: SignInOption[] = [];
    const providers = AuthenticationHelper.providers.sort((hook) =>
      hook.value.id === "email" || hook.value.id === "passkeys" ? 1 : -1
    );

    for (const plugin of providers) {
      const { id } = plugin.value;

      // Email sign-in is an exception as it does not have an authentication
      // provider using passport, instead it exists as a boolean option.
      if (id === "email") {
        if (team?.emailSigninEnabled) {
          configs.push({ plugin });
        }
        continue;
      }

      // Passkeys is an exception as it does not have an authentication
      // provider using passport, instead it exists as a boolean option.
      // Only include passkeys if there is at least one passkey registered
      // for the team, to avoid showing an unusable sign-in option.
      if (id === "passkeys") {
        if (team?.passkeysEnabled && teamHasPasskeys) {
          configs.push({ plugin });
        }
        continue;
      }

      // Providers configured by an admin belong to a single team, each one is
      // presented separately and only when it is enabled.
      if (plugin.value.configure) {
        for (const authenticationProvider of team?.authenticationProviders ??
          []) {
          if (
            authenticationProvider.name === id &&
            authenticationProvider.enabled &&
            authenticationProvider.config
          ) {
            configs.push({ plugin, authenticationProvider });
          }
        }
        continue;
      }

      // If no team return all possible authentication providers except email and passkeys.
      if (!team) {
        configs.push({ plugin });
        continue;
      }

      const authProviders = filter(team.authenticationProviders, { name: id });
      const isEnabled = authProviders.some((provider) => provider.enabled);

      // If cloud hosted then an auth provider must be enabled for the team,
      // If self-hosted then it must not be actively disabled, otherwise all
      // providers are considered.
      if (isCloudHosted ? isEnabled : authProviders.length === 0 || isEnabled) {
        configs.push({ plugin });
      }
    }

    return configs;
  }
}
