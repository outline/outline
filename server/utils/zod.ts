import emojiRegex from "emoji-regex";
import { z } from "zod";
import { iconNames } from "@shared/utils/IconNames";
import { UrlHelper } from "@shared/utils/UrlHelper";

/**
 * Creates a zod enum schema from the keys of an object.
 *
 * @param input the object whose keys become the enum values.
 * @returns a zod enum schema of the object's keys.
 */
export function zodEnumFromObjectKeys<
  TI extends Record<string, unknown>,
  K extends string & keyof TI = string & keyof TI,
>(input: TI) {
  const keys = Object.keys(input) as [K, ...K[]];
  return z.enum(keys);
}

/**
 * Returns a zod schema that validates a model identifier, either a UUID or a
 * URL slug.
 *
 * @returns a zod schema for identifiers.
 */
export const zodIdType = () =>
  z.union([z.string().regex(UrlHelper.SLUG_URL_REGEX), z.uuid()], {
    error: "Must be a valid UUID or slug",
  });

/**
 * Returns a zod schema that validates an icon value, either an emoji, a named
 * icon from the icon library, or an attachment UUID.
 *
 * @returns a zod schema for icons.
 */
export const zodIconType = () =>
  z.union([z.string().regex(emojiRegex()), z.enum(iconNames), z.uuid()]);

/**
 * Returns a zod schema that validates an emoji value, either an emoji
 * character or a custom emoji UUID.
 *
 * @returns a zod schema for emoji.
 */
export const zodEmojiType = () =>
  z.union([z.string().regex(emojiRegex()), z.uuid()]);

/**
 * Returns a zod schema that validates a share identifier, either a UUID or a
 * share URL slug.
 *
 * @returns a zod schema for share identifiers.
 */
export const zodShareIdType = () =>
  z.union([z.uuid(), z.string().regex(UrlHelper.SHARE_URL_SLUG_REGEX)]);

/**
 * Returns a zod schema that validates an IANA timezone name.
 *
 * @returns a zod schema for timezones.
 */
export const zodTimezone = () =>
  z.string().refine(
    (timezone) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
      } catch {
        return false;
      }
    },
    {
      error: "invalid timezone",
    }
  );

/**
 * A zod check that a document names at most one place to live. A personal
 * space, a collection, and a parent document are alternatives, so naming a
 * personal space rules the other two out.
 *
 * @param ctx the check context supplied by zod.
 */
export function zodSingleDocumentLocation(
  ctx: z.core.ParsePayload<{
    collectionId?: string | null;
    parentDocumentId?: string | null;
    personalOwnerId?: string | null;
  }>
) {
  const { collectionId, parentDocumentId, personalOwnerId } = ctx.value;

  if (personalOwnerId && (collectionId || parentDocumentId)) {
    ctx.issues.push({
      code: "custom",
      input: ctx.value,
      path: ["personalOwnerId"],
      message:
        "cannot be combined with collectionId or parentDocumentId, pass parentDocumentId alone to nest under an existing personal document",
    });
  }
}
