import invariant from "invariant";
import { Transaction } from "sequelize";
import { sequelize } from "@server/database/sequelize";
import { APM } from "@server/logging/tracing";
import {
  User,
  Document,
  Attachment,
  Collection,
  Pin,
  Event,
} from "@server/models";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import pinDestroyer from "./pinDestroyer";

async function copyAttachments(
  document: Document,
  options?: { transaction?: Transaction }
) {
  let text = document.text;
  const documentId = document.id;
  // find any image attachments that are in this documents text
  const attachmentIds = parseAttachmentIds(text);

  for (const id of attachmentIds) {
    const existing = await Attachment.findOne({
      where: {
        teamId: document.teamId,
        id,
      },
    });

    // if the image attachment was originally uploaded to another document
    // (this can happen in various ways, copy/paste, or duplicate for example)
    // then create a new attachment pointed to this doc and update the reference
    // in the text so that it gets the moved documents permissions
    if (existing && existing.documentId !== documentId) {
      // @ts-expect-error dataValues exists
      const { id, ...rest } = existing.dataValues;
      const attachment = await Attachment.create(
        { ...rest, documentId },
        options
      );
      text = text.replace(existing.redirectUrl, attachment.redirectUrl);
    }
  }

  return text;
}

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
  let transaction: Transaction | undefined;
  const collectionChanged = collectionId !== document.collectionId;
  const previousCollectionId = document.collectionId;
  const result: Result = {
    collections: [],
    documents: [],
    collectionChanged,
  };

  if (document.template) {
    if (!collectionChanged) {
      return result;
    }

    document.collectionId = collectionId;
    document.parentDocumentId = null;
    document.lastModifiedById = user.id;
    document.updatedBy = user;
    await document.save();
    result.documents.push(document);
  } else {
    try {
      transaction = await sequelize.transaction();

      // remove from original collection
      const collection = await Collection.findByPk(document.collectionId, {
        transaction,
        paranoid: false,
      });

      const response = await collection?.removeDocumentInStructure(document, {
        save: false,
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
        document.text = await copyAttachments(document, {
          transaction,
        });
      }

      // add to new collection (may be the same)
      document.collectionId = collectionId;
      document.parentDocumentId = parentDocumentId;
      document.lastModifiedById = user.id;
      document.updatedBy = user;

      const newCollection = collectionChanged
        ? await Collection.scope({
            method: ["withMembership", user.id],
          }).findByPk(collectionId, {
            transaction,
          })
        : collection;

      invariant(newCollection, "collection should exist");

      await newCollection?.addDocumentToStructure(document, toIndex, {
        documentJson,
      });

      if (collection) {
        result.collections.push(collection);
      }

      // if collection does not remain the same loop through children and change their
      // collectionId and move any attachments they may have too. This includes
      // archived children, otherwise their collection would be wrong once restored.
      if (collectionChanged) {
        result.collections.push(newCollection);

        const loopChildren = async (documentId: string) => {
          const childDocuments = await Document.findAll({
            where: {
              parentDocumentId: documentId,
            },
          });
          await Promise.all(
            childDocuments.map(async (child) => {
              await loopChildren(child.id);
              child.text = await copyAttachments(child, {
                transaction,
              });
              child.collectionId = collectionId;
              await child.save();

              if (newCollection) {
                child.collection = newCollection;
              }
              result.documents.push(child);
            })
          );
        };

        await loopChildren(document.id);

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
      }

      await document.save({
        transaction,
      });

      if (newCollection) {
        document.collection = newCollection;
      }
      result.documents.push(document);

      await transaction.commit();
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }

      throw err;
    }
  }

  await Event.create({
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
  });

  // we need to send all updated models back to the client
  return result;
}

export default APM.traceFunction({})(documentMover);
