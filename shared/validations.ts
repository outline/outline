export const AttachmentValidation = {
  /** The limited allowable mime-types for user and team avatars */
  avatarContentTypes: ["image/jpg", "image/jpeg", "image/png"],

  /** Image mime-types commonly supported by modern browsers */
  imageContentTypes: [
    "image/jpg",
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/apng",
    "image/avif",
    "image/gif",
    "image/webp",
    "image/svg",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/heic",
  ],
};

export const ApiKeyValidation = {
  /** The minimum length of the API key name */
  minNameLength: 3,
  /** The maximum length of the API key name */
  maxNameLength: 255,
};

export const CollectionValidation = {
  /** The maximum length of the collection description */
  maxDescriptionLength: 100 * 1000,

  /** The maximum length of the collection name */
  maxNameLength: 100,
};

export const CommentValidation = {
  /** The maximum length of a comment */
  maxLength: 1000,
};

export const DocumentValidation = {
  /** The maximum length of the document title */
  maxTitleLength: 100,

  /** The maximum length of the document summary */
  maxSummaryLength: 1000,

  /** The maximum size of the collaborative document state */
  maxStateLength: 1500 * 1024,
};

export const ImportValidation = {
  /** The maximum length of the import name */
  maxNameLength: 100,
};

export const OAuthClientValidation = {
  /** The maximum length of the OAuth client name */
  maxNameLength: 100,

  /** The maximum length of the OAuth client description */
  maxDescriptionLength: 1000,

  /** The maximum length of the OAuth client developer name */
  maxDeveloperNameLength: 100,

  /** The maximum length of the OAuth client developer URL */
  maxDeveloperUrlLength: 1000,

  /** The maximum length of the OAuth client avatar URL */
  maxAvatarUrlLength: 1000,

  /** The maximum length of an OAuth client redirect URI */
  maxRedirectUriLength: 1000,
};

export const RevisionValidation = {
  minNameLength: 1,
  maxNameLength: 255,
};

export const PinValidation = {
  /** The maximum number of pinned documents on an individual collection or home screen */
  max: 8,
};

export const TeamValidation = {
  /** The maximum number of domains per team on cloud hosted */
  maxDomains: 10,
};

export const UserValidation = {
  /** The maximum number of invites per request */
  maxInvitesPerRequest: 20,
};

export const WebhookSubscriptionValidation = {
  /** The maximum number of webhooks per team */
  maxSubscriptions: 10,
};
