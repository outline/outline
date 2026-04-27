import jwt from "jsonwebtoken";
import JwksRsa from "jwks-rsa";
import { Team, User } from "@server/models";
import Logger from "@server/logging/Logger";
import env from "../env";

/**
 * Minimal OpenID metadata required to validate Microsoft Entra access tokens.
 */
interface OpenIdConfiguration {
  jwks_uri: string;
}

const openIdConfigurations = new Map<string, Promise<OpenIdConfiguration>>();
const jwksClients = new Map<string, JwksRsa.JwksClient>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Returns the set of valid audiences for incoming bearer tokens.
 *
 * @returns an array of audience strings.
 */
function getValidAudiences(): string[] {
  const audiences = new Set<string>();
  const clientId = env.AZURE_CLIENT_ID;
  const configuredAudiences = env.AZURE_API_AUDIENCES?.split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  if (clientId) {
    audiences.add(clientId);
    audiences.add(`api://${clientId}`);
  }

  configuredAudiences?.forEach((a) => audiences.add(a));
  return [...audiences];
}

/**
 * Returns valid issuer URLs for the given tenant.
 *
 * @param tenantId - the Azure AD tenant ID.
 * @returns an array of issuer strings (v1 and v2 formats).
 */
function getValidIssuers(tenantId: string): string[] {
  return [
    `https://sts.windows.net/${tenantId}/`,
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
  ];
}

function getMetadataAddress(tenantId: string, issuer: string) {
  if (issuer.startsWith("https://login.microsoftonline.com/")) {
    return `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
  }
  return `https://login.microsoftonline.com/${tenantId}/.well-known/openid-configuration`;
}

function extractTenantIdFromIssuer(issuer: string): string | undefined {
  if (issuer.startsWith("https://sts.windows.net/")) {
    return issuer.replace("https://sts.windows.net/", "").replace(/\/$/, "");
  }
  if (issuer.startsWith("https://login.microsoftonline.com/")) {
    return issuer
      .replace("https://login.microsoftonline.com/", "")
      .split("/")[0] || undefined;
  }
  return undefined;
}

async function getOpenIdConfiguration(
  tenantId: string,
  issuer: string
): Promise<OpenIdConfiguration> {
  const version = issuer.includes("/v2.0") ? "v2" : "v1";
  const cacheKey = `${tenantId}:${version}`;
  let promise = openIdConfigurations.get(cacheKey);

  if (!promise) {
    promise = (async () => {
      const response = await fetch(getMetadataAddress(tenantId, issuer));
      if (!response.ok) {
        throw new Error(`metadata request failed with status ${response.status}`);
      }
      const data = (await response.json()) as unknown;
      if (!isObject(data) || typeof data.jwks_uri !== "string") {
        throw new Error("metadata response did not include a jwks_uri");
      }
      return { jwks_uri: data.jwks_uri };
    })();
    openIdConfigurations.set(cacheKey, promise);
  }

  try {
    return await promise;
  } catch (error) {
    openIdConfigurations.delete(cacheKey);
    throw error;
  }
}

/**
 * Returns a JWKS client for the given URI, creating one if needed.
 *
 * @param jwksUri - the URI of the JWKS document.
 * @returns a JwksClient instance.
 */
function getJwksClient(jwksUri: string): JwksRsa.JwksClient {
  let client = jwksClients.get(jwksUri);
  if (!client) {
    client = JwksRsa({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000,
      rateLimit: true,
    });
    jwksClients.set(jwksUri, client);
  }
  return client;
}

function getEmailClaim(payload: jwt.JwtPayload): string | undefined {
  return [payload.email, payload.preferred_username, payload.upn].find(
    (c): c is string => typeof c === "string"
  );
}

/**
 * Validates an Azure AD / Entra bearer token and returns the corresponding
 * Outline user. The token must be issued for a configured audience and signed
 * by the tenant's keys. The user is looked up by email and must already exist
 * in Outline (created via SSO login).
 *
 * This enables SSO-based API access, allowing tools such as MCP servers and
 * AI agents to authenticate with Outline using the user's Entra identity
 * instead of a manually created API key.
 *
 * @param token - the raw JWT bearer token.
 * @returns the authenticated user and scope, or null if the token is not valid.
 */
export async function validateAzureADToken(token: string): Promise<{
  user: User;
  scope: string[];
} | null> {
  const validAudiences = getValidAudiences();
  const configuredTenantId = env.AZURE_TENANT_ID;

  if (!env.AZURE_CLIENT_ID || !configuredTenantId || validAudiences.length === 0) {
    return null;
  }

  if (!token.startsWith("eyJ")) {
    return null;
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string" || typeof decoded.payload === "string") {
    return null;
  }

  const payload = decoded.payload;
  const issuer = payload.iss;
  if (
    typeof issuer !== "string" ||
    (!issuer.startsWith("https://login.microsoftonline.com/") &&
      !issuer.startsWith("https://sts.windows.net/"))
  ) {
    return null;
  }

  const tenantId = extractTenantIdFromIssuer(issuer);
  if (!tenantId || tenantId !== configuredTenantId) {
    return null;
  }

  const kid =
    isObject(decoded.header) && typeof decoded.header.kid === "string"
      ? decoded.header.kid
      : undefined;
  if (!kid) {
    return null;
  }

  let configuration: OpenIdConfiguration;
  try {
    configuration = await getOpenIdConfiguration(tenantId, issuer);
  } catch (err) {
    Logger.info(
      "lifecycle",
      `Azure AD metadata fetch failed: ${(err as Error).message}`
    );
    return null;
  }

  const client = getJwksClient(configuration.jwks_uri);
  let signingKey: string;
  try {
    const key = await client.getSigningKey(kid);
    signingKey = key.getPublicKey();
  } catch (err) {
    Logger.info(
      "lifecycle",
      `Azure AD JWKS key fetch failed: ${(err as Error).message}`
    );
    return null;
  }

  let verified: jwt.JwtPayload;
  try {
    const result = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      audience: validAudiences,
      issuer: getValidIssuers(tenantId),
      clockTolerance: 300,
    });
    if (typeof result === "string") {
      return null;
    }
    verified = result;
  } catch (err) {
    Logger.info(
      "lifecycle",
      `Azure AD JWT verification failed: ${(err as Error).message}`
    );
    return null;
  }

  const email = getEmailClaim(verified);
  if (!email) {
    Logger.info("lifecycle", "Azure AD JWT: no email claim found");
    return null;
  }

  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{ model: Team, as: "team", required: true }],
  });

  if (!user) {
    Logger.info("lifecycle", `Azure AD JWT: user not found for email`);
    return null;
  }

  return { user, scope: ["*"] };
}
