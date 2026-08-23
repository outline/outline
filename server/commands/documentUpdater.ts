import type { DocumentPreferences, TextEditMode } from "@shared/types";
import { DocumentConflictError } from "@server/errors";
import { Event, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import type { APIContext } from "@server/types";

type Props = {
  /** The existing document */
  document: Document;
  /** The new title */
  title?: string;
  /** The document icon */
  icon?: string | null;
  /** The document icon's color */
  color?: string | null;
  /** The new text content */
  text?: string;
  /** Whether the editing session is complete */
  done?: boolean;
  /** The version of the client editor that was used */
  editorVersion?: string;
  /** The ID of the template that was used */
  templateId?: string | null;
  /** If the document should be displayed full-width on the screen */
  fullWidth?: boolean;
  /** Display preferences for the document, merged with existing values */
  preferences?: DocumentPreferences | null;
  /** Whether insights should be visible on the document */
  insightsEnabled?: boolean;
  /** The edit mode: "replace", "append", "prepend", or "patch" */
  editMode?: TextEditMode;
  /** The document revision the changes are based on, the update is rejected if it no longer matches */
  lastRevision?: number;
  /** The markdown text to find when using "patch" edit mode */
  findText?: string;
  /** Whether the document should be published to the collection */
  publish?: boolean;
  /** The ID of the collection to publish the document to */
  collectionId?: string | null;
};

/**
 * This command updates document properties. To update collaborative text state
 * use documentCollaborativeUpdater.
 *
 * @param Props The properties of the document to update
 * @returns Document The updated document
 */
export default async function documentUpdater(
  ctx: APIContext,
  {
    document,
    title,
    icon,
    color,
    text,
    editorVersion,
    templateId,
    fullWidth,
    preferences,
    insightsEnabled,
    editMode,
    findText,
    lastRevision,
    publish,
    collectionId,
    done,
  }: Props
): Promise<Document> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  const cId = collectionId || document.collectionId;

  if (title !== undefined) {
    document.title = title.trim();
  }
  if (icon !== undefined) {
    document.icon = icon;
  }
  if (color !== undefined) {
    document.color = color;
  }
  if (editorVersion) {
    document.editorVersion = editorVersion;
  }
  if (templateId) {
    document.templateId = templateId;
  }
  if (fullWidth !== undefined) {
    document.fullWidth = fullWidth;
  }
  if (preferences) {
    document.preferences = {
      ...document.preferences,
      ...preferences,
    };
  }
  if (insightsEnabled !== undefined) {
    document.insightsEnabled = insightsEnabled;
  }
  if (text !== undefined) {
    document = DocumentHelper.applyMarkdownToDocument(
      document,
      await TextHelper.replaceImagesWithAttachments(ctx, text, user, {
        base64Only: true,
      }),
      editMode,
      findText
    );
  }

  // Serialize concurrent updates to the same document by taking a row-level
  // lock before writing. The wait is already bounded by the transaction's
  // statement_timeout. When lastRevision is provided it becomes part of the
  // predicate, so a document modified since that revision matches no row.
  if (transaction) {
    const locked = await Document.unscoped().findOne({
      attributes: ["id"],
      where: {
        id: document.id,
        ...(lastRevision !== undefined && { revisionCount: lastRevision }),
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      paranoid: false,
    });

    if (!locked && lastRevision !== undefined) {
      throw DocumentConflictError();
    }
  }

  const changed = document.changed();
  const eventData = done !== undefined ? { done } : undefined;

  const event = {
    name: "documents.update",
    documentId: document.id,
    collectionId: cId,
    data: eventData,
  };

  if (publish && cId) {
    if (!document.collectionId) {
      document.collectionId = cId;
    }
    await document.publish(ctx, { collectionId: cId, data: eventData });
  } else if (changed) {
    document.lastModifiedById = user.id;
    document.updatedBy = user;
    await document.saveWithCtx(ctx, undefined, { data: eventData });
  } else if (done) {
    await Event.schedule({
      ...event,
      actorId: user.id,
      teamId: document.teamId,
    });
  }

  return await Document.findByPk(document.id, {
    userId: user.id,
    rejectOnEmpty: true,
    transaction,
  });
}
