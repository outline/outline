import { Transaction } from "sequelize";
import { Optional } from "utility-types";
import { Document, Event, User } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";

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
  templateDocument?: Document | null;
  user: User;
  ip?: string;
  transaction?: Transaction;
};

export default async function documentCreator({
  title = "",
  text = "",
  icon,
  color,
  state,
  id,
  urlId,
  publish,
  collectionId,
  parentDocumentId,
  template,
  templateDocument,
  fullWidth,
  importId,
  createdAt,
  // allows override for import
  updatedAt,
  user,
  editorVersion,
  publishedAt,
  sourceMetadata,
  ip,
  transaction,
}: Props): Promise<Document> {
  const templateId = templateDocument ? templateDocument.id : undefined;

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

  const document = await Document.create(
    {
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
      sourceMetadata,
      fullWidth: templateDocument ? templateDocument.fullWidth : fullWidth,
      icon: templateDocument ? templateDocument.icon : icon,
      color: templateDocument ? templateDocument.color : color,
      title: TextHelper.replaceTemplateVariables(
        templateDocument ? templateDocument.title : title,
        user
      ),
      text: await TextHelper.replaceImagesWithAttachments(
        TextHelper.replaceTemplateVariables(
          templateDocument ? templateDocument.text : text,
          user
        ),
        user,
        ip,
        transaction
      ),
      content: templateDocument
        ? ProsemirrorHelper.replaceTemplateVariables(
            templateDocument.content,
            user
          )
        : undefined,
      state,
    },
    {
      silent: !!createdAt,
      transaction,
    }
  );
  await Event.create(
    {
      name: "documents.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
      data: {
        source: importId ? "import" : undefined,
        title: document.title,
        templateId,
      },
      ip,
    },
    {
      transaction,
    }
  );

  if (publish) {
    if (!collectionId) {
      throw new Error("Collection ID is required to publish");
    }

    await document.publish(user.id, collectionId, { transaction });
    await Event.create(
      {
        name: "documents.publish",
        documentId: document.id,
        collectionId: document.collectionId,
        teamId: document.teamId,
        actorId: user.id,
        data: {
          source: importId ? "import" : undefined,
          title: document.title,
        },
        ip,
      },
      {
        transaction,
      }
    );
  }

  // reload to get all of the data needed to present (user, collection etc)
  // we need to specify publishedAt to bypass default scope that only returns
  // published documents
  return await Document.scope([
    "withDrafts",
    { method: ["withMembership", user.id] },
  ]).findOne({
    where: {
      id: document.id,
      publishedAt: document.publishedAt,
    },
    rejectOnEmpty: true,
    transaction,
  });
}
