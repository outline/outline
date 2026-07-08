import { compact, uniq } from "es-toolkit/compat";
import {
  attachmentPublicRegex,
  attachmentRedirectRegex,
} from "@shared/utils/ProsemirrorHelper";

/**
 * Parses the unique attachment ids from attachment URLs in a text.
 *
 * @param text the text to parse.
 * @param includePublic whether to also include public attachment URLs.
 * @returns an array of unique attachment ids.
 */
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
