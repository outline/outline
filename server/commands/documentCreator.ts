import { Transaction } from "sequelize";
import { Document, Event, User } from "@server/models";

export default async function documentCreator({
  title = "",
  text = "",
  id,
  publish,
  collectionId,
  parentDocumentId,
  templateDocument,
  createdAt,
  // allows override for import
  updatedAt,
  template,
  user,
  editorVersion,
  publishedAt,
  source,
  ip,
  transaction,
}: {
  id?: string;
  title: string;
  text: string;
  publish?: boolean;
  collectionId: string;
  parentDocumentId?: string;
  templateDocument?: Document | null;
  publishedAt?: Date;
  template?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  index?: number;
  user: User;
  editorVersion?: string;
  source?: "import";
  ip?: string;
  transaction: Transaction;
}): Promise<Document> {
  const templateId = templateDocument ? templateDocument.id : undefined;
  const document = await Document.create(
    {
      id,
      parentDocumentId,
      editorVersion,
      collectionId,
      teamId: user.teamId,
      userId: user.id,
      createdAt,
      updatedAt,
      lastModifiedById: user.id,
      createdById: user.id,
      template,
      templateId,
      publishedAt,
      title: templateDocument ? templateDocument.title : title,
      text: templateDocument ? templateDocument.text : text,
    },
    {
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
    await document.publish(user.id, { transaction });
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
