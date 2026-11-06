/** Available user roles. */
export enum UserRole {
  Admin = "admin",
  Member = "member",
  Viewer = "viewer",
  Guest = "guest",
}

/** Scopes for OAuth and API keys. */
export enum Scope {
  Read = "read",
  Write = "write",
  Create = "create",
}

/** The method used to authenticate a request. */
export enum AuthenticationType {
  API = "api",
  APP = "app",
  MCP = "mcp",
  OAUTH = "oauth",
}

/** The client application that a user signs in from. */
export enum Client {
  Web = "web",
  Desktop = "desktop",
}

/** Settings stored on an AuthenticationProvider for group synchronization. */
export interface AuthenticationProviderSettings {
  /** Whether group sync from this provider is enabled. */
  groupSyncEnabled?: boolean;
  /**
   * The claim path in the OIDC userinfo/id_token response that contains
   * group data (e.g. "groups", "roles", "custom.groups").
   */
  groupClaim?: string;
  /**
   * Additional scopes to request when group sync is enabled
   * (e.g. "groups" for OIDC).
   */
  groupSyncScopes?: string[];
}

/** Configuration of an authentication provider that is set up by an admin. */
export interface AuthenticationProviderConfig {
  /** The name shown on the sign-in button. */
  displayName: string;
  /** The issuer used to discover endpoints, if any. */
  issuerUrl?: string;
  /** The authorization endpoint. */
  authorizationUrl: string;
  /** The token endpoint. */
  tokenUrl: string;
  /** The userinfo endpoint. */
  userInfoUrl: string;
  /** The end session endpoint, if any. */
  logoutUrl?: string;
  /** The OAuth client identifier. */
  clientId: string;
  /** The OAuth client secret. */
  clientSecret: string;
  /** A space separated list of scopes to request. */
  scopes: string;
  /** The claim to use as the user's display name. */
  usernameClaim: string;
  /** Whether the provider supports PKCE with S256. */
  pkce?: boolean;
}

/** The configuration of an authentication provider as presented to clients. */
export type PublicAuthenticationProviderConfig = Omit<
  AuthenticationProviderConfig,
  "clientSecret"
>;
