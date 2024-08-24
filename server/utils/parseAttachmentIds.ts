import compact from "lodash/compact";
import uniq from "lodash/uniq";
import {
  attachmentPublicRegex,
  attachmentRedirectRegex,
} from "@shared/utils/ProsemirrorHelper";

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
