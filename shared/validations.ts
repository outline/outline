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
  ],
};

export const ApiKeyValidation = {
  /** The minimum length of the API key name */
  minNameLength: 3,

  /** The maximum length of the API key name */
  maxNameLength: 255,
};

export const DataAttributeValidation = {
  /** The minimum length of the name */
  minNameLength: 3,

  /** The maximum length of the name */
  maxNameLength: 255,

  /** The minimum length of a list option */
  minOptionLength: 1,

  /** The maximum length of a list option */
  maxOptionLength: 50,

  /** The maximum length of the description */
  maxDescriptionLength: 1000,

  /** The maximum number of data attributes */
  max: 25,

  /** The maximum number of data attributes that can be pinned */
  maxPinned: 3,

  /** The minimum number of options for a list attribute */
  minOptions: 2,

  /** The maximum number of options for a list attribute */
  maxOptions: 10,
};

export const CollectionValidation = {
  /** The maximum length of the collection description */
  maxDescriptionLength: 10 * 1000,

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
