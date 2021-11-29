import { Document, Attachment, Collection, User, Event } from "@server/models";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import { sequelize } from "../sequelize";

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'options' implicitly has an 'any' type.
async function copyAttachments(document: Document, options) {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'Document'.
  let text = document.text;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
  const documentId = document.id;
  // find any image attachments that are in this documents text
  const attachmentIds = parseAttachmentIds(text);

  for (const id of attachmentIds) {
    const existing = await Attachment.findOne({
      where: {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'teamId' does not exist on type 'Document... Remove this comment to see the full error message
        teamId: document.teamId,
        id,
      },
    });

    // if the image attachment was originally uploaded to another document
    // (this can happen in various ways, copy/paste, or duplicate for example)
    // then create a new attachment pointed to this doc and update the reference
    // in the text so that it gets the moved documents permissions
    if (existing && existing.documentId !== documentId) {
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

export default async function documentMover({
  user,
  document,
  collectionId,
  // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'string'.
  parentDocumentId = null,
  // convert undefined to null so parentId comparison treats them as equal
  index,
  ip,
}: {
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User;
  document: Document;
  collectionId: string;
  parentDocumentId?: string;
  index?: number;
  ip: string;
}) {
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'transaction' implicitly has type 'any' i... Remove this comment to see the full error message
  let transaction;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Do... Remove this comment to see the full error message
  const collectionChanged = collectionId !== document.collectionId;
  const result = {
    collections: [],
    documents: [],
    collectionChanged,
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'template' does not exist on type 'Docume... Remove this comment to see the full error message
  if (document.template) {
    if (!collectionChanged) {
      return result;
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Do... Remove this comment to see the full error message
    document.collectionId = collectionId;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'parentDocumentId' does not exist on type... Remove this comment to see the full error message
    document.parentDocumentId = null;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'lastModifiedById' does not exist on type... Remove this comment to see the full error message
    document.lastModifiedById = user.id;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'updatedBy' does not exist on type 'Docum... Remove this comment to see the full error message
    document.updatedBy = user;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'save' does not exist on type 'Document'.
    await document.save();
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Document' is not assignable to p... Remove this comment to see the full error message
    result.documents.push(document);
  } else {
    try {
      transaction = await sequelize.transaction();
      // remove from original collection
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Do... Remove this comment to see the full error message
      const collection = await Collection.findByPk(document.collectionId, {
        transaction,
        paranoid: false,
      });
      const [
        documentJson,
        fromIndex,
      ] = (await collection.removeDocumentInStructure(document, {
        save: false,
      })) || [undefined, index];
      // if we're reordering from within the same parent
      // the original and destination collection are the same,
      // so when the initial item is removed above, the list will reduce by 1.
      // We need to compensate for this when reordering
      const toIndex =
        index !== undefined &&
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'parentDocumentId' does not exist on type... Remove this comment to see the full error message
        document.parentDocumentId === parentDocumentId &&
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Do... Remove this comment to see the full error message
        document.collectionId === collectionId &&
        fromIndex < index
          ? index - 1
          : index;

      // if the collection is the same then it will get saved below, this
      // line prevents a pointless intermediate save from occurring.
      if (collectionChanged) {
        await collection.save({
          transaction,
        });
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'Document'.
        document.text = await copyAttachments(document, {
          transaction,
        });
      }

      // add to new collection (may be the same)
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Do... Remove this comment to see the full error message
      document.collectionId = collectionId;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'parentDocumentId' does not exist on type... Remove this comment to see the full error message
      document.parentDocumentId = parentDocumentId;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'lastModifiedById' does not exist on type... Remove this comment to see the full error message
      document.lastModifiedById = user.id;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'updatedBy' does not exist on type 'Docum... Remove this comment to see the full error message
      document.updatedBy = user;
      // @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
      const newCollection: Collection = collectionChanged
        ? await Collection.scope({
            method: ["withMembership", user.id],
          }).findByPk(collectionId, {
            transaction,
          })
        : collection;
      await newCollection.addDocumentToStructure(document, toIndex, {
        documentJson,
      });
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'any' is not assignable to parame... Remove this comment to see the full error message
      result.collections.push(collection);

      // if collection does not remain the same loop through children and change their
      // collectionId and move any attachments they may have too. This includes
      // archived children, otherwise their collection would be wrong once restored.
      if (collectionChanged) {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'any' is not assignable to parame... Remove this comment to see the full error message
        result.collections.push(newCollection);

        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentId' implicitly has an 'any' typ... Remove this comment to see the full error message
        const loopChildren = async (documentId) => {
          const childDocuments = await Document.findAll({
            where: {
              parentDocumentId: documentId,
            },
          });
          await Promise.all(
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'child' implicitly has an 'any' type.
            childDocuments.map(async (child) => {
              await loopChildren(child.id);
              child.text = await copyAttachments(child, {
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'transaction' implicitly has an 'any' typ... Remove this comment to see the full error message
                transaction,
              });
              child.collectionId = collectionId;
              await child.save();
              child.collection = newCollection;
              // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'any' is not assignable to parame... Remove this comment to see the full error message
              result.documents.push(child);
            })
          );
        };

        // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
        await loopChildren(document.id);
      }

      // @ts-expect-error ts-migrate(2339) FIXME: Property 'save' does not exist on type 'Document'.
      await document.save({
        transaction,
      });
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'collection' does not exist on type 'Docu... Remove this comment to see the full error message
      document.collection = newCollection;
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Document' is not assignable to p... Remove this comment to see the full error message
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
    documentId: document.id,
    collectionId,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'teamId' does not exist on type 'Document... Remove this comment to see the full error message
    teamId: document.teamId,
    data: {
      title: document.title,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
      collectionIds: result.collections.map((c) => c.id),
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
      documentIds: result.documents.map((d) => d.id),
    },
    ip,
  });
  // we need to send all updated models back to the client
  return result;
}
