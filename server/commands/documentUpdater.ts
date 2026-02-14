import type { TextEditMode } from "@shared/types";
import { Event, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import type { APIContext } from "@server/types";
import { sequelize } from "@server/storage/database";

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
  /** Whether insights should be visible on the document */
  insightsEnabled?: boolean;
  /** The edit mode: "replace", "append", or "prepend" */
  editMode?: TextEditMode;
  /** Whether the document should be published to the collection */
  publish?: boolean;
  /** The ID of the collection to publish the document to */
  collectionId?: string | null;
  /** Historical update date for an imported document revision */
  updatedAt?: Date;
  /** Flag for bulk revisions imports */
  isImport?: boolean;
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
    insightsEnabled,
    editMode,
    publish,
    collectionId,
    done,
    updatedAt,
    isImport,
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
  if (insightsEnabled !== undefined) {
    document.insightsEnabled = insightsEnabled;
  }
  if (text !== undefined) {
    document = DocumentHelper.applyMarkdownToDocument(
      document,
      await TextHelper.replaceImagesWithAttachments(ctx, text, user, {
        base64Only: true,
      }),
      editMode
    );
  }
  if (updatedAt !== undefined) {
    document.updatedAt = updatedAt;
    // This appears to be the only way to override the updatedAt field in sequelize
    await sequelize.query("UPDATE documents SET \"updatedAt\" = :date WHERE id = :id", { replacements: { date: updatedAt.toISOString(), id: document.id }});
  }

  const changed = document.changed()
  const eventData = (updatedAt !== undefined) ? { source: "import", ...(done !== undefined ? { done } : {}) } : done !== undefined ? { done } : undefined;

  const event = {
    name: "documents.update",
    documentId: document.id,
    collectionId: cId,
    data: eventData,
  };

  if (publish && (document.template || cId)) {
    if (!document.collectionId) {
      document.collectionId = cId;
    }
    await document.publish(ctx, { collectionId: cId, data: eventData });
  } else if (changed) {
    document.lastModifiedById = user.id;
    document.updatedBy = user;

    if (isImport) {
      await document.save({ silent: !!updatedAt });
    } else {
      await document.saveWithCtx(ctx, { silent: !!updatedAt }, { data: eventData });
    }

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
