import isEmpty from "lodash/isEmpty";
import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { Share } from "@server/models";
import { BaseSchema } from "../schema";

export const SharesInfoSchema = BaseSchema.extend({
  body: z
    .object({
      id: z.string().uuid().optional(),
      documentId: z
        .string()
        .optional()
        .refine(
          (val) =>
            val ? isUUID(val) || UrlHelper.SLUG_URL_REGEX.test(val) : true,
          {
            message: "must be uuid or url slug",
          }
        ),
    })
    .refine((body) => !(isEmpty(body.id) && isEmpty(body.documentId)), {
      message: "id or documentId is required",
    }),
});

export type SharesInfoReq = z.infer<typeof SharesInfoSchema>;

export const SharesListSchema = BaseSchema.extend({
  body: z.object({
    query: z.string().optional(),
    sort: z
      .string()
      .refine((val) => Object.keys(Share.getAttributes()).includes(val), {
        message: `must be one of ${Object.keys(Share.getAttributes()).join(
          ", "
        )}`,
      })
      .default("updatedAt"),
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),
  }),
});

export type SharesListReq = z.infer<typeof SharesListSchema>;

export const SharesUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    includeChildDocuments: z.boolean().optional(),
    published: z.boolean().optional(),
    allowIndexing: z.boolean().optional(),
    urlId: z
      .string()
      .regex(UrlHelper.SHARE_URL_SLUG_REGEX, {
        message: "must contain only alphanumeric and dashes",
      })
      .nullish(),
  }),
});

export type SharesUpdateReq = z.infer<typeof SharesUpdateSchema>;

export const SharesCreateSchema = BaseSchema.extend({
  body: z.object({
    documentId: z
      .string()
      .refine((val) => isUUID(val) || UrlHelper.SLUG_URL_REGEX.test(val), {
        message: "must be uuid or url slug",
      }),
    published: z.boolean().default(false),
    urlId: z
      .string()
      .regex(UrlHelper.SHARE_URL_SLUG_REGEX, {
        message: "must contain only alphanumeric and dashes",
      })
      .optional(),
    includeChildDocuments: z.boolean().default(false),
  }),
});

export type SharesCreateReq = z.infer<typeof SharesCreateSchema>;

export const SharesRevokeSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type SharesRevokeReq = z.infer<typeof SharesRevokeSchema>;
