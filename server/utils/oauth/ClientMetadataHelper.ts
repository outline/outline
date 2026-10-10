import { z } from "zod";
import { getBaseDomain } from "@shared/utils/domains";
import { errToString } from "@shared/utils/error";
import { Minute, Day } from "@shared/utils/time";
import { OAuthClientValidation } from "@shared/validations";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { OAuthClient, Share, Team } from "@server/models";
import fetch from "@server/utils/fetch";
import { OAuthHelper } from "./OAuthHelper";

const MetadataDocumentSchema = z.object({
  client_id: z.string(),
  client_name: z.string().min(1).max(OAuthClientValidation.maxNameLength),
  redirect_uris: z
    .array(
      z
        .string()
        .max(OAuthClientValidation.maxRedirectUriLength)
        .refine(
          (uri) => OAuthHelper.isValidRedirectUri(uri),
          "Invalid redirect URI"
        )
    )
    .min(1)
    .max(OAuthClientValidation.maxRedirectUris),
  client_uri: z
    .url({ protocol: /^https$/ })
    .max(OAuthClientValidation.maxDeveloperUrlLength)
    .optional(),
  logo_uri: z
    .url({ protocol: /^https$/ })
    .max(OAuthClientValidation.maxAvatarUrlLength)
    .optional(),
  // Only public clients are supported, so shared secrets and private key JWT
  // authentication are rejected.
  token_endpoint_auth_method: z.literal("none").optional(),
  client_secret: z.never().optional(),
  client_secret_expires_at: z.never().optional(),
});

type MetadataDocument = z.infer<typeof MetadataDocumentSchema>;

/**
 * Helpers for OAuth clients that are identified by a client ID metadata
 * document (CIMD). The client sends an https URL as its `client_id`, and the
 * document at that URL describes the client.
 *
 * https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/
 */
export class ClientMetadataHelper {
  /** The maximum time to wait for the metadata document. */
  public static fetchTimeout = 5000;

  /** The maximum size of the metadata document, in bytes. */
  public static maxDocumentSize = 5 * 1024;

  /** The minimum time to cache a metadata document. */
  public static minCacheDuration = 5 * Minute.ms;

  /** The maximum time to cache a metadata document. */
  public static maxCacheDuration = Day.ms;

  /**
   * Find an OAuth client by its public `clientId`. When the identifier is a
   * metadata document URL, the document is fetched if there is no cached
   * client or the cached copy has expired.
   *
   * @param clientId The public client identifier.
   * @returns The OAuth client, or null if it is not found or not valid.
   */
  public static async findOrFetchByClientId(
    clientId: string
  ): Promise<OAuthClient | null> {
    if (!OAuthClient.isMetadataDocumentClientId(clientId)) {
      return OAuthClient.findByClientId(clientId);
    }
    if (!ClientMetadataHelper.isValidClientIdUrl(clientId)) {
      return null;
    }

    // Users can upload content to this installation, so a document hosted
    // here could impersonate a client.
    if (
      await ClientMetadataHelper.isInstallationHost(new URL(clientId).hostname)
    ) {
      return null;
    }

    const existing = await OAuthClient.findByClientId(clientId);
    if (
      existing?.metadataExpiresAt &&
      existing.metadataExpiresAt > new Date()
    ) {
      return existing;
    }

    try {
      const { document, expiresAt } =
        await ClientMetadataHelper.fetchMetadataDocument(clientId);
      const attributes = {
        name: document.client_name,
        redirectUris: document.redirect_uris,
        developerUrl: document.client_uri ?? null,
        avatarUrl: document.logo_uri ?? null,
        clientType: "public" as const,
        published: false,
        metadataExpiresAt: expiresAt,
      };

      if (existing) {
        return await existing.update(attributes);
      }

      // Concurrent first requests for the same URL resolve to the same row.
      const [client, created] = await OAuthClient.findOrCreate({
        where: { clientId },
        defaults: { ...attributes, clientId, teamId: null, createdById: null },
      });
      return created ? client : await client.update(attributes);
    } catch (err) {
      // An existing client is kept so that issued tokens continue to work,
      // but it cannot be authorized again until a fetch succeeds.
      Logger.warn("Failed to load OAuth client metadata document", {
        clientId,
        error: errToString(err),
      });
      return null;
    }
  }

