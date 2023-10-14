import { Transaction, Op } from "sequelize";
import { User, Collection, Document } from "@server/models";
import documentCreator from "./documentCreator";

type Props = {
  user: User;
  document: Document;
  collection?: Collection | null;
  parentDocumentId?: string;
  title?: string;
  publish?: boolean;
  recursive?: boolean;
  transaction?: Transaction;
  ip: string;
};

export default async function documentDuplicator({
  user,
  document,
  collection,
  parentDocumentId,
  title,
  publish,
  recursive,
  transaction,
  ip,
}: Props): Promise<Document[]> {
  const newDocuments: Document[] = [];
  const sharedProperties = {
    user,
    collectionId: collection?.id,
    publish: publish ?? !!document.publishedAt,
    ip,
    transaction,
  };

  const duplicated = await documentCreator({
    parentDocumentId: parentDocumentId ?? document.parentDocumentId,
    emoji: document.emoji,
    template: document.template,
    title: title ?? document.title,
    text: document.text,
    ...sharedProperties,
  });

  duplicated.collection = collection;
  newDocuments.push(duplicated);

  async function duplicateChildDocuments(
    original: Document,
    duplicated: Document
  ) {
    const childDocuments = await original.findChildDocuments(
      {
        archivedAt: original.archivedAt
          ? {
              [Op.ne]: null,
            }
          : {
              [Op.eq]: null,
            },
      },
      {
        transaction,
      }
    );

    for (const childDocument of childDocuments) {
      const duplicatedChildDocument = await documentCreator({
        parentDocumentId: duplicated.id,
        emoji: childDocument.emoji,
        title: childDocument.title,
        text: childDocument.text,
        ...sharedProperties,
      });

      duplicatedChildDocument.collection = collection;
      newDocuments.push(duplicatedChildDocument);
      await duplicateChildDocuments(childDocument, duplicatedChildDocument);
    }
  }

  if (recursive && !document.template) {
    await duplicateChildDocuments(document, duplicated);
  }

  return newDocuments;
}
