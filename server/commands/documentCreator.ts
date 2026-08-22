import type { Optional } from "utility-types";
import { TextHelper } from "@shared/utils/TextHelper";
import { Collection, Document, type Template } from "@server/models";
import { AuthorizationError, ValidationError } from "@server/errors";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";

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
    | "preferences"
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
  personalOwnerId?: string | null;
  template?: Template | null;
  index?: number;
};

type CreateLocation = {
  /** The collection to place the document in, if any. */
  collectionId?: string | null;
  /** The parent document to nest the new document under, if any. */
  parentDocumentId?: string | null;
  /** The user whose personal space to place the document in, if any. */
  personalOwnerId?: string | null;
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
 * @returns the resolved location, and the parent document when applicable.
 * @throws AuthorizationError when the user may not create the document.
 */
export async function authorizeDocumentCreate(
  ctx: APIContext,
  { collectionId, parentDocumentId, personalOwnerId }: CreateLocation
): Promise<{
  collection?: Collection | null;
  parentDocument?: Document | null;
  personalOwnerId?: string | null;
}> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  if (personalOwnerId) {
    authorizePersonalOwner(ctx, personalOwnerId);
    return { personalOwnerId };
  }

  if (parentDocumentId) {
    const parentDocument = await Document.findByPk(parentDocumentId, {
      userId: user.id,
      transaction,
    });
    // A nested document inherits the location of its parent rather than
    // choosing one, so a child of a personal document is personal too.
    const home = resolveHome(parentDocument);
    const collection = home.collectionId
      ? await Collection.findByPk(home.collectionId, {
          userId: user.id,
          transaction,
        })
      : undefined;
    authorize(user, "createChildDocument", parentDocument, { collection });
    return {
      collection,
      parentDocument,
      personalOwnerId: home.personalOwnerId,
    };
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
 * The home that a document nested under a parent inherits. A document lives in
 * a collection or in a person's own space, never in both and never in neither.
 *
 * @param parent the parent document to inherit from.
 * @returns the collection and personal owner of the parent.
 */
export function resolveHome(parent: Document | null | undefined): {
  collectionId: string | null;
  personalOwnerId: string | null;
} {
  return {
    collectionId: parent?.collectionId ?? null,
    personalOwnerId: parent?.personalOwnerId ?? null,
  };
}

/**
 * Authorizes placing a document in a personal space. A document may only be
 * placed in the acting user's own space – no permission exists to put one in
 * somebody else's.
 *
 * @param ctx the API context containing the acting user.
 * @param personalOwnerId the personal space the document is destined for.
 * @throws AuthorizationError when the space belongs to another user.
 */
export function authorizePersonalOwner(
  ctx: APIContext,
  personalOwnerId: string
) {
  const { user } = ctx.state.auth;
  authorize(user, "createPersonalDocument", user.team);

  if (personalOwnerId !== user.id) {
    throw AuthorizationError(
      "A document can only be placed in your own personal space"
    );
  }
}

/**
 * Authorizes publishing a document and resolves where it will live. Shared by
 * the documents.update API route and the MCP update_document tool. Publishing
 * places a document into a collection or a personal space, so it requires
 * create permission on the destination — separate from the update permission
 * that governs editing a draft's content.
 *
 * @param ctx the API context containing the acting user.
 * @param document the document being published.
 * @param location the requested destination, one of collectionId or personalOwnerId.
 * @returns the resolved destination.
 * @throws AuthorizationError when the user may not publish to the destination.
 * @throws ValidationError when no destination can be resolved.
 */
export async function authorizeDocumentPublish(
  ctx: APIContext,
  document: Document,
  location: { collectionId?: string | null; personalOwnerId?: string | null }
): Promise<{ collection?: Collection | null; personalOwnerId: string | null }> {
  const { collectionId, personalOwnerId } = location;
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  if (document.isDraft) {
    authorize(user, "publish", document);
  }

  // Publishing chooses where a draft first lands. Relocating a document that
  // already has a home is a move, and saying so is better than quietly
  // ignoring the parameter.
  if (personalOwnerId && !document.isDraft) {
    throw ValidationError(
      "personalOwnerId can only be set when publishing a draft, use documents.move to relocate a published document"
    );
  }

  // A nested document always shares the home of its parent, so the destination
  // is not the caller's to choose.
  if (document.parentDocumentId) {
    if (collectionId || personalOwnerId) {
      throw ValidationError(
        "collectionId and personalOwnerId cannot be used when publishing a nested document, it inherits the location of its parent"
      );
    }

    const parentDocument = await Document.findByPk(document.parentDocumentId, {
      userId: user.id,
      transaction,
    });
    const home = resolveHome(parentDocument);
    const collection = home.collectionId
      ? await Collection.findByPk(home.collectionId, {
          userId: user.id,
          transaction,
        })
      : null;

    authorize(user, "createChildDocument", parentDocument, { collection });
    return { collection, personalOwnerId: home.personalOwnerId };
  }

  if (personalOwnerId) {
    authorizePersonalOwner(ctx, personalOwnerId);
    return { personalOwnerId };
  }

  if (document.collectionId) {
    authorize(user, "createDocument", document.collection);
    return { collection: document.collection, personalOwnerId: null };
  }

  if (!collectionId) {
    throw ValidationError(
      "collectionId or personalOwnerId is required to publish a draft without a location"
    );
  }

  const collection = await Collection.findByPk(collectionId, {
    userId: user.id,
    transaction,
  });
  authorize(user, "createDocument", collection);
  return { collection, personalOwnerId: null };
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
    personalOwnerId,
    index,
    collectionId,
    parentDocumentId,
    content,
    template,
    fullWidth,
    preferences,
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
    preferences,
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
    if (!collectionId && !parentDocumentId && !personalOwnerId) {
      throw new Error(
        "A collection, parent document or personal owner is required to publish"
      );
    }

    if (personalOwnerId) {
      document.personalOwnerId = personalOwnerId;
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
