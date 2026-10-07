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

type ManyProps = {
  /** The documents to duplicate, in the order they should be created */
  documents: Document[];
  /** The collection to add the duplicated documents to */
  collection?: Collection | null;
  /** Override of the duplicated documents publish state */
  publish?: boolean;
  /** Whether to duplicate child documents */
  recursive?: boolean;
};

/** A document to duplicate, and where its duplicate should be placed. */
type Root = {
  /** The document to duplicate */
  document: Document;
  /** Override of the duplicated document title */
  title?: string;
  /** Override of the parent document to add the duplicate to */
  parentDocumentId?: string;
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

/**
 * Duplicates a document, optionally including its child documents. Links
 * between the duplicated documents are remapped to point at the copies.
 *
 * @param ctx the API context containing the acting user and transaction.
 * @param props the document to duplicate and optional overrides.
 * @returns the duplicated documents.
 */
export default async function documentDuplicator(
  ctx: APIContext,
  { document, collection, parentDocumentId, title, publish, recursive }: Props
): Promise<Document[]> {
  return duplicateRoots(ctx, {
    roots: [{ document, title, parentDocumentId }],
    collection,
    publish,
    recursive,
  });
}

/**
 * Duplicates several documents as one unit, so that links between them are
 * remapped to the copies no matter which of the documents they cross between.
 *
 * @param ctx the API context containing the acting user and transaction.
 * @param props the documents to duplicate and optional overrides.
 * @returns the duplicated documents.
 */
export async function documentsDuplicator(
  ctx: APIContext,
  { documents, collection, publish, recursive }: ManyProps
): Promise<Document[]> {
  return duplicateRoots(ctx, {
    roots: documents.map((document) => ({ document })),
    collection,
    publish,
    recursive,
  });
}

async function duplicateRoots(
  ctx: APIContext,
  {
    roots,
    collection,
    publish,
    recursive,
  }: {
    roots: Root[];
    collection?: Collection | null;
    publish?: boolean;
    recursive?: boolean;
  }
): Promise<Document[]> {
  const newDocuments: Document[] = [];
  const references = new Map<string, DocumentReference>();
  const originalCollections = new Map<string, Collection | null>();

  async function originalCollectionFor(original: Document) {
    const collectionId = original.collectionId;
    if (!collectionId) {
      return null;
    }
    if (!originalCollections.has(collectionId)) {
      originalCollections.set(
        collectionId,
        await Collection.findByPk(collectionId, {
          attributes: {
            include: ["documentStructure"],
          },
        })
      );
    }
    return originalCollections.get(collectionId) ?? null;
  }

  async function buildItem(
    original: Document,
    originalCollection: Collection | null,
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
      children: recursive
        ? await buildChildItems(original, originalCollection)
        : [],
    };
  }

  async function buildChildItems(
    original: Document,
    originalCollection: Collection | null
  ) {
    // Structural fields only – content is re-fetched per document in
    // `duplicateItem`, so a large tree isn't held in memory at once.
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
        ...ctx,
        attributes: { exclude: ["state", "content", "text"] },
      }
    );

    const sorted = DocumentHelper.sortDocumentsByStructure(
      childDocuments,
      originalCollection?.getDocumentTree(original.id)?.children ?? []
    ).reverse(); // we have to reverse since the child documents will be added in reverse order

    const items: DuplicateItem[] = [];
    for (const childDocument of sorted) {
      items.push(await buildItem(childDocument, originalCollection));
    }
    return items;
  }

  async function duplicateItem(
    item: DuplicateItem,
    options: { parentDocumentId?: string; publish: boolean }
  ) {
    const original =
      item.original.dataValues.content !== undefined
        ? item.original
        : await Document.findByPk(item.original.id, {
            transaction: ctx.state.transaction,
            rejectOnEmpty: true,
          });

    const duplicated = await documentCreator(ctx, {
      id: item.id,
      urlId: item.urlId,
      parentDocumentId: options.parentDocumentId,
      publish: options.publish,
      collectionId: collection?.id,
      icon: original.icon,
      color: original.color,
      fullWidth: original.fullWidth,
      preferences: original.preferences,
      title: item.title,
      content: ProsemirrorHelper.replaceDocumentReferences(
        ProsemirrorHelper.removeMarks(DocumentHelper.toProsemirror(original), [
          "comment",
        ]),
        references
      ),
      sourceMetadata: {
        ...original.sourceMetadata,
        originalDocumentId: original.id,
      },
    });

    duplicated.collection = collection ?? null;
    newDocuments.push(duplicated);

    for (const child of item.children) {
      await duplicateItem(child, {
        ...options,
        parentDocumentId: duplicated.id,
      });
    }
  }

  // The identifiers of every duplicate are assigned before any content is
  // written so that links between the documents being duplicated can be
  // remapped to the copies, leaving the duplicate self-contained.
  const items: DuplicateItem[] = [];
  for (const root of roots) {
    items.push(
      await buildItem(
        root.document,
        await originalCollectionFor(root.document),
        root.title
      )
    );
  }

  for (const [index, item] of items.entries()) {
    await duplicateItem(item, {
      parentDocumentId: roots[index].parentDocumentId,
      publish: publish ?? !!roots[index].document.publishedAt,
    });
  }

  return newDocuments;
}
