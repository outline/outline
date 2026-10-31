import Logger from "@server/logging/Logger";
import { AuthenticationProvider } from "@server/models";

/**
 * Resolves the identifier of the team's OIDC authentication provider. Only a
 * single OIDC provider is supported, so the existing record is reused and its
 * identifier follows the configured location.
 *
 * @param teamId the id of the team signing in to, if known.
 * @param hostname the hostname of the configured OIDC location.
 * @param domain the domain of the user's email address.
 * @returns the provider identifier to sign in with.
 */
export async function resolveProviderId(
  teamId: string | undefined,
  hostname: string,
  domain: string
): Promise<string> {
  if (!teamId) {
    return hostname;
  }

  const authenticationProvider =
    (await AuthenticationProvider.findOne({
      where: { name: "oidc", teamId, providerId: hostname },
    })) ??
    (await AuthenticationProvider.findOne({
      where: { name: "oidc", teamId, providerId: domain },
    })) ??
    (await AuthenticationProvider.findOne({
      where: { name: "oidc", teamId },
    }));

  if (!authenticationProvider) {
    return hostname;
  }

  const { providerId } = authenticationProvider;
  if (providerId === hostname) {
    return hostname;
  }

  // The provider can move to a different domain, in which case the stored
  // identifier must follow the configured location.
  try {
    await authenticationProvider.update({ providerId: hostname });
    return hostname;
  } catch (error) {
    Logger.warn("Could not update OIDC authentication provider identifier", {
      providerId,
      hostname,
      error,
    });
    return providerId;
  }
}
