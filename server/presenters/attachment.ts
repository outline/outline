import { Attachment } from "@server/models";

export default function presentAttachment(attachment: Attachment) {
  return {
    userId: attachment.userId,
    documentId: attachment.documentId,
    contentType: attachment.contentType,
    name: attachment.name,
    id: attachment.id,
    url: attachment.url,
    size: attachment.size,
  };
}
