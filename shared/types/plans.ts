/** The plans that a team can be on. */
export enum Plan {
  Community = "community",
  Standard = "standard",
  Business = "business",
  Enterprise = "enterprise",
  /** A plan that is no longer sold, kept for existing teams. */
  Legacy = "legacy",
}

/** Features that are potentially gated by entitlements. */
export enum PlanFeature {
  /** Access to the workspace audit log. */
  AuditLog = "auditLog",
  /** Advanced security controls. */
  AdvancedSecurity = "advancedSecurity",
  /** Inviting guest users. */
  Guests = "guests",
  /** Synchronization of groups with an external IDP */
  GroupSync = "groupSync",
  /** Integrations that are not included in every plan. */
  PremiumIntegrations = "premiumIntegrations",
  /** Management of API keys across the workspace. */
  ApiKeyManagement = "apiKeyManagement",
  /** Content management tools. */
  ContentManagement = "contentManagement",
  /** AI generated answers. */
  AIAnswers = "aiAnswers",
  /** Serving the workspace from a custom domain. */
  CustomDomain = "customDomain",
  /** SAML authentication provider */
  SAML = "saml",
}
