import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { Collection, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { APIContext } from "@server/types";
import documentCreator from "./documentCreator";
import { generateUrlId } from "@server/utils/url";

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

function rewriteLinks(json: any, urlIdMap: Map<string, string>): any {
  if (Array.isArray(json)) {
    return json.map((node: any) => rewriteLinks(node, urlIdMap));
  }

  if (json && typeof json === "object") {
    // marks: link href
    if (Array.isArray(json.marks)) {
      for (const mark of json.marks) {
        if (mark.type === "link" && mark.attrs?.href) {
          const href: string = mark.attrs.href;

          // domain-relative only
          if (!href.startsWith("/")) {
            continue;
          }

          const match = href.match(/^\/doc\/([^/#?]+)-([A-Za-z0-9]{10})(.*)$/);

          if (match) {
            const slug = match[1];
            const oldUrlId = match[2];
            const tail = match[3] || "";

            const newUrlId = urlIdMap.get(oldUrlId);
            if (newUrlId) {
              mark.attrs.href = `/doc/${slug}-${newUrlId}${tail}`;
            }
          }
        }
      }
    }

    // recurse children
    if (Array.isArray(json.content)) {
      json.content = json.content.map((child: any) =>
        rewriteLinks(child, urlIdMap)
      );
    }
  }

  return json;
}

export default async function documentDuplicator(
  ctx: APIContext,
  { document, collection, parentDocumentId, title, publish, recursive }: Props
): Promise<Document[]> {
  const newDocs: Document[] = [];

  const idMap = new Map<string, string>();
  const urlIdMap = new Map<string, string>();

  const recursiveFlag = (recursive ?? true) && !document.template;

  const originalCollection = document?.collectionId
    ? await Collection.findByPk(document.collectionId, {
      attributes: {
        include: ["documentStructure"],
      },
    })
    : null;

  async function getSortedChildren(original: Document): Promise<Document[]> {
    const children = await original.findChildDocuments(
      {
        archivedAt: original.archivedAt
          ? { [Op.ne]: null }
          : { [Op.eq]: null },
      },
      ctx
    );

    if (originalCollection) {
      return DocumentHelper.sortDocumentsByStructure(
        children,
        originalCollection.getDocumentTree(original.id)?.children ?? []
      ).reverse();
    }

    return children;
  }

  async function buildMaps(root: Document) {
    const queue: Document[] = [root];

    while (queue.length) {
      const doc = queue.shift()!;

      idMap.set(doc.id, uuidv4());
      urlIdMap.set(doc.urlId, generateUrlId());

      if (recursiveFlag) {
        queue.push(...(await getSortedChildren(doc)));
      }
    }
  }

  // 1) Prebuild id/urlId maps for entire subtree (or just root)
  await buildMaps(document);

  // 2) BFS clone
  const queue: Document[] = [document];

  while (queue.length) {
    const original = queue.shift()!;

    const newId = idMap.get(original.id)!;
    const newUrlId = urlIdMap.get(original.urlId)!;

    // Convert content → ProseMirror JSON
    const json = DocumentHelper.toProsemirror(original);
    const cleaned = ProsemirrorHelper.removeMarks(json, ["comment"]);
    const rewritten = rewriteLinks(cleaned, urlIdMap);

    // Determine correct parent
    let newParentId: string | null = null;

    if (original.id !== document.id) {
      newParentId = idMap.get(original.parentDocumentId ?? "") ?? null;
    } else if (parentDocumentId) {
      newParentId = parentDocumentId;
    }

    // Create duplicated document
    const duplicated = await documentCreator(ctx, {
      id: newId,
      urlId: newUrlId,
      parentDocumentId: newParentId,
      collectionId: collection?.id ?? original.collectionId,
      title:
        original.id === document.id
          ? (title ?? original.title)
          : original.title,
      icon: original.icon,
      color: original.color,
      template: original.template,
      content: rewritten,
      editorVersion: original.editorVersion,
      publish: publish ?? !!original.publishedAt,
      sourceMetadata: {
        ...original.sourceMetadata,
        originalDocumentId: original.id,
      },
    });

    newDocs.push(duplicated);

    // Continue BFS with structure-based children order
    if (recursiveFlag) {
      queue.push(...(await getSortedChildren(original)));
    }
  }

  return newDocs;
}