import { clamp } from "es-toolkit";
import { UniqueConstraintError } from "sequelize";
import { z } from "zod";
import { TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import { errToString } from "@shared/utils/error";
import { Day, Minute, Second } from "@shared/utils/time";
import { getHostname } from "@shared/utils/urls";
import { OAuthClientValidation } from "@shared/validations";
import env from "@server/env";
import { AuthorizationError, InvalidClientMetadataError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { OAuthClient, Share, Team } from "@server/models";
import UploadOAuthClientLogoTask from "@server/queues/tasks/UploadOAuthClientLogoTask";
import type { Response } from "@server/utils/fetch";
import fetch from "@server/utils/fetch";
import { OAuthHelper } from "./OAuthHelper";

/** JWK members that hold private or symmetric key material (RFC 7518 §6). */
const privateKeyMembers = ["d", "p", "q", "dp", "dq", "qi", "oth", "k"];

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
  // Public keys are ignored, but a document with private key material is
  // invalid and must not be cached (draft section 4.1).
  jwks: z
    .object({
      keys: z.array(
        z
          .record(z.string(), z.unknown())
          .refine(
            (key) => !privateKeyMembers.some((member) => member in key),
            "jwks must not contain private key material"
          )
      ),
    })
    .optional(),
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
   * @param team The team of the user that requests the client.
   * @returns The OAuth client, or null if it is not found or the client_id is
   *   not a valid metadata document URL.
   * @throws AuthorizationError if the client is a metadata document and the
   *   team has turned MCP off.
   * @throws InvalidClientMetadataError if the metadata document cannot be
   *   fetched or is not valid.
   */
  public static async findOrFetchByClientId(
    clientId: string,
    team: Team
  ): Promise<OAuthClient | null> {
    if (!OAuthClient.isMetadataDocumentClientId(clientId)) {
      return OAuthClient.findByClientId(clientId);
    }

    // Metadata documents only serve MCP, so do not fetch one for a team that
    // has turned it off.
    if (!team.getPreference(TeamPreference.MCP)) {
      throw AuthorizationError();
    }
    if (!ClientMetadataHelper.isValidClientIdUrl(clientId)) {
      return null;
    }

    const existing = await OAuthClient.findByClientId(clientId);
    if (
      existing?.metadataExpiresAt &&
      existing.metadataExpiresAt > new Date()
    ) {
      return existing;
    }

    // Users can upload content to this installation, so a document hosted
    // here could impersonate a client.
    const hostname = getHostname(clientId);
    if (
      !hostname ||
      (await ClientMetadataHelper.isInstallationHost(hostname))
    ) {
      return null;
    }

    // An existing client is kept when the fetch fails, so that issued tokens
    // continue to work, but it cannot be authorized again until a fetch
    // succeeds.
    const { document, expiresAt } =
      await ClientMetadataHelper.fetchMetadataDocument(clientId);
    const client = await ClientMetadataHelper.saveClient(
      clientId,
      existing,
      document,
      expiresAt
    );
    const logoUrl = document.logo_uri;

    if (client && logoUrl) {
      await new UploadOAuthClientLogoTask().scheduleOptional({
        oauthClientId: client.id,
        logoUrl,
      });
    }
    return client;
  }

  /**
   * Whether a client identifier is a valid metadata document URL. The URL
   * must use https, have a path (a root path is allowed), and must not have a
   * fragment, userinfo, or dot path segments.
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

    if (!OAuthClient.isMetadataDocumentClientId(clientId)) {
      return false;
    }
    if (clientId.includes("#")) {
      return false;
    }

    // The parsed URL drops empty userinfo, as in "https://@host", so look for
    // the delimiter in the raw authority instead.
    const authority = clientId
      .slice(OAuthClientValidation.metadataDocumentClientIdPrefix.length)
      .split(/[/?]/)[0];
    if (authority.includes("@")) {
      return false;
    }

    // A trailing dot names the same host, so it could bypass host checks.
    if (url.hostname.endsWith(".")) {
      return false;
    }

    // The parsed URL resolves dot segments, so inspect the raw path instead.
    const rawPath = clientId.replace(/^https:\/\/[^/?]*/, "").split("?")[0];
    if (!rawPath) {
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
    const { host, custom } = parseDomain(hostname);
    if (!custom) {
      return true;
    }

    const storageHosts = [
      env.URL,
      env.CDN_URL,
      env.AWS_S3_UPLOAD_BUCKET_URL,
      env.AWS_S3_ACCELERATE_URL,
    ].flatMap((url) => getHostname(url) ?? []);
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
   * @throws InvalidClientMetadataError if the document cannot be fetched or
   *   is not valid.
   */
  public static async fetchMetadataDocument(clientId: string): Promise<{
    document: MetadataDocument;
    expiresAt: Date;
  }> {
    let res: Response;
    let text: string;
    try {
      res = await fetch(clientId, {
        method: "GET",
        redirect: "manual",
        // Special-use addresses are never allowed, even when the installation
        // allows them for other integrations (draft section 8.6).
        allowIPAddressList: [],
        size: ClientMetadataHelper.maxDocumentSize,
        signal: AbortSignal.timeout(ClientMetadataHelper.fetchTimeout),
        headers: { Accept: "application/json" },
      });
      text = await res.text();
    } catch (err) {
      // Network errors can describe internal hosts, so they are only logged.
      Logger.warn("Failed to fetch OAuth client metadata document", {
        clientId,
        error: errToString(err),
      });
      throw InvalidClientMetadataError(
        "The client metadata document could not be fetched"
      );
    }

    if (res.status !== 200) {
      throw InvalidClientMetadataError(
        `The client metadata document responded with status ${res.status}`
      );
    }

    const contentType = res.headers.get("content-type")?.split(";")[0].trim();
    if (
      !contentType ||
      !/^application\/(?:[\w.-]+\+)?json$/i.test(contentType)
    ) {
      throw InvalidClientMetadataError(
        `The client metadata document must be JSON, not ${contentType ?? "an unknown type"}`
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw InvalidClientMetadataError(
        "The client metadata document is not valid JSON"
      );
    }

    const result = MetadataDocumentSchema.safeParse(json);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw InvalidClientMetadataError(
        `The client metadata document is invalid: ${issue.path.join(".") || "document"} ${issue.message}`
      );
    }

    const document = result.data;
    if (document.client_id !== clientId) {
      throw InvalidClientMetadataError(
        "The client_id in the client metadata document does not match its URL"
      );
    }

    return {
      document,
      expiresAt: ClientMetadataHelper.cacheExpiry(res.headers),
    };
  }

  /**
   * Returns when a cached metadata document expires, using HTTP caching
   * semantics. `no-store` and `no-cache` expire the document at once.
   * Otherwise the freshness lifetime comes from `max-age` or `Expires`, less
   * the current age of the response, and is clamped between the minimum and maximum
   * cache durations.
   *
   * @param headers The response headers.
   * @param now The current time.
   * @returns The time the cached document expires.
   */
  public static cacheExpiry(
    headers: { get(name: string): string | null },
    now = new Date()
  ): Date {
    const directives = (headers.get("cache-control") ?? "")
      .toLowerCase()
      .split(",")
      .map((directive) => directive.trim());
    if (
      directives.some(
        (directive) =>
          directive === "no-store" || directive.startsWith("no-cache")
      )
    ) {
      return now;
    }

    const maxAge = directives
      .map((directive) => directive.match(/^max-age\s*=\s*"?(\d+)"?$/))
      .find(Boolean);
    const expires = headers.get("expires");
    const date = new Date(headers.get("date") ?? "").getTime();
    const responseTime = Number.isNaN(date) ? now.getTime() : date;

    // The current age is the larger of the Age header and the time since the
    // Date header (RFC 9111 section 4.2.3).
    const age = Math.max(
      (parseInt(headers.get("age") ?? "", 10) || 0) * Second.ms,
      now.getTime() - responseTime
    );
    let duration = 0;

    if (maxAge) {
      duration = parseInt(maxAge[1], 10) * Second.ms;
    } else if (expires) {
      const expiresAt = new Date(expires).getTime();
      duration = Number.isNaN(expiresAt) ? 0 : expiresAt - responseTime;
    }
    duration -= age;

    const clamped = clamp(
      duration,
      ClientMetadataHelper.minCacheDuration,
      ClientMetadataHelper.maxCacheDuration
    );
    return new Date(now.getTime() + clamped);
  }

  /**
   * Create or update the cached client for a metadata document. The logo is
   * not stored here, it is copied to file storage by a background task.
   *
   * @param clientId The metadata document URL.
   * @param existing The cached client, if there is one.
   * @param document The validated metadata document.
   * @param expiresAt When the cached document expires.
   * @returns The saved client.
   */
  private static async saveClient(
    clientId: string,
    existing: OAuthClient | null,
    document: MetadataDocument,
    expiresAt: Date
  ): Promise<OAuthClient | null> {
    const attributes = {
      name: document.client_name,
      redirectUris: document.redirect_uris,
      developerUrl: document.client_uri ?? null,
      clientType: "public" as const,
      published: false,
      metadataExpiresAt: expiresAt,
      ...(!document.logo_uri && { avatarUrl: null }),
    };

    if (existing) {
      return existing.update(attributes);
    }

    try {
      return await OAuthClient.create({
        ...attributes,
        clientId,
        teamId: null,
        createdById: null,
      });
    } catch (err) {
      // A concurrent request for the same URL created the row first.
      if (err instanceof UniqueConstraintError) {
        return OAuthClient.findByClientId(clientId);
      }
      throw err;
    }
  }
}
