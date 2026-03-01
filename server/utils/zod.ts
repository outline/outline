import emojiRegex from "emoji-regex";
import { z } from "zod";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { UrlHelper } from "@shared/utils/UrlHelper";

export function zodEnumFromObjectKeys<
  TI extends Record<string, unknown>,
  K extends string & keyof TI = string & keyof TI,
>(input: TI) {
  const keys = Object.keys(input) as [K, ...K[]];
  return z.enum(keys);
}

export const zodIdType = () =>
  z.union([z.string().regex(UrlHelper.SLUG_URL_REGEX), z.uuid()], {
    error: "Must be a valid UUID or slug",
  });

export const zodIconType = () =>
  z.union([
    z.string().regex(emojiRegex()),
    zodEnumFromObjectKeys(IconLibrary.mapping),
    z.uuid(),
  ]);

export const zodEmojiType = () =>
  z.union([z.string().regex(emojiRegex()), z.uuid()]);

export const zodShareIdType = () =>
  z.union([z.uuid(), z.string().regex(UrlHelper.SHARE_URL_SLUG_REGEX)]);

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
