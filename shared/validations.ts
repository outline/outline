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

export const CollectionValidation = {
  /** The maximum length of the collection description */
  maxDescriptionLength: 1000,

  /** The maximum length of the collection name */
  maxNameLength: 100,
};

export const DocumentValidation = {
  /** The maximum length of the document title */
  maxTitleLength: 100,

  /** The maximum number of documents allowed to be permanently deleted in one batch */
  emptyTrash: 100,
};

export const PinValidation = {
  /** The maximum number of pinned documents on an individual collection or home screen */
  max: 8,
};

export const TeamValidation = {
  /** The maximum number of domains per team */
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
