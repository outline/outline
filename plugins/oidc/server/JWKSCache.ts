import crypto, { type JsonWebKey } from "node:crypto";
import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";
import { Minute, Second } from "@shared/utils/time";

interface JSONWebKey extends JsonWebKey {
  kid?: string;
  use?: string;
  alg?: string;
}

/** How long a fetched key set is used before it is fetched again. */
const DEFAULT_TTL_MS = Minute.ms * 10;

/** The shortest interval between two fetches, limiting load on the provider. */
const MIN_REFRESH_INTERVAL_MS = Minute.ms;

/**
 * Fetches and caches an authentication provider's JSON Web Key Set, resolving
 * the individual public keys that verify tokens signed by the provider.
 *
 * The key set is cached for a short period, and fetched again on demand when a
 * token references an unknown key. Providers can therefore rotate their signing
 * keys without a restart.
 */
export class JWKSCache {
  /**
   * @param uri The provider's `jwks_uri` endpoint.
   * @param ttl How long a fetched key set is cached, in milliseconds.
   */
  constructor(
    private uri: string,
    private ttl: number = DEFAULT_TTL_MS
  ) {}

  /**
   * Resolves the public key with the given identifier.
   *
   * @param kid The key identifier from the token header. When omitted the key
   * set must contain exactly one signing key.
   * @returns the public key, in PEM form.
   * @throws {InternalError} if the key set cannot be loaded, or contains no
   * matching key.
   */
  public async getSigningKey(kid?: string): Promise<string | Buffer> {
    if (this.expiresAt <= Date.now()) {
      await this.refresh();
    }

    let jwk = this.find(kid);

    // A miss usually means the provider rotated its keys, so try once more with
    // a freshly fetched set before giving up.
    if (!jwk && this.refreshableAt <= Date.now()) {
      await this.refresh();
      jwk = this.find(kid);
    }

    if (!jwk) {
      throw InternalError(
        `The key set at ${this.uri} contains no signing key matching "${kid ?? "any"}"`
      );
    }

    return crypto
      .createPublicKey({ key: jwk, format: "jwk" })
      .export({ type: "spki", format: "pem" });
  }

  private keys: JSONWebKey[] = [];

  private expiresAt = 0;

  private refreshableAt = 0;

  private inflight: Promise<void> | undefined;

  private find(kid?: string): JSONWebKey | undefined {
    const signing = this.keys.filter((key) => key.use !== "enc");

    if (!kid) {
      return signing.length === 1 ? signing[0] : undefined;
    }

    return signing.find((key) => key.kid === kid);
  }

  /** Fetches the key set, sharing a single request between concurrent callers. */
  private async refresh(): Promise<void> {
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.load();

    try {
      await this.inflight;
    } finally {
      this.inflight = undefined;
    }
  }

  private async load(): Promise<void> {
    const response = await fetch(this.uri, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      timeout: Second.ms * 10,
      allowPrivateIPAddress: true,
    });

    if (!response.ok) {
      throw InternalError(
        `Failed to fetch key set from ${this.uri}: ${response.status} ${response.statusText}`
      );
    }

    const body = await response.json();

    if (!body || !Array.isArray(body.keys)) {
      throw InternalError(`The key set at ${this.uri} is malformed`);
    }

    this.keys = body.keys;
    this.expiresAt = Date.now() + this.ttl;
    this.refreshableAt = Date.now() + MIN_REFRESH_INTERVAL_MS;
  }
}
