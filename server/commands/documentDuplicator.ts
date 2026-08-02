import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { Collection, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import type { DocumentReference } from "@server/models/helpers/ProsemirrorHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import type { APIContext } from "@server/types";
import { generateUrlId } from "@server/utils/url";
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

/** A document to duplicate, with the identifiers assigned to its duplicate. */
type DuplicateItem = {
  /** The document being duplicated */
  original: Document;
  /** The id assigned to the duplicate */
  id: string;
  /** The url identifier assigned to the duplicate */
  urlId: string;
  /** The title of the duplicate */
  title: string;
  /** The children to duplicate under the duplicate */
  children: DuplicateItem[];
};

export default async function documentDuplicator(
  ctx: APIContext,
  { document, collection, parentDocumentId, title, publish, recursive }: Props
): Promise<Document[]> {
  const newDocuments: Document[] = [];
  const references = new Map<string, DocumentReference>();
  const sharedProperties = {
    collectionId: collection?.id,
    publish: publish ?? !!document.publishedAt,
  };

  const originalCollection = document?.collectionId
    ? await Collection.findByPk(document.collectionId, {
        attributes: {
          include: ["documentStructure"],
        },
      })
    : null;

  async function buildItem(
    original: Document,
    titleOverride?: string
  ): Promise<DuplicateItem> {
    const id = randomUUID();
    const urlId = generateUrlId();
    const itemTitle = titleOverride ?? original.title;

    const reference = {
      id,
      path: Document.getPath({ title: itemTitle, urlId }),
    };
    references.set(original.id, reference);
    references.set(original.urlId, reference);

    return {
      original,
      id,
      urlId,
      title: itemTitle,
      children: recursive ? await buildChildItems(original) : [],
    };
  }

  async function buildChildItems(original: Document) {
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

    const items: DuplicateItem[] = [];
    for (const childDocument of sorted) {
      items.push(await buildItem(childDocument));
    }
    return items;
  }

  // The identifiers of every duplicate are assigned before any content is
  // written so that links between the documents being duplicated can be
  // remapped to the copies, leaving the duplicated tree self-contained.
  const root = await buildItem(document, title);

  async function duplicateItem(item: DuplicateItem, parentId?: string) {
    const duplicated = await documentCreator(ctx, {
      id: item.id,
      urlId: item.urlId,
      parentDocumentId: parentId,
      icon: item.original.icon,
      color: item.original.color,
      fullWidth: item.original.fullWidth,
      title: item.title,
      content: ProsemirrorHelper.replaceDocumentReferences(
        ProsemirrorHelper.removeMarks(
          DocumentHelper.toProsemirror(item.original),
          ["comment"]
        ),
        references
      ),
      sourceMetadata: {
        ...item.original.sourceMetadata,
        originalDocumentId: item.original.id,
      },
      ...sharedProperties,
    });

    duplicated.collection = collection ?? null;
    newDocuments.push(duplicated);

    for (const child of item.children) {
      await duplicateItem(child, duplicated.id);
    }
  }

  await duplicateItem(root, parentDocumentId);

  return newDocuments;
}
