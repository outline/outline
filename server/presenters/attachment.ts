import { Attachment } from "@server/models";

export default function present(attachment: Attachment) {
  return {
    documentId: attachment.documentId,
    contentType: attachment.contentType,
    name: attachment.name,
    id: attachment.id,
    url: attachment.canonicalUrl,
    size: attachment.size,
  };
}
