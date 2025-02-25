import emojiRegex from "emoji-regex";
import { z } from "zod";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { UrlHelper } from "@shared/utils/UrlHelper";

export function zodEnumFromObjectKeys<
  TI extends Record<string, any>,
  R extends string = TI extends Record<infer R, any> ? R : never
>(input: TI): z.ZodEnum<[R, ...R[]]> {
  const [firstKey, ...otherKeys] = Object.keys(input) as [R, ...R[]];
  return z.enum([firstKey, ...otherKeys]);
}

export const zodIdType = () =>
  z.union([z.string().regex(UrlHelper.SLUG_URL_REGEX), z.string().uuid()], {
    message: "Must be a valid UUID or slug",
  });

export const zodIconType = () =>
  z.union([
    z.string().regex(emojiRegex()),
    zodEnumFromObjectKeys(IconLibrary.mapping),
  ]);

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
    { message: "invalid timezone" }
  );