  /**
   * Whether a client identifier is a valid metadata document URL. The URL
   * must use https, have a path, and must not have a fragment, userinfo, or
   * dot path segments.
   *
   * @param clientId The client identifier to validate.
   * @returns true if the identifier is a valid metadata document URL.
   */
  public static isValidClientIdUrl(clientId: string): boolean {
    if (clientId.length > OAuthClientValidation.maxClientIdLength) {
      return false;
    }

    // The URL parser treats backslashes as separators and removes tabs and
    // newlines, which would hide dot segments from the raw path check below.
    // oxlint-disable-next-line no-control-regex
    if (/[\\\s\x00-\x1f\x7f]/.test(clientId)) {
      return false;
    }

    let url: URL;
    try {
      url = new URL(clientId);
    } catch {
      return false;
    }

    if (url.protocol !== "https:" || !clientId.startsWith("https://")) {
      return false;
    }
    if (url.username || url.password || clientId.includes("#")) {
      return false;
    }

    // A trailing dot names the same host, so it could bypass host checks.
    if (url.hostname.endsWith(".")) {
      return false;
    }

    // The parsed URL resolves dot segments, so inspect the raw path instead.
    const rawPath = clientId.replace(/^https:\/\/[^/?]*/, "").split("?")[0];
    if (!rawPath || rawPath === "/") {
      return false;
    }

    return !rawPath
      .split("/")
      .some((segment) => [".", ".."].includes(segment.replace(/%2e/gi, ".")));
  }

  /**
   * Whether a hostname serves this installation or its file storage. This
   * includes workspace subdomains, custom workspace domains, and custom share
   * domains.
   *
   * @param hostname The hostname to check.
   * @returns true if the hostname belongs to this installation.
   */
  public static async isInstallationHost(hostname: string): Promise<boolean> {
    const host = hostname.toLowerCase().replace(/\.+$/, "");
    const baseDomain = getBaseDomain();
    if (host === baseDomain || host.endsWith(`.${baseDomain}`)) {
      return true;
    }

    const storageHosts = [
      env.URL,
      env.CDN_URL,
      env.AWS_S3_UPLOAD_BUCKET_URL,
      env.AWS_S3_ACCELERATE_URL,
    ].flatMap((url) => {
      try {
        return url ? [new URL(url).hostname.toLowerCase()] : [];
      } catch {
        return [];
      }
    });
    if (storageHosts.includes(host)) {
      return true;
    }

    const [team, share] = await Promise.all([
      Team.findByDomain(host),
      Share.unscoped().findOne({
        attributes: ["id"],
        where: { domain: host },
      }),
    ]);
    return !!team || !!share;
  }

  /**
   * Fetch and validate the metadata document for a client. Redirects are not
   * followed, and only a 200 response with a valid document is accepted.
   *
   * @param clientId The metadata document URL.
   * @returns The validated document and the time the cached copy expires.
   * @throws An error if the document cannot be fetched or is not valid.
   */
  public static async fetchMetadataDocument(clientId: string): Promise<{
    document: MetadataDocument;
    expiresAt: Date;
  }> {
    const res = await fetch(clientId, {
      method: "GET",
      redirect: "manual",
      size: ClientMetadataHelper.maxDocumentSize,
      signal: AbortSignal.timeout(ClientMetadataHelper.fetchTimeout),
      headers: { Accept: "application/json" },
    });

    if (res.status !== 200) {
      throw new Error(`Unexpected response status ${res.status}`);
    }

    const contentType = res.headers.get("content-type")?.split(";")[0].trim();
    if (
      !contentType ||
      !/^application\/(?:[\w.-]+\+)?json$/i.test(contentType)
    ) {
      throw new Error(`Unexpected content type ${contentType}`);
    }

    const document = MetadataDocumentSchema.parse(JSON.parse(await res.text()));
    if (document.client_id !== clientId) {
      throw new Error("client_id does not match the document URL");
    }

    return {
      document,
      expiresAt: ClientMetadataHelper.cacheExpiry(res.headers),
    };
  }

  /**
   * Returns when a cached metadata document expires, from the
   * `Cache-Control` and `Expires` response headers. The result is clamped
   * between the minimum and maximum cache durations.
   *
   * @param headers The response headers.
   * @param now The current time.
   * @returns The time the cached document expires.
   */
  public static cacheExpiry(
    headers: { get(name: string): string | null },
    now = new Date()
  ): Date {
    let duration = 0;

    const maxAge = headers
      .get("cache-control")
      ?.match(/(?:^|,)\s*max-age\s*=\s*"?(\d+)"?/i);
    const expires = headers.get("expires");

    if (maxAge) {
      duration = parseInt(maxAge[1], 10) * 1000;
    } else if (expires) {
      const expiresAt = new Date(expires).getTime();
      duration = Number.isNaN(expiresAt) ? 0 : expiresAt - now.getTime();
    }

    const clamped = Math.min(
      Math.max(duration, ClientMetadataHelper.minCacheDuration),
      ClientMetadataHelper.maxCacheDuration
    );
    return new Date(now.getTime() + clamped);
  }
}
