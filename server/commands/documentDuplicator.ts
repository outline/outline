import { Op } from "sequelize";
import { Collection, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { APIContext } from "@server/types";
import documentCreator from "./documentCreator";

type Props = {
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
};

export default async function documentDuplicator(
  ctx: APIContext,
  { document, collection, parentDocumentId, title, publish, recursive }: Props
): Promise<Document[]> {
  const newDocuments: Document[] = [];
  const sharedProperties = {
    collectionId: collection?.id,
    publish: publish ?? !!document.publishedAt,
  };

  const duplicated = await documentCreator(ctx, {
    parentDocumentId,
    icon: document.icon,
    color: document.color,
    template: document.template,
    title: title ?? document.title,
    content: ProsemirrorHelper.removeMarks(
      DocumentHelper.toProsemirror(document),
      ["comment"]
    ),
    sourceMetadata: {
      ...document.sourceMetadata,
      originalDocumentId: document.id,
    },
    ...sharedProperties,
  });

  duplicated.collection = collection ?? null;
  newDocuments.push(duplicated);

  async function duplicateChildDocuments(
    original: Document,
    duplicatedDocument: Document
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
      ctx
    );

    for (const childDocument of childDocuments) {
      const duplicatedChildDocument = await documentCreator(ctx, {
        parentDocumentId: duplicatedDocument.id,
        icon: childDocument.icon,
        color: childDocument.color,
        title: childDocument.title,
        content: ProsemirrorHelper.removeMarks(
          DocumentHelper.toProsemirror(childDocument),
          ["comment"]
        ),
        sourceMetadata: {
          ...childDocument.sourceMetadata,
          originalDocumentId: childDocument.id,
        },
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
