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
