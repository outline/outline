import type { AuthenticationType } from "./auth";

/** Upload presets that set the ACL, size limit, and expiry of an attachment. */
export enum AttachmentPreset {
  DocumentAttachment = "documentAttachment",
  WorkspaceImport = "workspaceImport",
  Import = "import",
  Avatar = "avatar",
  Emoji = "emoji",
}

/** Metadata about the origin of a document, collection, or revision. */
export type SourceMetadata = {
  /** The original source file name. */
  fileName?: string;
  /** The original source mime type. */
  mimeType?: string;
  /** The creator of the original external source. */
  createdByName?: string;
  /** An ID in the external source. */
  externalId?: string;
  /** Original name in the external source. */
  externalName?: string;
  /** Whether the item was created through a trial license. */
  trial?: boolean;
  /** The ID of the original document when this document was duplicated. */
  originalDocumentId?: string;
  /** The ID of the original collection when this collection was duplicated. */
  originalCollectionId?: string;
  /** The type of authentication used to make the change. */
  authType?: AuthenticationType;
};
