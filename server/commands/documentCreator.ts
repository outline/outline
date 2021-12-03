import { Document, Event, User } from "@server/models";

export default async function documentCreator({
  title = "",
  text = "",
  publish,
  collectionId,
  parentDocumentId,
  templateDocument,
  createdAt,
  // allows override for import
  updatedAt,
  template,
  index,
  user,
  editorVersion,
  source,
  ip,
}: {
  title: string;
  text: string;
  publish?: boolean;
  collectionId: string;
  parentDocumentId?: string;
  templateDocument?: Document;
  template?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  index?: number;
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User;
  editorVersion?: string;
  source?: "import";
  ip: string;
}): Promise<Document> {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
  const templateId = templateDocument ? templateDocument.id : undefined;
  const document = await Document.create({
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
    title: templateDocument ? templateDocument.title : title,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'Document'.
    text: templateDocument ? templateDocument.text : text,
  });
  await Event.create({
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
  });

  if (publish) {
    await document.publish(user.id);
    await Event.create({
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
    });
  }

  // reload to get all of the data needed to present (user, collection etc)
  // we need to specify publishedAt to bypass default scope that only returns
  // published documents
  return Document.findOne({
    where: {
      id: document.id,
      publishedAt: document.publishedAt,
    },
  });
}
