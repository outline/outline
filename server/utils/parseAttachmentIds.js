// @flow
const attachmentRegex = /!\[.*?\]\(\/api\/attachments\.redirect\?id=(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi;

export default function parseAttachmentIds(text: any): string[] {
  return [...text.matchAll(attachmentRegex)].map(
    (match) => match.groups && match.groups.id
  );
}
