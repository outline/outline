import emojiRegex from "emoji-regex";
import { z } from "zod";
import { IconLibrary } from "@shared/utils/IconLibrary";

export function zodEnumFromObjectKeys<
  TI extends Record<string, any>,
  R extends string = TI extends Record<infer R, any> ? R : never
>(input: TI): z.ZodEnum<[R, ...R[]]> {
  const [firstKey, ...otherKeys] = Object.keys(input) as [R, ...R[]];
  return z.enum([firstKey, ...otherKeys]);
}

export const zodIconType = () =>
  z.union([
    z.string().regex(emojiRegex()),
    zodEnumFromObjectKeys(IconLibrary.mapping),
  ]);
