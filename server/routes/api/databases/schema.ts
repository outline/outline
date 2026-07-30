import { z } from "zod";
import type { FilterGroup } from "@shared/types";
import {
  DataViewType,
  FilterOperator,
  PropertyType,
  RollupAggregation,
  SummaryAggregation,
} from "@shared/types";
import { DatabaseValidation } from "@shared/validations";
import { zodIconType, zodIdType } from "@server/utils/zod";
import { ValidateColor } from "@server/validation";
import { BaseSchema } from "../schema";

const PropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const PropertySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(PropertyType),
  options: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
      })
    )
    .optional(),
  config: z
    .object({
      dateIncludesTime: z.boolean().optional(),
      targetDatabaseId: z.uuid().optional(),
      inversePropertyId: z.uuid().optional(),
      limitToViewId: z.uuid().optional(),
      allowMultiple: z.boolean().optional(),
      relationPropertyId: z.string().optional(),
      rollupPropertyId: z.string().optional(),
      rollupAggregation: z.enum(RollupAggregation).optional(),
    })
    .optional(),
});

export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    conjunction: z.union([z.literal("and"), z.literal("or")]),
    conditions: z.array(
      z.union([
        FilterGroupSchema,
        z.object({
          propertyId: z.string(),
          operator: z.enum(FilterOperator),
          value: PropertyValueSchema.optional(),
        }),
      ])
    ),
  })
);

export const PropertySortsSchema = z.array(
  z.object({
    propertyId: z.string(),
    direction: z.union([z.literal("asc"), z.literal("desc")]),
  })
);

export const DataViewSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(DataViewType),
  columns: z.array(
    z.object({
      propertyId: z.string(),
      width: z.number().optional(),
      visible: z.boolean(),
      summary: z.enum(SummaryAggregation).optional(),
    })
  ),
  sorts: PropertySortsSchema,
  filter: FilterGroupSchema.optional(),
  groupBy: z.string().optional(),
});

const BaseIdSchema = z.object({
  /** Id of the database */
  id: zodIdType(),
});

export const DatabasesInfoSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type DatabasesInfoReq = z.infer<typeof DatabasesInfoSchema>;

export const DatabasesListSchema = BaseSchema.extend({
  body: z.object({
    /** Restrict results to databases within this collection */
    collectionId: zodIdType().optional(),
  }),
});

export type DatabasesListReq = z.infer<typeof DatabasesListSchema>;

export const DatabasesCreateSchema = BaseSchema.extend({
  body: z.object({
    /** The collection the database belongs to */
    collectionId: zodIdType(),
    name: z.string().optional(),
    icon: zodIconType().optional(),
    color: z
      .string()
      .regex(ValidateColor.regex, { error: ValidateColor.message })
      .nullish(),
    /** The property definitions the database starts with */
    dataSchema: z.array(PropertySchema).optional(),
  }),
});

export type DatabasesCreateReq = z.infer<typeof DatabasesCreateSchema>;

export const DatabasesUpdateSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    name: z.string().optional(),
    icon: zodIconType().nullish(),
    color: z
      .string()
      .regex(ValidateColor.regex, { error: ValidateColor.message })
      .nullish(),
    /** Moves the database, and all of its rows, to another collection */
    collectionId: zodIdType().optional(),
    /** The typed property definitions describing the database's columns */
    dataSchema: z.array(PropertySchema).optional(),
    /** Saved views over the database's rows */
    views: z.array(DataViewSchema).optional(),
  }),
});

export type DatabasesUpdateReq = z.infer<typeof DatabasesUpdateSchema>;

export const DatabasesDeleteSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type DatabasesDeleteReq = z.infer<typeof DatabasesDeleteSchema>;

export const DatabasesMoveRowSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** The row to move, which must belong to the database */
    documentId: zodIdType(),
    /** The fractional index to move the row to */
    index: z
      .string()
      .min(1)
      .max(DatabaseValidation.maxIndexLength)
      // fractional indexes compare bytewise, so only printable ASCII sorts
      // predictably, and a trailing space is the one value that would break
      // calculating an index next to this one later on
      .regex(/^[\x20-\x7e]*[\x21-\x7e]$/, {
        error: "index must be printable ASCII and not end with a space",
      }),
  }),
});

export type DatabasesMoveRowReq = z.infer<typeof DatabasesMoveRowSchema>;
