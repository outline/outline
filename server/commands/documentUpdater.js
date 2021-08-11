// @flow
import { Document, User, Collection } from "../models";
import { sequelize } from "../sequelize";

export async function documentUpdater(
  document: Document,
  user: User,
  collection?: Collection,
  {
    title,
    editorVersion,
    templateId,
    text,
    append,
    collectionId,
    parentDocumentId,
    publish,
    autosave,
  }: Object
): Document {
  // Update document
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
    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  updatedDocument.updatedBy = user;
  updatedDocument.collection = collection;

  return updatedDocument;
}
