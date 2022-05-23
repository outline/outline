import { Transaction } from "sequelize";
import { Event, Document, User } from "@server/models";

type Props = {
  /** The user updating the document */
  user: User;
  /** The existing document */
  document: Document;
  /** The new title */
  title?: string;
  /** The new text content */
  text?: string;
  /** The version of the client editor that was used */
  editorVersion?: string;
  /** The ID of the template that was used */
  templateId?: string;
  /** If the document should be displayed full-width on the screen */
  fullWidth?: boolean;
  /** Whether the text be appended to the end instead of replace */
  append?: boolean;
  /** Whether the document should be published to the collection */
  publish?: boolean;
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
  transaction,
  ip,
}: Props): Promise<Document> {
  const previousTitle = document.title;

  if (title !== undefined) {
    document.title = title;
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
  if (!user.team?.collaborativeEditing) {
    if (append) {
      document.text += text;
    } else if (text !== undefined) {
      document.text = text;
    }
  }

  const changed = document.changed();

  if (publish) {
    document.lastModifiedById = user.id;
    await document.publish(user.id, { transaction });

    await Event.create(
      {
        name: "documents.publish",
        documentId: document.id,
        collectionId: document.collectionId,
        teamId: document.teamId,
        actorId: user.id,
        data: {
          title: document.title,
        },
        ip,
      },
      { transaction }
    );
  } else if (changed) {
    document.lastModifiedById = user.id;
    await document.save({ transaction });

    await Event.create(
      {
        name: "documents.update",
        documentId: document.id,
        collectionId: document.collectionId,
        teamId: document.teamId,
        actorId: user.id,
        data: {
          title: document.title,
        },
        ip,
      },
      { transaction }
    );
  }

  if (document.title !== previousTitle) {
    Event.schedule({
      name: "documents.title_change",
      documentId: document.id,
      collectionId: document.collectionId,
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
