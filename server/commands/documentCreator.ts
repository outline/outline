import { Transaction } from "sequelize";
import { Optional } from "utility-types";
import { Document, Event, User } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";

type Props = Optional<
  Pick<
    Document,
    | "id"
    | "urlId"
    | "title"
    | "text"
    | "emoji"
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
  emoji,
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
      userId: user.id,
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
      emoji: templateDocument ? templateDocument.emoji : emoji,
      title: DocumentHelper.replaceTemplateVariables(
        templateDocument ? templateDocument.title : title,
        user
      ),
      text: await DocumentHelper.replaceImagesWithAttachments(
        DocumentHelper.replaceTemplateVariables(
          templateDocument ? templateDocument.text : text,
          user
        ),
        user,
        ip,
        transaction
      ),
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
  return await Document.findOne({
    where: {
      id: document.id,
      publishedAt: document.publishedAt,
    },
    rejectOnEmpty: true,
    transaction,
  });
}
