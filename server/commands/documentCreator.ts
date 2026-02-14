import type { Optional } from "utility-types";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import { Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
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
    | "template"
    | "fullWidth"
    | "sourceMetadata"
    | "editorVersion"
    | "publishedAt"
    | "createdAt"
    | "updatedAt"
  >
> & {
  state?: Buffer;
  publish?: boolean;
  index?: number;
  templateDocument?: Document | null;
};

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
    templateDocument,
    fullWidth,
    importId,
    apiImportId,
    createdAt,
    // allows override for import
    updatedAt,
    editorVersion,
    publishedAt,
    sourceMetadata,
  }: Props
): Promise<Document> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  const templateId = templateDocument ? templateDocument.id : undefined;

  const eventData = importId || apiImportId ? { source: "import" } : undefined;

  if (state && templateDocument) {
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
    (templateDocument
      ? template
        ? templateDocument.title
        : TextHelper.replaceTemplateVariables(templateDocument.title, user)
      : "");

  const contentWithReplacements = content
    ? content
    : text
      ? ProsemirrorHelper.toProsemirror(text).toJSON()
      : templateDocument
        ? template
          ? templateDocument.content
          : SharedProsemirrorHelper.replaceTemplateVariables(
              await DocumentHelper.toJSON(templateDocument),
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
    lastModifiedById: user.id,
    createdById: user.id,
    template,
    templateId,
    publishedAt,
    importId,
    apiImportId,
    sourceMetadata,
    fullWidth: fullWidth ?? templateDocument?.fullWidth,
    icon: icon ?? templateDocument?.icon,
    color: color ?? templateDocument?.color,
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
    if (!collectionId && !template) {
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
