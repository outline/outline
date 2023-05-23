import { uniq, compact } from "lodash";

const attachmentRedirectRegex =
  /\/api\/attachments\.redirect\?id=(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
const attachmentPublicRegex =
  /public\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export default function parseAttachmentIds(
  text: string,
  includePublic = false
): string[] {
  return uniq(
    compact(
      [
        ...text.matchAll(attachmentRedirectRegex),
        ...(includePublic ? text.matchAll(attachmentPublicRegex) : []),
      ].map((match) => match.groups && match.groups.id)
    )
  );
}
