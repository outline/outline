import { isURL } from "class-validator";
import { isEmpty } from "es-toolkit/compat";
import { z } from "zod";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { ShareValidation } from "@shared/validations";
import { Share } from "@server/models";
import { ValidateURL } from "@server/validation";
import { zodIdType } from "@server/utils/zod";
import { BaseSchema } from "../schema";
import { ShareTypes } from "@shared/types";

const ExpiresAtSchema = z.coerce
  .date()
  .refine((value) => value.getTime() > Date.now(), {
    error: "must be a future date",
  });

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
    published: z.boolean().nullish(),
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
    allowSubscriptions: z.boolean().optional(),
    showLastUpdated: z.boolean().optional(),
    showTOC: z.boolean().optional(),
    title: z.string().max(ShareValidation.maxTitleLength).nullish(),
    iconUrl: z
      .string()
      .max(ShareValidation.maxIconUrlLength)
      .refine(
        (val) => isURL(val, { require_host: false, require_protocol: false }),
        { error: ValidateURL.message }
      )
      .nullish(),
    expiresAt: ExpiresAtSchema.nullish(),
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
      type: z.enum(ShareTypes).default(ShareTypes.Web),
      collectionId: zodIdType().optional(),
      documentId: zodIdType().optional(),
      published: z.boolean().prefault(false),
      allowIndexing: z.boolean().optional(),
      allowSubscriptions: z.boolean().optional(),
      showLastUpdated: z.boolean().optional(),
      showTOC: z.boolean().optional(),
      title: z.string().max(ShareValidation.maxTitleLength).nullish(),
      urlId: z
        .string()
        .regex(UrlHelper.SHARE_URL_SLUG_REGEX, {
          error: "must contain only alphanumeric and dashes",
        })
        .optional(),
      includeChildDocuments: z.boolean().prefault(false),
      expiresAt: ExpiresAtSchema.nullish(),
    })
    .refine((obj) => !(isEmpty(obj.collectionId) && isEmpty(obj.documentId)), {
      error: "one of collectionId or documentId is required",
    })
    .refine(
      (obj) => !(!isEmpty(obj.collectionId) && !isEmpty(obj.documentId)),
      {
        error: "only one of collectionId or documentId may be provided",
      }
    ),
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

export const SharesSubscribeSchema = BaseSchema.extend({
  body: z.object({
    shareId: z.string(),
    documentId: z.uuid(),
    email: z.string().email(),
  }),
});

export type SharesSubscribeReq = z.infer<typeof SharesSubscribeSchema>;

export const SharesConfirmSubscriptionSchema = BaseSchema.extend({
  query: z.object({
    id: z.uuid(),
    token: z.string(),
    follow: z.string().optional(),
  }),
});

export type SharesConfirmSubscriptionReq = z.infer<
  typeof SharesConfirmSubscriptionSchema
>;

export const SharesUnsubscribeSchema = BaseSchema.extend({
  query: z.object({
    id: z.uuid(),
    token: z.string(),
    follow: z.string().optional(),
  }),
});

export type SharesUnsubscribeReq = z.infer<typeof SharesUnsubscribeSchema>;
