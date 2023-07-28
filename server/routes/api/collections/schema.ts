import { isUndefined } from "lodash";
import { z } from "zod";
import { randomElement } from "@shared/random";
import { CollectionPermission } from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
import { Collection } from "@server/models";
import { ValidateColor, ValidateIcon, ValidateIndex } from "@server/validation";
import BaseSchema from "../BaseSchema";

export const CollectionsCreateSchema = BaseSchema.extend({
  body: z.object({
    name: z.string(),
    color: z
      .string()
      .regex(ValidateColor.regex, { message: ValidateColor.message })
      .default(randomElement(colorPalette)),
    description: z.string().nullish(),
    permission: z
      .nativeEnum(CollectionPermission)
      .nullish()
      .transform((val) => (isUndefined(val) ? null : val)),
    sharing: z.boolean().default(true),
    icon: z
      .string()
      .max(ValidateIcon.maxLength, {
        message: `Must be ${ValidateIcon.maxLength} or fewer characters long`,
      })
      .optional(),
    sort: z
      .object({
        field: z.union([z.literal("title"), z.literal("index")]),
        direction: z.union([z.literal("asc"), z.literal("desc")]),
      })
      .default(Collection.DEFAULT_SORT),
    index: z
      .string()
      .regex(ValidateIndex.regex, { message: ValidateIndex.message })
      .max(ValidateIndex.maxLength, {
        message: `Must be ${ValidateIndex.maxLength} or fewer characters long`,
      })
      .optional(),
  }),
});

export type CollectionsCreateReq = z.infer<typeof CollectionsCreateSchema>;

export const CollectionsInfoSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type CollectionsInfoReq = z.infer<typeof CollectionsInfoSchema>;
