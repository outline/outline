import invariant from "invariant";
import { sequelize } from "@server/database/sequelize";
import { APM } from "@server/logging/tracing";
import { User, Document, Collection, Pin, Event } from "@server/models";
import pinDestroyer from "./pinDestroyer";

type Props = {
  user: User;
  document: Document;
  collectionId: string;
  parentDocumentId?: string | null;
  index?: number;
  ip: string;
};

type Result = {
  collections: Collection[];
  documents: Document[];
  collectionChanged: boolean;
};

async function documentMover({
  user,
  document,
  collectionId,
  parentDocumentId = null,
  // convert undefined to null so parentId comparison treats them as equal
  index,
  ip,
}: Props): Promise<Result> {
  const collectionChanged = collectionId !== document.collectionId;
  const previousCollectionId = document.collectionId;
  const result: Result = {
    collections: [],
    documents: [],
    collectionChanged,
  };

  if (document.template && !collectionChanged) {
    return result;
  }

  await sequelize.transaction(async (transaction) => {
    if (document.template) {
      document.collectionId = collectionId;
      document.parentDocumentId = null;
      document.lastModifiedById = user.id;
      document.updatedBy = user;
      await document.save({ transaction });
      result.documents.push(document);
    } else {
      // remove from original collection
      const collection = await Collection.findByPk(document.collectionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        paranoid: false,
      });

      const response = await collection?.removeDocumentInStructure(document, {
        save: false,
        transaction,
      });

      const documentJson = response?.[0];
      const fromIndex = response?.[1] || 0;

      // if we're reordering from within the same parent
      // the original and destination collection are the same,
      // so when the initial item is removed above, the list will reduce by 1.
      // We need to compensate for this when reordering
      const toIndex =
        index !== undefined &&
        document.parentDocumentId === parentDocumentId &&
        document.collectionId === collectionId &&
        fromIndex < index
          ? index - 1
          : index;

      // if the collection is the same then it will get saved below, this
      // line prevents a pointless intermediate save from occurring.
      if (collectionChanged) {
        await collection?.save({
          transaction,
        });
      }

      // add to new collection (may be the same)
      document.collectionId = collectionId;
      document.parentDocumentId = parentDocumentId;
      document.lastModifiedById = user.id;
      document.updatedBy = user;

      const newCollection = collectionChanged
        ? await Collection.findByPk(collectionId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : collection;

      invariant(newCollection, "collection should exist");

      await newCollection.addDocumentToStructure(document, toIndex, {
        documentJson,
        transaction,
      });

      if (collection) {
        result.collections.push(collection);
      }

      // if collection does not remain the same update the collectionId of all
      // active and archived children.
      if (collectionChanged) {
        result.collections.push(newCollection);

        const childDocumentIds = await document.getChildDocumentIds();
        const [, documents] = await Document.update(
          {
            collectionId: newCollection.id,
          },
          {
            transaction,
            returning: true,
            where: {
              id: [...childDocumentIds, document.id],
            },
          }
        );

        result.documents.push(
          ...documents.map((document) => {
            document.collection = newCollection;
            return document;
          })
        );

        const pin = await Pin.findOne({
          where: {
            documentId: document.id,
            collectionId: previousCollectionId,
          },
        });

        if (pin) {
          await pinDestroyer({
            user,
            pin,
            ip,
          });
        }
      } else {
        await document.save({ transaction });
        result.documents.push(document);
      }
    }

    await Event.create(
      {
        name: "documents.move",
        actorId: user.id,
        documentId: document.id,
        collectionId,
        teamId: document.teamId,
        data: {
          title: document.title,
          collectionIds: result.collections.map((c) => c.id),
          documentIds: result.documents.map((d) => d.id),
        },
        ip,
      },
      {
        transaction,
      }
    );
  });

  // we need to send all updated models back to the client
  return result;
}

export default APM.traceFunction({})(documentMover);
