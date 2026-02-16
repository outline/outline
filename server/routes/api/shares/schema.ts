import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { Share } from "@server/models";
import { zodIdType } from "@server/utils/zod";
import { BaseSchema } from "../schema";

export const SharesInfoSchema = BaseSchema.extend({
  body: z
    .object({
      id: z.string().optional(),
      collectionId: zodIdType().optional(),
      documentId: zodIdType().optional(),
    })
    .refine(
      (body) =>
        !(
          isEmpty(body.id) &&
          isEmpty(body.collectionId) &&
          isEmpty(body.documentId)
        ),
      {
        error: "one of id, collectionId, or documentId is required",
      }
    ),
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
      .prefault("updatedAt"),
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),
  }),
});

export type SharesListReq = z.infer<typeof SharesListSchema>;

export const SharesUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
    includeChildDocuments: z.boolean().optional(),
    published: z.boolean().optional(),
    allowIndexing: z.boolean().optional(),
    showLastUpdated: z.boolean().optional(),
    showTOC: z.boolean().optional(),
    urlId: z
      .string()
      .regex(UrlHelper.SHARE_URL_SLUG_REGEX, {
        error: "must contain only alphanumeric and dashes",
      })
      .nullish(),
  }),
});

export type SharesUpdateReq = z.infer<typeof SharesUpdateSchema>;

export const SharesCreateSchema = BaseSchema.extend({
  body: z
    .object({
      collectionId: zodIdType().optional(),
      documentId: zodIdType().optional(),
      published: z.boolean().prefault(false),
      allowIndexing: z.boolean().optional(),
      showLastUpdated: z.boolean().optional(),
      showTOC: z.boolean().optional(),
      urlId: z
        .string()
        .regex(UrlHelper.SHARE_URL_SLUG_REGEX, {
          error: "must contain only alphanumeric and dashes",
        })
        .optional(),
      includeChildDocuments: z.boolean().prefault(false),
    })
    .refine((obj) => !(isEmpty(obj.collectionId) && isEmpty(obj.documentId)), {
      error: "one of collectionId or documentId is required",
    }),
});

export type SharesCreateReq = z.infer<typeof SharesCreateSchema>;

export const SharesRevokeSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});

export type SharesRevokeReq = z.infer<typeof SharesRevokeSchema>;

export const SharesSitemapSchema = BaseSchema.extend({
  query: z.object({
    id: z.string(),
  }),
});

export type SharesSitemapReq = z.infer<typeof SharesSitemapSchema>;
