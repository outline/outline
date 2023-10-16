import { Transaction } from "sequelize";
import { Document, Event, User } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";

type Props = {
  id?: string;
  urlId?: string;
  title: string;
  emoji?: string | null;
  text?: string;
  state?: Buffer;
  publish?: boolean;
  collectionId?: string | null;
  parentDocumentId?: string | null;
  importId?: string;
  publishedAt?: Date;
  template?: boolean;
  templateDocument?: Document | null;
  fullWidth?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  user: User;
  editorVersion?: string;
  source?: "import";
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
  source,
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
        source,
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
          source,
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
