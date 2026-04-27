import Logger from "@server/logging/Logger";
import env from "../env";

/**
 * Lazily imports @azure/identity to avoid loading the module when managed
 * identity is not enabled. The dependency is listed in package.json but
 * only required at runtime when AZURE_USE_MANAGED_IDENTITY=true.
 */
async function getManagedIdentityCredential() {
  const { ManagedIdentityCredential } = await import("@azure/identity");
  return env.AZURE_MANAGED_IDENTITY_CLIENT_ID
    ? new ManagedIdentityCredential({
        clientId: env.AZURE_MANAGED_IDENTITY_CLIENT_ID,
      })
    : new ManagedIdentityCredential();
}

/**
 * Audience for Azure AD token exchange when using federated identity
 * credentials.
 *
 * @see https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials
 */
const TOKEN_EXCHANGE_AUDIENCE = "api://AzureADTokenExchange";

let cachedAssertion: string | undefined;
let cachedExpiresAt = 0;
let refreshPromise: Promise<void> | undefined;

/**
 * Gets a client assertion token from the managed identity for use as a
 * client_assertion in the OAuth2 token exchange. The managed identity must be
 * configured as a federated identity credential on the Azure AD app
 * registration.
 *
 * @returns the client assertion JWT, or undefined if not available.
 */
export function getClientAssertion(): string | undefined {
  const now = Date.now();

  if (cachedAssertion && now < cachedExpiresAt - 60_000) {
    return cachedAssertion;
  }

  // Clear expired assertion so callers see undefined rather than stale token
  if (cachedAssertion) {
    cachedAssertion = undefined;
    cachedExpiresAt = 0;
  }

  if (!refreshPromise) {
    refreshPromise = refreshAssertion().finally(() => {
      refreshPromise = undefined;
    });
  }
  return cachedAssertion;
}

/**
 * Pre-fetches the managed identity token so it is ready for the first auth
 * request. Call at module initialization time.
 *
 * @returns a promise that resolves when the token is ready.
 */
export async function initializeManagedIdentityAuth(): Promise<void> {
  if (!env.AZURE_USE_MANAGED_IDENTITY) {
    return;
  }

  Logger.info(
    "lifecycle",
    "Initializing Azure managed identity authentication"
  );

  await refreshAssertion();

  if (cachedAssertion) {
    Logger.info(
      "lifecycle",
      `Azure managed identity token acquired (${cachedAssertion.length} chars)`
    );
  } else {
    Logger.error(
      "Failed to acquire managed identity token. Azure AD SSO will not work.",
      new Error("No assertion returned from managed identity endpoint")
    );
  }
}

async function refreshAssertion(): Promise<void> {
  const credential = await getManagedIdentityCredential();
  const token = await credential.getToken(TOKEN_EXCHANGE_AUDIENCE);

  if (token) {
    cachedAssertion = token.token;
    cachedExpiresAt = token.expiresOnTimestamp;
  }
}
