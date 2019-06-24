// @flow
import { Document, Collection } from '../models';
import { sequelize } from '../sequelize';
import events from '../events';

export default async function documentMover({
  document,
  collectionId,
  parentDocumentId,
  index,
}: {
  document: Document,
  collectionId: string,
  parentDocumentId: string,
  index?: number,
}) {
  let transaction;
  const result = { collections: [], documents: [] };
  const collectionChanged = collectionId !== document.collectionId;

  try {
    transaction = await sequelize.transaction();

    // remove from original collection
    const collection = await document.getCollection({ transaction });
    const documentJson = await collection.removeDocumentInStructure(document, {
      save: false,
    });

    // if the collection is the same then it will get saved below, this
    // line prevents a pointless intermediate save from occurring.
    if (collectionChanged) await collection.save({ transaction });

    // add to new collection (may be the same)
    document.collectionId = collectionId;
    document.parentDocumentId = parentDocumentId;

    const newCollection: Collection = collectionChanged
      ? await Collection.findByPk(collectionId, { transaction })
      : collection;
    await newCollection.addDocumentToStructure(document, index, {
      documentJson,
    });
    result.collections.push(collection);

    // if collection does not remain the same loop through children and change their
    // collectionId too. This includes archived children, otherwise their collection
    // would be wrong once restored.
    if (collectionChanged) {
      result.collections.push(newCollection);

      const loopChildren = async documentId => {
        const childDocuments = await Document.findAll({
          where: { parentDocumentId: documentId },
        });

        await Promise.all(
          childDocuments.map(async child => {
            await loopChildren(child.id);
            await child.update({ collectionId }, { transaction });
            child.collection = newCollection;
            result.documents.push(child);
          })
        );
      };

      await loopChildren(document.id);
    }

    await document.save({ transaction });
    result.documents.push(document);

    await transaction.commit();

    events.add({
      name: 'documents.move',
      modelId: document.id,
      collectionIds: result.collections.map(c => c.id),
      documentIds: result.documents.map(d => d.id),
      teamId: document.teamId,
    });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  // we need to send all updated models back to the client
  return result;
}
