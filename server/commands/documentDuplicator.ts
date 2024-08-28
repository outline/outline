import { Transaction, Op } from "sequelize";
import { User, Collection, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import documentCreator from "./documentCreator";

type Props = {
  /** The user who is creating the document */
  user: User;
  /** The document to duplicate */
  document: Document;
  /** The collection to add the duplicated document to */
  collection?: Collection | null;
  /** Override of the parent document to add the duplicate to */
  parentDocumentId?: string;
  /** Override of the duplicated document title */
  title?: string;
  /** Override of the duplicated document publish state */
  publish?: boolean;
  /** Whether to duplicate child documents */
  recursive?: boolean;
  /** The database transaction to use for the creation */
  transaction?: Transaction;
  /** The IP address of the request */
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
    icon: document.icon,
    color: document.color,
    template: document.template,
    title: title ?? document.title,
    content: ProsemirrorHelper.removeMarks(
      DocumentHelper.toProsemirror(document),
      ["comment"]
    ),
    text: document.text,
    ...sharedProperties,
  });

  duplicated.collection = collection ?? null;
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
        icon: childDocument.icon,
        color: childDocument.color,
        title: childDocument.title,
        content: ProsemirrorHelper.removeMarks(
          DocumentHelper.toProsemirror(childDocument),
          ["comment"]
        ),
        text: childDocument.text,
        ...sharedProperties,
      });

      duplicatedChildDocument.collection = collection ?? null;
      newDocuments.push(duplicatedChildDocument);
      await duplicateChildDocuments(childDocument, duplicatedChildDocument);
    }
  }

  if (recursive && !document.template) {
    await duplicateChildDocuments(document, duplicated);
  }

  return newDocuments;
}
