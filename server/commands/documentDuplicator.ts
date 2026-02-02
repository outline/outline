import { Op } from "sequelize";
import type { Document } from "@server/models";
import { Collection, Document as DocumentModel } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import type { APIContext } from "@server/types";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { MentionType } from "@shared/types";
import type { ProsemirrorData } from "@shared/types";
import { Node } from "prosemirror-model";
import { schema, serializer } from "@server/editor";
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

/**
 * Remaps document links and mentions in a Prosemirror document to point to duplicated documents.
 *
 * @param content The Prosemirror document content
 * @param documentIdMap Map of original document IDs to duplicated document IDs
 * @param duplicatedDocuments Map of duplicated document IDs to Document instances
 * @param originalDocuments Map of original document IDs to Document instances
 * @returns Updated Prosemirror document content
 */
function remapDocumentLinks(
  content: ProsemirrorData | Node,
  documentIdMap: Map<string, string>,
  duplicatedDocuments: Map<string, Document>,
  originalDocuments: Map<string, Document>
): ProsemirrorData {
  const json = "toJSON" in content ? (content.toJSON() as ProsemirrorData) : content;

  // Create a map of urlId -> originalId for faster lookup
  const urlIdToOriginalId = new Map<string, string>();
  for (const [originalId, originalDoc] of originalDocuments.entries()) {
    urlIdToOriginalId.set(originalDoc.urlId, originalId);
  }

  function remapLinksInner(node: ProsemirrorData): ProsemirrorData {
    // Update mention nodes (document mentions)
    if (node.type === "mention" && node.attrs?.type === MentionType.Document) {
      const originalId = node.attrs.modelId as string;
      const duplicatedId = documentIdMap.get(originalId);

      if (duplicatedId) {
        node.attrs = {
          ...node.attrs,
          modelId: duplicatedId,
        };
      }
    }

    // Update link marks (document links)
    if (node.marks) {
      node.marks = node.marks.map((mark) => {
        if (mark.type === "link" && mark.attrs?.href) {
          const href = mark.attrs.href as string;
          const documentSlug = parseDocumentSlug(href);

          if (documentSlug) {
            // Extract urlId from slug (format: title-urlId)
            // The urlId is always 10 characters at the end of the slug
            // Extract last 10 characters as urlId
            const urlId = documentSlug.length >= 10
              ? documentSlug.substring(documentSlug.length - 10)
              : documentSlug;
            const originalId = urlIdToOriginalId.get(urlId);

            if (originalId) {
              const duplicatedId = documentIdMap.get(originalId);
              if (duplicatedId) {
                const duplicatedDoc = duplicatedDocuments.get(duplicatedId);
                if (duplicatedDoc) {
                  const newPath = DocumentModel.getPath({
                    title: duplicatedDoc.title,
                    urlId: duplicatedDoc.urlId,
                  });
                  // Preserve hash if present
                  const hash = href.includes("#") ? href.substring(href.indexOf("#")) : "";
                  mark.attrs = {
                    ...mark.attrs,
                    href: newPath + hash,
                  };
                }
              }
            }
          }
        }
        return mark;
      });
    }

    // Update link nodes (if href is in node.attrs)
    if (node.attrs?.href) {
      const href = node.attrs.href as string;
      const documentSlug = parseDocumentSlug(href);

      if (documentSlug) {
        // Extract urlId from slug (format: title-urlId)
        // The urlId is always 10 characters at the end of the slug
        const urlId = documentSlug.length >= 10
          ? documentSlug.substring(documentSlug.length - 10)
          : documentSlug;
        const originalId = urlIdToOriginalId.get(urlId);

        if (originalId) {
          const duplicatedId = documentIdMap.get(originalId);
          if (duplicatedId) {
            const duplicatedDoc = duplicatedDocuments.get(duplicatedId);
            if (duplicatedDoc) {
              const newPath = DocumentModel.getPath({
                title: duplicatedDoc.title,
                urlId: duplicatedDoc.urlId,
              });
              const hash = href.includes("#") ? href.substring(href.indexOf("#")) : "";
              node.attrs = {
                ...node.attrs,
                href: newPath + hash,
              };
            }
          }
        }
      }
    }

    // Recursively process child nodes
    if (node.content) {
      node.content = node.content.map(remapLinksInner);
    }

    return node;
  }

  return remapLinksInner(json);
}

export default async function documentDuplicator(
  ctx: APIContext,
  { document, collection, parentDocumentId, title, publish, recursive }: Props
): Promise<Document[]> {
  const newDocuments: Document[] = [];
  const documentIdMap = new Map<string, string>(); // originalId -> duplicatedId
  const duplicatedDocuments = new Map<string, Document>(); // duplicatedId -> Document
  const originalDocuments = new Map<string, Document>(); // originalId -> Document
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
  documentIdMap.set(document.id, duplicated.id);
  duplicatedDocuments.set(duplicated.id, duplicated);
  originalDocuments.set(document.id, document);

  const originalCollection = document?.collectionId
    ? await Collection.findByPk(document.collectionId, {
      attributes: {
        include: ["documentStructure"],
      },
    })
    : null;

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

    const sorted = DocumentHelper.sortDocumentsByStructure(
      childDocuments,
      originalCollection?.getDocumentTree(original.id)?.children ?? []
    ).reverse(); // we have to reverse since the child documents will be added in reverse order

    for (const childDocument of sorted) {
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
      documentIdMap.set(childDocument.id, duplicatedChildDocument.id);
      duplicatedDocuments.set(duplicatedChildDocument.id, duplicatedChildDocument);
      originalDocuments.set(childDocument.id, childDocument);
      await duplicateChildDocuments(childDocument, duplicatedChildDocument);
    }
  }

  if (recursive && !document.template) {
    await duplicateChildDocuments(document, duplicated);
  }

  // Remap all document links and mentions to point to duplicated documents
  for (const duplicatedDoc of newDocuments) {
    const originalId = duplicatedDoc.sourceMetadata?.originalDocumentId as
      | string
      | undefined;
    if (!originalId) {
      continue;
    }

    const originalDoc = originalDocuments.get(originalId);
    if (!originalDoc) {
      continue;
    }

    // Get current content and remap links
    const currentContent = DocumentHelper.toProsemirror(duplicatedDoc);
    const remappedContent = remapDocumentLinks(
      currentContent,
      documentIdMap,
      duplicatedDocuments,
      originalDocuments
    );

    // Update the document content
    const remappedNode = Node.fromJSON(schema, remappedContent);
    duplicatedDoc.content = remappedNode.toJSON();
    duplicatedDoc.text = serializer
      .serialize(remappedNode)
      .replace(/(^|\n)\\(\n|$)/g, "\n\n")
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .trim();
    await duplicatedDoc.save({ transaction: ctx.state.transaction });
  }

  return newDocuments;
}
