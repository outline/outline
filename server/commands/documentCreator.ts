import type { Optional } from "utility-types";
import { TextHelper } from "@shared/utils/TextHelper";
import { Collection, Document, type Template } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import { assertPresent } from "@server/validation";

type Props = Optional<
  Pick<
    Document,
    | "id"
    | "urlId"
    | "title"
    | "text"
    | "content"
    | "icon"
    | "color"
    | "collectionId"
    | "parentDocumentId"
    | "importId"
    | "apiImportId"
    | "fullWidth"
    | "sourceMetadata"
    | "editorVersion"
    | "publishedAt"
    | "createdAt"
    | "updatedAt"
    | "createdById"
    | "lastModifiedById"
  >
> & {
  state?: Buffer;
  publish?: boolean;
  template?: Template | null;
  index?: number;
};

type CreateLocation = {
  /** The collection to place the document in, if any. */
  collectionId?: string | null;
  /** The parent document to nest the new document under, if any. */
  parentDocumentId?: string | null;
};

/**
 * Authorizes the creation of a document at the requested location and resolves
 * the collection and parent document it will belong to. Shared by the
 * documents.create API route and the MCP create_document tool so that both
 * enforce identical permissions, including the team-level check that prevents
 * viewers and guests from creating drafts with no collection.
 *
 * @param ctx the API context containing the acting user.
 * @param location the requested collection and/or parent document.
 * @returns the resolved collection and parent document, when applicable.
 * @throws AuthorizationError when the user may not create the document.
 */
export async function authorizeDocumentCreate(
  ctx: APIContext,
  { collectionId, parentDocumentId }: CreateLocation
): Promise<{
  collection?: Collection | null;
  parentDocument?: Document | null;
}> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  if (parentDocumentId) {
    const parentDocument = await Document.findByPk(parentDocumentId, {
      userId: user.id,
      transaction,
    });
    const collection = parentDocument?.collectionId
      ? await Collection.findByPk(parentDocument.collectionId, {
          userId: user.id,
          transaction,
        })
      : undefined;
    authorize(user, "createChildDocument", parentDocument, { collection });
    return { collection, parentDocument };
  }

  if (collectionId) {
    const collection = await Collection.findByPk(collectionId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "createDocument", collection);
    return { collection };
  }

  authorize(user, "createDocument", user.team);
  return {};
}

/**
 * Authorizes publishing a document into a collection and resolves the target
 * collection. Shared by the documents.update API route and the MCP
 * update_document tool. Publishing places a document into a collection, so it
 * requires create permission on the destination — separate from the update
 * permission that governs editing a draft's content.
 *
 * @param ctx the API context containing the acting user.
 * @param document the document being published.
 * @param collectionId the destination collection, required when publishing a draft that has none.
 * @returns the resolved destination collection.
 * @throws AuthorizationError when the user may not publish into the collection.
 */
export async function authorizeDocumentPublish(
  ctx: APIContext,
  document: Document,
  collectionId?: string | null
): Promise<Collection | null | undefined> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  let collection = document.collection;

  if (document.isDraft) {
    authorize(user, "publish", document);
  }

  if (!document.collectionId) {
    assertPresent(
      collectionId,
      "collectionId is required to publish a draft without collection"
    );
    collection = await Collection.findByPk(collectionId!, {
      userId: user.id,
      transaction,
    });
  }

  if (document.parentDocumentId) {
    const parentDocument = await Document.findByPk(document.parentDocumentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "createChildDocument", parentDocument, { collection });
  } else {
    authorize(user, "createDocument", collection);
  }

  return collection;
}

export default async function documentCreator(
  ctx: APIContext,
  {
    title,
    text,
    icon,
    color,
    state,
    id,
    urlId,
    publish,
    index,
    collectionId,
    parentDocumentId,
    content,
    template,
    fullWidth,
    importId,
    apiImportId,
    createdAt,
    // allows override for import
    updatedAt,
    editorVersion,
    publishedAt,
    sourceMetadata,
    createdById,
    lastModifiedById,
  }: Props
): Promise<Document> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  const templateId = template ? template.id : undefined;
  const eventData = importId || apiImportId ? { source: "import" } : undefined;

  if (state && template) {
    throw new Error(
      "State cannot be set when creating a document from a template"
    );
  }

  if (urlId) {
    const existing = await Document.unscoped().findOne({
      attributes: ["id"],
      transaction,
      where: {
        urlId,
      },
    });
    if (existing) {
      urlId = undefined;
    }
  }

  const titleWithReplacements =
    title ??
    (template ? TextHelper.replaceTemplateVariables(template.title, user) : "");

  const contentWithReplacements = content
    ? content
    : text
      ? ProsemirrorHelper.toProsemirror(text).toJSON()
      : template
        ? ProsemirrorHelper.replaceTemplateVariables(
            await DocumentHelper.toJSON(template),
            user
          )
        : ProsemirrorHelper.toProsemirror("").toJSON();

  const document = Document.build({
    id,
    urlId,
    parentDocumentId,
    editorVersion,
    collectionId,
    teamId: user.teamId,
    createdAt,
    updatedAt: updatedAt ?? createdAt,
    lastModifiedById: lastModifiedById ?? createdById ?? user.id,
    createdById: createdById ?? user.id,
    templateId,
    publishedAt,
    importId,
    apiImportId,
    sourceMetadata,
    fullWidth: fullWidth ?? template?.fullWidth,
    icon: icon ?? template?.icon,
    color: color ?? template?.color,
    title: titleWithReplacements,
    content: contentWithReplacements,
    state,
  });

  document.text = await DocumentHelper.toMarkdown(document, {
    includeTitle: false,
  });

  await document.saveWithCtx(
    ctx,
    {
      silent: !!createdAt,
    },
    { data: eventData }
  );

  if (publish) {
    if (!collectionId) {
      throw new Error("Collection ID is required to publish");
    }

    await document.publish(ctx, {
      collectionId,
      silent: true,
      index,
      event: !!document.title,
      data: eventData,
    });
  }

  // reload to get all of the data needed to present (user, collection etc)
  // we need to specify publishedAt to bypass default scope that only returns
  // published documents
  return Document.findByPk(document.id, {
    userId: user.id,
    rejectOnEmpty: true,
    transaction,
  });
}
