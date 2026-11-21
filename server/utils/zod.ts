import emojiRegex from "emoji-regex";
import { z } from "zod";
import { parseISO8601Duration } from "@shared/utils/date";
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
  z.union([z.uuid(), z.string().regex(UrlHelper.SHARE_URL_SLUG_REGEX)], {
    error: "Must be a valid UUID or share slug",
  });

/**
 * Returns a zod schema that validates a positive ISO 8601 duration string,
 * for example "P30D", "P6M", or "P1Y".
 *
 * @returns a zod schema for durations.
 */
export const zodISO8601DurationType = () =>
  z.string().refine(
    (value) => {
      const parsed = parseISO8601Duration(value);
      return !!parsed && Object.values(parsed).some((part) => part > 0);
    },
    {
      error: "Must be a positive ISO 8601 duration, e.g. P30D",
    }
  );

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
