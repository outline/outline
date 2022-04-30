import { uniq, compact } from "lodash";

const attachmentRegex = /\/api\/attachments\.redirect\?id=(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export default function parseAttachmentIds(text: string): string[] {
  return uniq(
    compact(
      [...text.matchAll(attachmentRegex)].map(
        (match) => match.groups && match.groups.id
      )
    )
  );
}
