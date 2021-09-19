// @flow
import { Document, User, Collection, Event } from "../models";
import { sequelize } from "../sequelize";

export async function documentUpdater(
  document: Document,
  user: User,
  collection?: Collection,
  {
    id,
    title,
    text,
    publish,
    autosave,
    done,
    templateId,
    append,
    collectionId,
    editorVersion,
    parentDocumentId,
  }: Object,
  ip: String
): Document {
  const previousTitle = document.title;
  if (title) document.title = title;
  if (editorVersion) document.editorVersion = editorVersion;
  if (templateId) document.templateId = templateId;

  document.text = append ? document.text + text : text;
  document.lastModifiedById = user.id;

  let transaction;
  let updatedDocument;
  try {
    transaction = await sequelize.transaction();

    if (publish) {
      if (!document.publishedAt && !document.collection && collectionId) {
        document.collectionId = collectionId;
        if (parentDocumentId) document.parentDocumentId = parentDocumentId;
      }
      updatedDocument = await document.publish(user.id, { transaction });
    } else {
      updatedDocument = await document.save({ autosave, transaction });
    }

    updatedDocument.updatedBy = user;
    updatedDocument.collection = collection;

    if (publish) {
      await Event.create(
        {
          name: "documents.publish",
          documentId: updatedDocument.id,
          collectionId: updatedDocument.collectionId,
          teamId: updatedDocument.teamId,
          actorId: user.id,
          data: { title: updatedDocument.title },
          ip,
        },
        { transaction }
      );
    } else {
      await Event.create(
        {
          name: "documents.update",
          documentId: updatedDocument.id,
          collectionId: updatedDocument.collectionId,
          teamId: updatedDocument.teamId,
          actorId: user.id,
          data: {
            autosave,
            done,
            title: updatedDocument.title,
          },
          ip,
        },
        { transaction }
      );
    }

    if (updatedDocument.title !== previousTitle) {
      Event.add({
        name: "documents.title_change",
        documentId: updatedDocument.id,
        collectionId: updatedDocument.collectionId,
        teamId: updatedDocument.teamId,
        actorId: user.id,
        data: {
          previousTitle,
          title: updatedDocument.title,
        },
        ip,
      });
    }

    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  return updatedDocument;
}
