import { Transaction } from "sequelize";
import { Document, Event, User } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";

type Props = {
  id?: string;
  urlId?: string;
  title: string;
  text?: string;
  state?: Buffer;
  publish?: boolean;
  collectionId?: string | null;
  parentDocumentId?: string | null;
  importId?: string;
  templateDocument?: Document | null;
  publishedAt?: Date;
  template?: boolean;
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
  state,
  id,
  urlId,
  publish,
  collectionId,
  parentDocumentId,
  templateDocument,
  importId,
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
      updatedAt,
      lastModifiedById: user.id,
      createdById: user.id,
      template,
      templateId,
      publishedAt,
      importId,
      title: templateDocument
        ? DocumentHelper.replaceTemplateVariables(templateDocument.title, user)
        : title,
      text: templateDocument ? templateDocument.text : text,
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
    await document.publish(user.id, collectionId!, { transaction });
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
