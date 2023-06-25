import { Transaction } from "sequelize";
import { Event, Document, User } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";

type Props = {
  /** The user updating the document */
  user: User;
  /** The existing document */
  document: Document;
  /** The new title */
  title?: string;
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
  /** Whether the text be appended to the end instead of replace */
  append?: boolean;
  /** Whether the document should be published to the collection */
  publish?: boolean;
  /** The ID of the collection to publish the document to */
  collectionId?: string | null;
  /** The IP address of the user creating the document */
  ip: string;
  /** The database transaction to run within */
  transaction: Transaction;
};

/**
 * This command updates document properties. To update collaborative text state
 * use documentCollaborativeUpdater.
 *
 * @param Props The properties of the document to update
 * @returns Document The updated document
 */
export default async function documentUpdater({
  user,
  document,
  title,
  text,
  editorVersion,
  templateId,
  fullWidth,
  append,
  publish,
  collectionId,
  done,
  transaction,
  ip,
}: Props): Promise<Document> {
  const previousTitle = document.title;
  const cId = collectionId || document.collectionId;

  if (title !== undefined) {
    document.title = title.trim();
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
  if (text !== undefined) {
    document = DocumentHelper.applyMarkdownToDocument(document, text, append);
  }

  const changed = document.changed();

  const event = {
    name: "documents.update",
    documentId: document.id,
    collectionId: cId,
    teamId: document.teamId,
    actorId: user.id,
    data: {
      title: document.title,
    },
    ip,
  };

  if (publish && cId) {
    if (!document.collectionId) {
      document.collectionId = cId;
    }
    await document.publish(user.id, cId, { transaction });

    await Event.create(
      {
        ...event,
        name: "documents.publish",
      },
      { transaction }
    );
  } else if (changed) {
    document.lastModifiedById = user.id;
    await document.save({ transaction });

    await Event.create(event, { transaction });
  } else if (done) {
    await Event.schedule(event);
  }

  if (document.title !== previousTitle) {
    await Event.schedule({
      name: "documents.title_change",
      documentId: document.id,
      collectionId: cId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        previousTitle,
        title: document.title,
      },
      ip,
    });
  }

  return document;
}
